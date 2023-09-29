import { Camera } from "./camera.js"
import { Controls } from "./controls.js"
import { AmbientMaterial } from "./materials/ambientMaterial.js"
import { NormalMaterial } from "./materials/normalMaterial.js"
import { DepthMaterial } from "./materials/depthMaterial.js"
import { LambertMaterial } from "./materials/lambertMaterial.js"
import { UVMaterial } from "./materials/uvMaterial.js"
import { TextureMaterial } from "./materials/textureMaterial.js"
import { ScreenspaceMaterial } from "./materials/screenspaceMaterial.js"
import { Environment } from "./environment.js"
import { loadTexture, createAndSetupTexture } from "./texture.js"
import { Mesh } from "./mesh.js";
import { gl, extMEM } from "./canvas.js";
import { RenderPass } from "./enums.js"
import { getScreenspaceQuad } from "./screenspace.js";
import { GLTFLoader } from "./GLTFLoader.js"
import { RenderTarget } from "./renderTarget.js"
import { getDownloadingCount } from "./download.js"
import { outputEnum } from "./materials/pbrMaterial.js"
import { render } from "./renderCall.js"
import { Scene } from "./scene.js"
import { programRepository } from "./programRepository.js"

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.cssText = "visibility: visible; position: absolute; bottom: 0px; left: 0; cursor: pointer; opacity: 0.8; z-index: 10000";
document.getElementById('canvas_overlay').appendChild(stats.dom);

/*
  TODO:

      Depth material error
      Depth material per mesh
      Override and original material refactor
      All materials support morph

      Order material draw

      Scene format and scale for specific files?
        Multi-object scenes
        Object culling
        Camera pan
        Specify active animations in files
        Override scale and centering

      Morph target stress test and correct clamp
        Texture

      Floating point rendering
      Post-processing pass with tonemapping and gamma
      Debug flag from output

      Directional light

      Volume
      Iridescence
      Specular/Gloss
      Clearcoat

      Instancing
      Particle class for GPU

      Postprocessing (bloom, depth of field, SSAO)
      PBR camera

*/

let models = new Map();
models.set("Flight Helmet", "./gltf/flighthelmet/FlightHelmet.gltf");
models.set("Multiple UVs", "./gltf/multiUVTest/MultiUVTest.gltf");
models.set("Interpolation Test", "./gltf/interpolation/InterpolationTest.gltf");
models.set("Sparse Accessor", "./gltf/sparse/SimpleSparseAccessor.gltf");
models.set("Boombox", "./gltf/boombox/BoomBox.gltf");
models.set("Sponza", "./gltf/sponza/Sponza.gltf");
models.set("Damaged Helmet", "./gltf/helmet/DamagedHelmet.gltf");
models.set("Toy Car", "./gltf/toycar/ToyCar.gltf");
models.set("Fox", "./gltf/fox/Fox.gltf");
models.set("PBR Spheres", "./gltf/spheres/MetalRoughSpheres.gltf");
models.set("Transmission", "./gltf/transmission/TransmissionTest.gltf");
models.set("Transmission Roughness Test", "./gltf/transmissionRoughness/TransmissionRoughnessTest.gltf");
models.set("Blend", "./gltf/blend/AlphaBlendModeTest.gltf");
models.set("Camera", "./gltf/camera/Camera_01_1k.gltf");
models.set("Minimal", "./gltf/minimal/scene.gltf");
models.set("Collada Duck", "./gltf/duck/duck.gltf");
models.set("Buster Drone", "./gltf/buster_drone/scene.gltf");
models.set("Morph Animation", "./gltf/animatedMorphCube/AnimatedMorphCube.gltf");
models.set("Morph Primitives Test", "./gltf/morphPrimitivesTest/MorphPrimitivesTest.gltf");
models.set("Morph Stress Test", "./gltf/morphStressTest/MorphStressTest.gltf");
models.set("Morph Interpolation", "./gltf/morphInterpolation/fourCube.gltf");
models.set("Sheen Chair", "./gltf/chair/SheenChair.gltf");
models.set("Simple Skin", "./gltf/skin/SimpleSkin.gltf");
models.set("Dragon", "./gltf/dragon/dragon.gltf");
models.set("Brain Stem", "./gltf/brainStem/BrainStem.gltf");

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

let uvGridTexture = loadTexture({ url: "./defaultResources/uv_grid.jpg", type: gl.RGB });

let materialNames = ["PBR", "Normal", "Depth", "UV", "Texture", "Lambert", "Ambient"];
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

// For rendering the scene from above to test frustum culling of the main camera
// let overviewCamera = new Camera(1.0, Math.PI / 2.0, 1.5, [0, 0, 0], up, fov, aspect, zNear, zFar);

let time = 0.0;

let info = {
  memory: "0",
  buffers: "0",
  textures: "0",
  downloading: getDownloadingCount(),
  primitives: "0",
  programCount: programRepository.programs.size
};

let modelSelector = { model: "Morph Animation" };
let environmentController = { environment: "Venice Sunrise", renderBackground: true };
let outputSelector = { output: outputEnum.PBR };
let environment;
let gltfLoader;
let scene = new Scene();
let modelManipulation = {
  translationX: 0, translationY: 0, translationZ: 0, scale: 1, rotationX: 0, rotationY: 0, rotationZ: 0
};

//************* GUI ***************

let gui = new lil.GUI({ autoPlace: false });
let customContainer = document.getElementById('canvas_overlay');
customContainer.appendChild(gui.domElement);
gui.domElement.style.cssText = "visibility: visible; position: absolute; top: 0px; right: 0; opacity: 0.8; z-index: 10000";

gui.add(modelSelector, 'model').options(modelNames).onChange(name => { loadGLTF(name); });

const animationFolder = gui.addFolder('Animation');

const materialFolder = gui.addFolder('Material');
const materialControls = materialFolder.add(materialSelector, 'material').options(materialNames).onChange(name => { setMaterial(name); });
const outputControls = materialFolder.add(outputSelector, 'output').options(outputEnum).onChange(output => { setOutput(output) });

const environmentFolder = gui.addFolder('Environment');
environmentFolder.add(environmentController, 'environment').options(environmentNames).onChange(name => { environment.setHDR(environments.get(name)); });
environmentFolder.add(environmentController, 'renderBackground');

const transformFolder = gui.addFolder('Transform');
transformFolder.close();
const translationFolder = transformFolder.addFolder('Translation');
translationFolder.add(modelManipulation, 'translationX').min(-5).max(5).step(0.0001).listen().onChange(x => { setTranslation(modelManipulation); });
translationFolder.add(modelManipulation, 'translationY').min(-5).max(5).step(0.0001).listen().onChange(y => { setTranslation(modelManipulation); });
translationFolder.add(modelManipulation, 'translationZ').min(-5).max(5).step(0.0001).listen().onChange(z => { setTranslation(modelManipulation); });
translationFolder.close();

const rotationFolder = transformFolder.addFolder('Rotation');
rotationFolder.add(modelManipulation, 'rotationX').min(-Math.PI).max(Math.PI).step(0.0001).listen().onChange(x => { setRotation(modelManipulation); });
rotationFolder.add(modelManipulation, 'rotationY').min(-Math.PI).max(Math.PI).step(0.0001).listen().onChange(y => { setRotation(modelManipulation); });
rotationFolder.add(modelManipulation, 'rotationZ').min(-Math.PI).max(Math.PI).step(0.0001).listen().onChange(z => { setRotation(modelManipulation); });
rotationFolder.close();

const scaleFolder = transformFolder.addFolder('Scale');
scaleFolder.add(modelManipulation, 'scale').min(1e-4).max(10).step(0.0001).listen().onChange(scale => { setScale(scale); });
scaleFolder.close();

const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera, 'exposure').min(0.0).max(2).step(0.01);
cameraFolder.close();

const memoryFolder = gui.addFolder('Memory');
memoryFolder.add(info, 'buffers').disable().listen();
memoryFolder.add(info, 'textures').disable().listen();
memoryFolder.add(info, 'memory').disable().listen();
memoryFolder.close();

let repositoryUI = {
  printRepository: function () { console.log(programRepository.programs) },
  clearRepository: function () { programRepository.programs.clear() }
};

const statsFolder = gui.addFolder('Stats');
statsFolder.add(info, 'primitives').disable().listen();
statsFolder.add(info, 'programCount').disable().listen();
statsFolder.add(repositoryUI, 'printRepository');
statsFolder.add(repositoryUI, 'clearRepository');
statsFolder.close();

gui.add(info, 'downloading').disable().listen();
//gui.close();

controls.onWindowResize();

//************* GUI ***************

environment = new Environment({ path: environments.get(environmentController.environment), type: "hdr", camera: camera });

let animationElements = [];
let animationInterfaces = [];
const idleState = { state: true, name: "Idle" };
const playAllState = { state: false, name: "All" };

function setSceneIdle() {
  for (const animation of scene.getAnimations()) {
    animation.disable();
  }
  scene.setIdle();
  for (const animationInterface of animationInterfaces) {
    animationInterface.state = false;
  }
  playAllState.state = false;
}

function playAllAnimations() {
  for (const animation of scene.getAnimations()) {
    animation.enable(time);
  }
  for (const animationInterface of animationInterfaces) {
    animationInterface.state = true;
  }
  idleState.state = false;
}


loadGLTF(modelSelector.model);

function loadGLTF(model) {
  if (gltfLoader != null) {
    gltfLoader.abort();
  } else {
    gltfLoader = new GLTFLoader();
  }

  scene.clear();
  animationFolder.hide();
  for (let element of animationElements) {
    element.destroy();
  }
  animationElements = [];
  animationInterfaces = [];
  playAllState.state = false;
  idleState.state = true;

  if (model == "NONE") {
    return;
  }

  let path = models.get(modelSelector.model);
  gltfLoader.load(path, 0);

  gltfLoader.ready.then(p => {
    let object = gltfLoader.getObjects();
    centerAndScale(object);
    scene.add(object);
    if (scene.objects.length > 0) {
      materialControls.setValue("PBR");
    }
    let animations = scene.getAnimations();
    if (animations.length > 0) {
      animationElements.push(animationFolder.add(idleState, 'state').name("Idle").listen().onChange(e => { idleState.state = true; if (e) { setSceneIdle() }; }));
      if (animations.length > 1) {
        animationElements.push(animationFolder.add(playAllState, 'state').name("All").listen().onChange(e => { playAllState.state = true; if (e) { playAllAnimations() }; }));
      }
      for (const animation of animations) {
        let animationInterface = { state: animation.isActive(), name: animation.name, toggle: (e) => { animation.setActive(e, time) } };
        animationInterfaces.push(animationInterface);
        animationElements.push(animationFolder.add(animationInterface, 'state').name(animationInterface.name).listen().onChange(e => { animationInterface.toggle(e); idleState.state = false; playAllState.state = false; }));
      }
      animationFolder.show();
    }
    materialControls.setValue("PBR");
    outputControls.setValue(outputEnum.PBR);
    outputControls.show();
  });
}

function centerAndScale(object) {

  object.calculateAABB();

  let min = object.min;
  let max = object.max;

  let center = [
    min[0] + 0.5 * (max[0] - min[0]),
    min[1] + 0.5 * (max[1] - min[1]),
    min[2] + 0.5 * (max[2] - min[2])
  ];

  const largestExtent = Math.max(Math.max(max[0] - min[0], max[1] - min[1]), max[2] - min[2]);
  let scale = 1.0 / largestExtent;

  let T = [-center[0] * scale, -center[1] * scale, -center[2] * scale];
  let R = object.getRotation();
  let S = [scale, scale, scale];

  object.setTRS(T, R, S);
  object.idleMatrix = m4.compose(T, R, S);

  modelManipulation.translationX = T[0];
  modelManipulation.translationY = T[1];
  modelManipulation.translationZ = T[2];

  let rE = quaternionToEuler(R);
  modelManipulation.rotationX = rE[0];
  modelManipulation.rotationY = rE[1];
  modelManipulation.rotationZ = rE[2];

  modelManipulation.scale = scale;
}

function setMaterial(name) {
  let material;
  switch (name) {
    case "Ambient": material = new AmbientMaterial();
      break;
    case "PBR": material = null;
      break;
    case "Normal": material = new NormalMaterial();
      break;
    case "Depth": material = new DepthMaterial();
      break;
    case "UV": material = new UVMaterial();
      break;
    case "Lambert": material = new LambertMaterial();
      break;
    case "Texture": material = new TextureMaterial(uvGridTexture);
      break;
    default: material = null;
  }

  if (material != null) {
    outputControls.hide();
  } else {
    outputControls.show();
  }
  for (const object of scene.objects) {
    object.setMaterial(material);
  }
}

function setOutput(output) {
  for (const object of scene.objects) {
    object.setOutput(output);
  }
}

function setScale(scale) {
  scale = Math.max(1e-4, scale);
  for (const object of scene.objects) {
    object.setScale([scale, scale, scale]);
  }
}

function setTranslation(modelManipulation) {
  for (const object of scene.objects) {
    object.setTranslation([modelManipulation.translationX, modelManipulation.translationY, modelManipulation.translationZ]);
  }
}

function setRotation(modelManipulation) {
  for (const object of scene.objects) {
    object.setRotation(eulerToQuaternion(modelManipulation.rotationX, modelManipulation.rotationY, modelManipulation.rotationZ));
  }
}

let lastFrame = Date.now();
let thisFrame;

let frame = 0;

// Main texture where the scene is rendered
let sceneTexture = createAndSetupTexture();
let sceneDepthTexture = createAndSetupTexture();
let width = 1;
let height = 1;
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
gl.bindTexture(gl.TEXTURE_2D, sceneDepthTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
let sceneRenderTarget = new RenderTarget(sceneTexture, sceneDepthTexture);

let sceneQuad = getScreenspaceQuad();
let sceneMaterial = new ScreenspaceMaterial(sceneTexture);
let sceneMesh = new Mesh({ geometry: sceneQuad, material: sceneMaterial });
sceneMesh.setCulling(false);

// A texture of the opaque scene which is mipmapped and blurred for transmission background
let blurredSceneTexture = createAndSetupTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, blurredSceneTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.canvas.width, gl.canvas.height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

let blurredSceneRenderTarget = new RenderTarget(blurredSceneTexture);
let blurredSceneMaterial = new ScreenspaceMaterial(sceneTexture);
let blurredSceneMesh = new Mesh({ geometry: sceneQuad, material: blurredSceneMaterial });
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
    info.programCount = programRepository.programs.size;
  }

  info.primitives = scene.primitiveCount;

  thisFrame = Date.now();

  let dT = (thisFrame - lastFrame) / 1000;
  time += dT;
  lastFrame = thisFrame;

  // Animate all objects with defined animations in the scene
  scene.animate(time);

  let renderCamera = camera;

  renderCamera.update();

  sceneRenderTarget.setSize(gl.canvas.width, gl.canvas.height);
  sceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.depthFunc(gl.ALWAYS);

  if (environmentController.renderBackground) {
    // Render background from cubemap without writing to depth
    gl.depthMask(false);
    render(RenderPass.OPAQUE, environment.getMesh(), renderCamera, environment, camera);
    gl.depthMask(true);
  }

  // Render all opaque meshes with a simple shader to populate the depth texture
  // Do not write to color target
  gl.depthFunc(gl.LESS);
  gl.colorMask(false, false, false, false);
  scene.renderDepthPrepass(renderCamera);
  gl.colorMask(true, true, true, true);

  // Render opaque meshes corresponding the the depth values in the depth texture
  gl.depthFunc(gl.EQUAL);
  scene.render(RenderPass.OPAQUE, renderCamera, environment, camera);

  // Generate background texture for transmissive objects
  gl.depthFunc(gl.ALWAYS);
  blurredSceneRenderTarget.setSize(gl.canvas.width, gl.canvas.height);
  blurredSceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  render(RenderPass.OPAQUE, blurredSceneMesh);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, blurredSceneTexture);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  // Render transmissive objects onto the scene
  gl.depthFunc(gl.LEQUAL);
  sceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  scene.setBackgroundTexture(blurredSceneTexture);
  scene.render(RenderPass.TRANSMISSIVE, renderCamera, environment, camera);

  // Render transparent meshes using alpha blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  scene.render(RenderPass.TRANSPARENT, renderCamera, environment, camera);
  gl.disable(gl.BLEND);

  // Output render target color texture to screen
  gl.depthFunc(gl.ALWAYS);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  render(RenderPass.OPAQUE, sceneMesh, renderCamera, environment, camera);

  stats.end();
  requestAnimationFrame(draw);
}

draw();
