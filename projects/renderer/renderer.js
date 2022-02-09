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
import {canvas, gl, enums} from "./canvas.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {getSphericalHarmonicsMatrices} from "./iblUtils.js";
import {programRepository} from "./programRepository.js"
import {GLTF} from "./GLTF.js"

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

// TODO:
//      Switch geometry/environment maps
//      Check memory leaks and WebGL util
//      Pack uniforms to vec4
//      Camera navigation
//      Switch materials
//      Prefix hashes
//      View PBR maps/output
//      Better HDR
//      Animations
//      Morph targets
//      Skinning
//      Sparse accessor
//      Camera from gltf
//      Specular/Gloss
//      Sheen
//      Transmission/volume/IOR

//      Standardize instancing
//      Pipeline state (program, sidedness)
//      Particle class
//      OIT
//      WebGL2
//      Lights
//      Shadow mapping
//      Volumetrics
//      STL import
//      OBJ import
//      Basic geometries (sphere, quad, cylinder, cone, torus, knot)
//      Postprocessing (bloom, depth of field, fog)
//      Physically based camera

var path;

var model = "flighthelmet";

switch(model){
  case "boombox":
    path  = "./gltf/boombox/BoomBox.gltf";
    break;
  case "sponza":
    path  = "./gltf/sponza/Sponza.gltf";
    break;
  case "damagedhelmet":
    path  = "./gltf/helmet/DamagedHelmet.gltf";
    break;
  case "flighthelmet":
    path  = "./gltf/flighthelmet/FlightHelmet.gltf";
    break;
  case "car":
    path  = "./gltf/toycar/ToyCar.gltf";
    break;
  case "fox":
    path  = "./gltf/fox/Fox.gltf";
    break;
  case "corridor":
    path  = "./gltf/corridor/scene.gltf";
    break;
  case "jedifighter":
    path  = "./gltf/jedifighter/scene.gltf";
    break;
  case "spheres":
    path  = "./gltf/spheres/MetalRoughSpheres.gltf";
    break;
  case "blend":
    path  = "./gltf/blend/AlphaBlendModeTest.gltf";
    break;
  case "camera":
    path  = "./gltf/camera/Camera_01_1k.gltf";
    break; 
  case "minimal":
    path  = "./gltf/minimal/scene.gltf";
    break;
  default:
    path = "./gltf/duck/Duck.gltf";
}
var workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);

var yaw = Math.PI/4.0;
var pitch = 0.0;
var dist = 1.5;
var up = [0, 1, 0];

var fov = 45 * Math.PI / 180;
var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
var zNear = 0.1;
var zFar = 1000.0;

var camera = new Camera(pitch, yaw, dist, [0, 0, 0], up, fov, aspect, zNear, zFar);
var controls = new Controls(camera);

//Time
var time = 0.0;

//************* GUI ***************
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(camera, 'exposure').min(0.0).max(2).step(0.01);
gui.close();

var gltfNormals;
var gltfVertices;
var gltfIndices; 
var gltfUVs; 
var gltfTangents; 
var gltfCount; 
var gltfMaterialID;

var readyToRender = false;

var geometries = [];
var opaqueMeshes = [];
var transparentMeshes = [];

var images = [];
var materials = [];
var textures = [];

var minExtent = [10000, 10000, 10000];
var maxExtent = [-10000, -10000, -10000];

//let cubeMap = createAndSetupCubemap();
//let environmentMaterial = new EnvironmentMaterial(cubeMap);
//let environmentMesh = new Mesh(getScreenspaceQuad(), environmentMaterial);  

///var environmentPath = './environmentMaps/dikhololo_night_1k.hdr';
//var environmentPath = './environmentMaps/venice_sunset_1k.hdr';
//var environmentPath = './environmentMaps/venice_sunrise_1k.hdr';
var environmentPath = './environmentMaps/san_giuseppe_bridge_1k.hdr';
//var environmentPath = './environmentMaps/spruit_sunrise_1k.hdr';
//var environmentPath = './environmentMaps/studio_small_03_1k.hdr';
//var environmentPath = './environmentMaps/cape_hill_1k.hdr';
//var environmentPath = './environmentMaps/1k.hdr';

//let environment = new Environment({path: "./defaultResources/uv_grid.jpg", type: "cubemap"});
let environment = new Environment({path: environmentPath, type: "hdr", camera: camera});

let _gltf = new GLTF(path, environment);

var lastFrame = Date.now();
var thisFrame;

function setCameraMatrices(){
  camera.setProjectionMatrix(); 
  camera.setCameraMatrix(); 
  camera.setViewMatrix();
}
console.log(programRepository);
function draw(){

  stats.begin();
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

  opaqueMeshes = [];
  transparentMeshes = [];

  if(_gltf != null){
    for(const mesh of _gltf.meshes){
      if(mesh.material.alphaMode == enums.BLEND){
        transparentMeshes.push(mesh);
      }else{
        opaqueMeshes.push(mesh);
      }
    }
  }

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
