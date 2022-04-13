import {Camera} from "./camera.js"
import {Controls} from "./controls.js"
import {Program} from "./program.js"
import {Geometry} from "./geometry.js"
import {NormalMaterial} from "./materials/normalMaterial.js"
import {PBRMaterial} from "./materials/pbrMaterial.js"
import {LambertMaterial} from "./materials/lambertMaterial.js"
import {UVMaterial} from "./materials/uvMaterial.js"
import {TextureMaterial} from "./materials/textureMaterial.js"
import {Environment} from "./environment.js"
import {loadTexture, createAndSetupCubemap} from "./texture.js"
import {Mesh} from "./mesh.js";
import {canvas, gl, enums, extMEM} from "./canvas.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {getSphericalHarmonicsMatrices} from "./iblUtils.js";
import {programRepository} from "./programRepository.js"
import {GLTF} from "./GLTF.js"

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.cssText="position: relative; bottom: 48px; left: 0; cursor: pointer; opacity: 1.0; z-index: 10000";
document.getElementById('cc_1').appendChild(stats.dom);

// TODO:
//      Pack uniforms to vec4
//      Camera navigation
//      Prefix hashes
//      View PBR maps/output
//      Physically based camera
//
//      Instancing
//      Pipeline state (program, sidedness)
//      Lights
//      Shadow mapping
//
//      Animations
//      Morph targets
//      Skinning
//      Sparse accessor
//      Camera from gltf
//      Specular/Gloss
//      Sheen
//      Transmission/volume/IOR
//
//      Import PBR materials (e.g. Substance)
//      Spherical Gaussian Irradiance
//      OIT
//      WebGL2
//      Volumetrics
//      STL import
//      OBJ import
//      Basic geometries (sphere, quad, cylinder, cone, torus, knot)
//      Particle class
//      Postprocessing (bloom, depth of field, fog)

let models = new Map();
models.set("Flight Helmet", "./gltf/flighthelmet/FlightHelmet.gltf");
models.set("Boombox", "./gltf/boombox/BoomBox.gltf");
models.set("Sponza", "./gltf/sponza/Sponza.gltf");
models.set("Damaged Helmet", "./gltf/helmet/DamagedHelmet.gltf");
models.set("Toy Car", "./gltf/toycar/ToyCar.gltf");
models.set("Fox", "./gltf/fox/Fox.gltf");
models.set("Venator Corridor", "./gltf/corridor/scene.gltf");
models.set("Jedi Fighter", "./gltf/jedifighter/scene.gltf");
models.set("PBR Spheres", "./gltf/spheres/MetalRoughSpheres.gltf");
models.set("Blend", "./gltf/blend/AlphaBlendModeTest.gltf");
models.set("Camera", "./gltf/camera/Camera_01_1k.gltf");
models.set("Minimal", "./gltf/minimal/scene.gltf");
models.set("Collada Duck", "./gltf/duck/duck.gltf");

let modelNames = Array.from(models.keys());
modelNames.sort();
modelNames.push("NONE");

let environments = new Map();
environments.set("Dikhololo Night", "./environmentMaps/dikhololo_night_1k.hdr");
environments.set("Venice Sunset", "./environmentMaps/venice_sunset_1k.hdr");
environments.set("Venice Sunrise", "./environmentMaps/venice_sunrise_1k.hdr");
environments.set("San Giuseppe Bridge", "./environmentMaps/san_giuseppe_bridge_1k.hdr");
environments.set("Spruit Sunrise", "./environmentMaps/spruit_sunrise_1k.hdr");
environments.set("Small Studio", "./environmentMaps/studio_small_03_1k.hdr");
environments.set("Cape Hill", "./environmentMaps/cape_hill_1k.hdr");
environments.set("Lilienstein", "./environmentMaps/1k.hdr");
environments.set("Uffizi Gallery", "./environmentMaps/uffizi_probe.hdr");
let environmentNames = Array.from(environments.keys());
environmentNames.sort();

let materialNames = ["PBR", "Normal", "UV", "Lambert"];
let materialSelector = {material: "PBR"};

let yaw = Math.PI / 3.0;
let pitch = Math.PI / 2.0;
let dist = 1.5;
let up = [0, 1, 0];

let fov = 45 * Math.PI / 180;
let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
let zNear = 0.1;
let zFar = 1000.0;

let camera = new Camera(pitch, yaw, dist, [0, 0, 0], up, fov, aspect, zNear, zFar);
let controls = new Controls(camera);

//Time
let time = 0.0;

let opaqueMeshes = [];
let transparentMeshes = [];

let info = {memory: "0", buffers: "0", textures: "0"};

let modelSelector = {model: "Flight Helmet"};
let environmentSelector = {environment: "Uffizi Gallery"};
let environment;
let gltf;
let modelManipulation = {scale: 1};

//************* GUI ***************

let gui = new lil.GUI({ autoPlace: false });
let customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(camera, 'exposure').min(0.0).max(2).step(0.01);
gui.add(environmentSelector, 'environment').options(environmentNames).onChange(name => {environment.setHDR(environments.get(name));});
gui.add(modelSelector, 'model').options(modelNames).onChange(name => {loadGLTF(name);});
const materialControls = gui.add(materialSelector, 'material').options(materialNames).onChange(name => {setMaterial(name);});
//gui.add(modelManipulation, 'scale').min(0.0).max(60).step(0.0001).listen().onChange(scale => {gltf.setScale(scale);});
;
gui.add(info, 'buffers').disable().listen();
gui.add(info, 'textures').disable().listen();
gui.add(info, 'memory').disable().listen();
//gui.close();

//************* GUI ***************

environment = new Environment({path: environments.get(environmentSelector.environment), type: "hdr", camera: camera});

loadGLTF(modelSelector.model);

function loadGLTF(model){
  materialControls.setValue("PBR");
  if(gltf != null){
    gltf.destroy();
    gltf = null;
  }
  opaqueMeshes = [];
  transparentMeshes = [];
  
  if(model == "NONE"){
    return;
  }

  let path = models.get(modelSelector.model);
  gltf = new GLTF(path, environment);  
  
  gltf.ready.then(p => {
    if(gltf != null){
      materialControls.setValue("PBR");
      modelManipulation.scale = gltf.scale;
      for(const mesh of gltf.meshes){
        if(mesh.material.alphaMode == enums.BLEND){
          transparentMeshes.push(mesh);
        }else{
          opaqueMeshes.push(mesh);
        }
      }
    }
  });
}

function setMaterial(name){
  let material;
  switch (name){
    case "PBR": material = null;
    break;
    case "Normal": material = new NormalMaterial();
    break;
    case "UV": material = new UVMaterial();
    break;
    case "Lambert": material = new LambertMaterial();
    break;
    default: material = null;
  }
  if(material != null){
    for(const mesh of opaqueMeshes){
      mesh.setOverrideMaterial(material);
      mesh.displayOverrideMaterial();
    }
    for(const mesh of transparentMeshes){
      mesh.setOverrideMaterial(material);
      mesh.displayOverrideMaterial();
    }
  }else{
    for(const mesh of opaqueMeshes){
      mesh.displayOriginalMaterial();
    }
    for(const mesh of transparentMeshes){
      mesh.displayOriginalMaterial();
    }
  }
}

let lastFrame = Date.now();
let thisFrame;

function setCameraMatrices(){
  camera.setProjectionMatrix(); 
  camera.setCameraMatrix(); 
  camera.setViewMatrix();
}

let frame = 0;

function draw(){
  
  stats.begin();

  frame++;

  if(frame % 30 == 0){
    info.memory = (extMEM.getMemoryInfo().memory.total * 1e-6).toPrecision(4) + " MB";
    info.buffers = extMEM.getMemoryInfo().resources.buffer;
    info.textures = extMEM.getMemoryInfo().resources.texture;
  }

  thisFrame = Date.now();

  let dT = (thisFrame - lastFrame)/1000;
  time += dT;
  lastFrame = thisFrame;

  controls.move(dT);

  setCameraMatrices(); 

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  if(environment.needsUpdate()){
    environment.generateIBLData();
  }

  environment.render(camera, time);

  gl.depthMask(true);

  // Render opaque
  for(let i = 0; i < opaqueMeshes.length; i++){
    if(opaqueMeshes[i] != null){
      opaqueMeshes[i].render(camera, time);  
    }
  }

  // Render transparent
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  
  for(let i = 0; i < transparentMeshes.length; i++){
    if(transparentMeshes[i] != null){
      transparentMeshes[i].render(camera, time);  
    }
  }

  gl.disable(gl.BLEND);

  stats.end();
  requestAnimationFrame(draw);
}

draw();
