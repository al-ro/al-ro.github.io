import { Camera } from "./camera.js"
import { Controls } from "./controls.js"
import { AmbientMaterial } from "./materials/ambientMaterial.js"
import { NormalMaterial } from "./materials/normalMaterial.js"
import { LambertMaterial } from "./materials/lambertMaterial.js"
import { UVMaterial } from "./materials/uvMaterial.js"
import { TextureMaterial } from "./materials/textureMaterial.js"
import { ScreenspaceMaterial } from "./materials/screenspaceMaterial.js"
import { Environment } from "./environment.js"
import { loadTexture, createAndSetupTexture } from "./texture.js"
import { Mesh } from "./mesh.js";
import { gl, extMEM, RenderPass } from "./canvas.js";
import { getScreenspaceQuad } from "./screenspace.js";
import { GLTFLoader } from "./GLTFLoader.js"
import { RenderTarget } from "./target.js"
import { getDownloadingCount } from "./download.js"
import { outputEnum } from "./materials/pbrMaterial.js"
import { render } from "./renderCall.js"
import { Scene } from "./scene.js"

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.cssText = "visibility: visible; position: absolute; bottom: 0px; left: 0; cursor: pointer; opacity: 1.0; z-index: 10000";
document.getElementById('canvas_overlay').appendChild(stats.dom);

/*
  TODO:

      Pipeline state (program, sidedness)
      Render programs together

      Object manipulation sliders
      Scene format and scale for specific files?
        Multi object scenes
        Object culling
        Camera pan

      Sheen
      Volume
      IOR
      Iridescence
      Better roughness blur

      Morph targets
      Skinning
      Specular/Gloss
      Clearcoat

      Instancing
      Particle class for GPU
      Postprocessing (bloom, depth of field, SSAO)

      Lights
      Shadows

      Materials:
        Water
        Lava
        Clouds

      Deferred rendering
*/

let models = new Map();
models.set("Flight Helmet", "./gltf/flighthelmet/FlightHelmet.gltf");
models.set("Interpolation Test", "./gltf/interpolation/InterpolationTest.gltf");
models.set("Sparse Accessor", "./gltf/sparse/SimpleSparseAccessor.gltf");
models.set("Boombox", "./gltf/boombox/BoomBox.gltf");
models.set("Sponza", "./gltf/sponza/Sponza.gltf");
models.set("Damaged Helmet", "./gltf/helmet/DamagedHelmet.gltf");
models.set("Toy Car", "./gltf/toycar/ToyCar.gltf");
models.set("Fox", "./gltf/fox/Fox.gltf");
models.set("Venator Corridor", "./gltf/corridor/scene.gltf");
models.set("Jedi Fighter", "./gltf/jedifighter/scene.gltf");
models.set("PBR Spheres", "./gltf/spheres/MetalRoughSpheres.gltf");
models.set("Transmission", "./gltf/transmission/TransmissionTest.gltf");
models.set("Transmission Roughness Test", "./gltf/transmissionRoughness/TransmissionRoughnessTest.gltf");
models.set("Blend", "./gltf/blend/AlphaBlendModeTest.gltf");
models.set("Camera", "./gltf/camera/Camera_01_1k.gltf");
models.set("Minimal", "./gltf/minimal/scene.gltf");
models.set("Collada Duck", "./gltf/duck/duck.gltf");
models.set("Buster Drone", "./gltf/buster_drone/scene.gltf");
models.set("Gyroscope", "./gltf/magical_gyroscope/scene.gltf");

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
environments.set("Lilienstein", "./environmentMaps/lilienstein_1k.hdr");
environments.set("Uffizi Gallery", "./environmentMaps/uffizi_probe.hdr");
let environmentNames = Array.from(environments.keys());
environmentNames.sort();

let texture_0 = loadTexture("./defaultResources/uv_grid.jpg");

let materialNames = ["PBR", "Normal", "UV", "Texture", "Lambert", "Ambient"];
materialNames.sort();
let materialSelector = { material: "PBR" };

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

let overviewCamera = new Camera(1.0, Math.PI / 2.0, 1.5, [0, 0, 0], up, fov, aspect, zNear, zFar);

let time = 0.0;

let info = { memory: "0", buffers: "0", textures: "0", downloading: getDownloadingCount(), primitives: "0" };

let modelSelector = { model: "Flight Helmet" };
let environmentSelector = { environment: "Venice Sunrise" };
let outputSelector = { output: outputEnum.PBR };
let environment;
let gltfLoader;
let scene = new Scene();
let modelManipulation = {
  translationX: 0, translationY: 0, translationZ: 0,
  scaleX: 1, scaleY: 1, scaleZ: 1,
  rotationX: 0, rotationY: 0, rotationZ: 0
};

//************* GUI ***************

let gui = new lil.GUI({ autoPlace: false });
let customContainer = document.getElementById('canvas_overlay');
customContainer.appendChild(gui.domElement);
gui.domElement.style.cssText = "visibility: visible; position: absolute; top: 0px; right: 0;";

gui.add(modelSelector, 'model').options(modelNames).onChange(name => { loadGLTF(name); });

const materialFolder = gui.addFolder('Material');
const materialControls = materialFolder.add(materialSelector, 'material').options(materialNames).onChange(name => { setMaterial(name); });
const outputControls = materialFolder.add(outputSelector, 'output').options(outputEnum).onChange(output => { setOutput(output) });

const environmentFolder = gui.addFolder('Environment');
environmentFolder.add(environmentSelector, 'environment').options(environmentNames).onChange(name => { environment.setHDR(environments.get(name)); });

const transformFolder = gui.addFolder('Transform');
transformFolder.close();
const translationFolder = transformFolder.addFolder('Translation');
translationFolder.add(modelManipulation, 'translationX').min(-20).max(20).step(0.0001).listen().onChange(scale => { setScale(scale); });
translationFolder.add(modelManipulation, 'translationY').min(-20).max(20).step(0.0001).listen().onChange(scale => { setScale(scale); });
translationFolder.add(modelManipulation, 'translationZ').min(-20).max(20).step(0.0001).listen().onChange(scale => { setScale(scale); });
translationFolder.close();

const rotationFolder = transformFolder.addFolder('Rotation');
rotationFolder.add(modelManipulation, 'rotationX').min(-3.1415).max(3.1415).step(0.0001).listen().onChange(scale => { setScale(scale); });
rotationFolder.add(modelManipulation, 'rotationY').min(-3.1415).max(3.1415).step(0.0001).listen().onChange(scale => { setScale(scale); });
rotationFolder.add(modelManipulation, 'rotationZ').min(-3.1415).max(3.1415).step(0.0001).listen().onChange(scale => { setScale(scale); });
rotationFolder.close();

const scaleFolder = transformFolder.addFolder('Scale');
scaleFolder.add(modelManipulation, 'scaleX').min(1e-4).max(20).step(0.0001).listen().onChange(scale => { setScale(scale); });
scaleFolder.add(modelManipulation, 'scaleX').min(1e-4).max(20).step(0.0001).listen().onChange(scale => { setScale(scale); });
scaleFolder.add(modelManipulation, 'scaleX').min(1e-4).max(20).step(0.0001).listen().onChange(scale => { setScale(scale); });
scaleFolder.close();

const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera, 'exposure').min(0.0).max(2).step(0.01);
cameraFolder.close();

const memoryFolder = gui.addFolder('Memory');
memoryFolder.add(info, 'buffers').disable().listen();
memoryFolder.add(info, 'textures').disable().listen();
memoryFolder.add(info, 'memory').disable().listen();
memoryFolder.close();

const cullingFolder = gui.addFolder('Culling');
cullingFolder.add(info, 'primitives').name("primitive count").disable().listen();
cullingFolder.add(info, 'primitives').name("drawn primitives").disable().listen();
cullingFolder.close();

gui.add(info, 'downloading').disable().listen();
//gui.close();

controls.onWindowResize();

//************* GUI ***************

environment = new Environment({ path: environments.get(environmentSelector.environment), type: "hdr", camera: camera });

loadGLTF(modelSelector.model);

function loadGLTF(model) {
  if (gltfLoader != null) {
    gltfLoader.abort();
  } else {
    gltfLoader = new GLTFLoader();
  }

  scene.clear();

  if (model == "NONE") {
    return;
  }

  let path = models.get(modelSelector.model);
  gltfLoader.load(path, environment, 0);

  gltfLoader.ready.then(p => {
    let object = gltfLoader.getObjects();
    centreAndScale(object);
    scene.add(object);
    if (scene.getObjects().length > 0) {
      materialControls.setValue("PBR");
      modelManipulation.scale = scene.getObjects()[0].getScale();
    }
    materialControls.setValue("PBR");
    outputControls.setValue("PBR");
    outputControls.show();
  });
}

function centreAndScale(object) {

  object.calculateAABB();

  let min = object.getMin();
  let max = object.getMax();

  let center = [
    min[0] + 0.5 * (max[0] - min[0]),
    min[1] + 0.5 * (max[1] - min[1]),
    min[2] + 0.5 * (max[2] - min[2])
  ];

  const largestExtent = Math.max(Math.max(max[0] - min[0], max[1] - min[1]), max[2] - min[2]);
  let scale = 1.0 / largestExtent;

  let T = [-center[0] * scale, -center[1] * scale, -center[2] * scale];
  let R = [0, 0, 0, 1];
  let S = [scale, scale, scale];

  object.setTRS(T, R, S);
}

function setMaterial(name) {
  let material;
  switch (name) {
    case "Ambient": material = new AmbientMaterial(environment);
      break;
    case "PBR": material = null;
      break;
    case "Normal": material = new NormalMaterial();
      break;
    case "UV": material = new UVMaterial();
      break;
    case "Lambert": material = new LambertMaterial();
      break;
    case "Texture": material = new TextureMaterial(texture_0);
      break;
    default: material = null;
  }

  if (material != null) {
    outputControls.hide();
  } else {
    outputControls.show();
  }
  for (const object of scene.getObjects()) {
    object.setMaterial(material);
  }
}

function setOutput(output) {
  for (const object of scene.getObjects()) {
    object.setOutput(output);
  }
}

function setScale(scale) {
  scale = Math.max(1e-4, scale);
  for (const object of scene.getObjects()) {
    object.setScale([scale, scale, scale]);
  }
}

let lastFrame = Date.now();
let thisFrame;

function setCameraMatrices(c) {
  c.setProjectionMatrix();
  c.setCameraMatrix();
  c.setViewMatrix();
  c.calculateFrustumPlanes();
}

let frame = 0;

// Main texture where the scene is rendered
let sceneTexture = createAndSetupTexture();
let sceneDepthTexture = createAndSetupTexture();
let width = 1;
let height = 1;
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.bindTexture(gl.TEXTURE_2D, sceneDepthTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
let sceneRenderTarget = new RenderTarget(sceneTexture, sceneDepthTexture);

let sceneQuad = getScreenspaceQuad();
let sceneMaterial = new ScreenspaceMaterial(sceneTexture);
let sceneMesh = new Mesh(sceneQuad, sceneMaterial);
sceneMesh.setCulling(false);

// A texture of the opaque scene which is mipmapped and blurred for transmission background
let blurredSceneTexture = createAndSetupTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, blurredSceneTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

let blurredSceneRenderTarget = new RenderTarget(blurredSceneTexture);
let blurredSceneMaterial = new ScreenspaceMaterial(sceneTexture);
let blurredSceneMesh = new Mesh(sceneQuad, blurredSceneMaterial);
blurredSceneMesh.setCulling(false);

function draw() {

  stats.begin();

  info.downloading = getDownloadingCount();
  if (info.downloading != 0) {
    document.getElementById('loading_spinner').style.display = "inline-block";
  } else {
    document.getElementById('loading_spinner').style.display = "none";
  }

  frame++;

  if (frame % 30 == 0) {
    info.memory = (extMEM.getMemoryInfo().memory.total * 1e-6).toPrecision(4) + " MB";
    info.buffers = extMEM.getMemoryInfo().resources.buffer;
    info.textures = extMEM.getMemoryInfo().resources.texture;
  }

  info.primitives = scene.getPrimitiveCount();

  thisFrame = Date.now();

  let dT = (thisFrame - lastFrame) / 1000;
  time += dT;
  lastFrame = thisFrame;

  // Animate all objects with defined animations in the scene
  scene.animate(time);
  controls.move(dT);

  if (environment.needsUpdate()) {
    environment.generateIBLData();
  }

  let renderCamera = camera;

  setCameraMatrices(renderCamera);

  sceneRenderTarget.setSize(gl.canvas.width, gl.canvas.height);
  sceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  // Render background from cubemap
  gl.depthMask(false);
  render(RenderPass.OPAQUE, environment.getMesh(), renderCamera, time);
  gl.depthMask(true);

  // Render opaque meshes
  scene.render(RenderPass.OPAQUE, renderCamera, time, camera);

  // Generate background texture for transmissive objects
  blurredSceneRenderTarget.setSize(gl.canvas.width, gl.canvas.height);
  blurredSceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  render(RenderPass.OPAQUE, blurredSceneMesh);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, blurredSceneTexture);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  // Render transmissive objects onto the scene
  sceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  scene.setBackgroundTexture(blurredSceneTexture);
  scene.render(RenderPass.TRANSMISSIVE, renderCamera, time, camera);

  // Render transparent meshes using alpha blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  scene.render(RenderPass.TRANSPARENT, renderCamera, time, camera);
  gl.disable(gl.BLEND);

  // Output render target color texture to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  render(RenderPass.OPAQUE, sceneMesh, renderCamera, time, camera);

  stats.end();
  requestAnimationFrame(draw);
}

draw();
