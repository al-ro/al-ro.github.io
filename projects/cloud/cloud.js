import * as Renderer from "./renderer/renderer.js"
import { CloudMaterial } from "./renderer/materials/cloudMaterial.js";
import { DensityMaterial } from "./renderer/materials/densityMaterial.js";
import { NoiseMaterial } from "./renderer/materials/noiseMaterial.js";

const gl = Renderer.gl;

// -------------------- Rendering Objects --------------------- //

let camera = new Renderer.Camera(
  1.8, 5.9, 1.5, [0, 0, 0], [0, 1, 0], 60 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0
);

let controls = new Renderer.Controls(camera);
controls.onWindowResize();

let sceneTexture = Renderer.createAndSetupTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
let sceneRenderTarget = new Renderer.RenderTarget(sceneTexture, null);

let sceneQuad = Renderer.getScreenspaceQuad();
let sceneMaterial = new Renderer.ScreenspaceMaterial(sceneTexture);
let sceneMesh = new Renderer.Mesh({ geometry: sceneQuad, material: sceneMaterial });
sceneMesh.cull = false;

let cloudMaterial = new CloudMaterial();
let cloudMesh = new Renderer.Mesh({ geometry: sceneQuad, material: cloudMaterial });
cloudMesh.cull = false;

// ------------------------- Textures ------------------------- //

let noiseTextureSize = 1;
let renderedNoiseTextureSize = noiseTextureSize;
let noiseTexture = Renderer.renderTo3DTexture(noiseTextureSize, NoiseMaterial);

let rabbitTexture = null;

// https://github.com/Calinou/free-blue-noise-textures
let blueNoiseTexture = Renderer.loadTexture({ url: "noiseTextures/blueNoise1024.png", type: gl.RGBA });
cloudMaterial.blueNoiseTexture = blueNoiseTexture;

// ------------------- Time and Diagnostics ------------------- //

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.cssText = "visibility: visible; position: absolute; bottom: 0px; left: 0; cursor: pointer; opacity: 0.8; z-index: 10000";
document.getElementById('canvas_overlay').appendChild(stats.dom);

let chrono = {
  time: 0.0,
  paused: false,
  lastFrame: Date.now(),
  thisFrame: Date.now(),
  frame: 0
};

let info = {
  memory: "0",
  buffers: "0",
  textures: "0",
  downloading: Renderer.getDownloadingCount(),
  primitives: "0",
  programCount: Renderer.programRepository.programs.size
};

function removeDeletedPrograms() {
  let removeKeys = [];
  Renderer.programRepository.programs.forEach((value, key) => { if (value.delete) { removeKeys.push(key); } });
  removeKeys.forEach((key) => { Renderer.programRepository.removeProgram(key); });
}

function updateMemoryStats() {
  info.memory = (Renderer.extMEM.getMemoryInfo().memory.total * 1e-6).toPrecision(4) + " MB";
  info.buffers = Renderer.extMEM.getMemoryInfo().resources.buffer;
  info.textures = Renderer.extMEM.getMemoryInfo().resources.texture;
  info.programCount = Renderer.programRepository.programs.size;
}
updateMemoryStats();

// Every 10 seconds, clean up all programs marked for deletion
setInterval(removeDeletedPrograms, 10000);
// Every 2 seconds, calculate memory stats
setInterval(updateMemoryStats, 2000);

// ---------------------- User Interface ---------------------- //

let gui = new lil.GUI({ autoPlace: false });
let customContainer = document.getElementById('canvas_overlay');
customContainer.appendChild(gui.domElement);
gui.domElement.style.cssText = "visibility: visible; position: absolute; top: 0px; right: 0; opacity: 0.8; z-index: 10000";

gui.add(controls, 'resolutionMultiplier', 0.1, 2.0, 0.1).name("Resolution multiplier").onChange(
  (v) => { controls.setMultiplier(v) }
).listen();

let clouds = new Map();
clouds.set("Stanford Rabbit", "");
clouds.set("Disney 1/16", "voxelData/sixteenth8bit.bin");
clouds.set("Disney 1/8", "voxelData/eighth8bit.bin");
clouds.set("Disney 1/4", "voxelData/quarter8bit.bin");
let cloudNames = Array.from(clouds.keys());
let cloudController = { cloud: "Disney 1/8" };

gui.add(cloudController, 'cloud').name("Cloud model").options(cloudNames).onChange((name) => { updateCloudData(name); });

const infoFolder = gui.addFolder('Info');
infoFolder.add(info, 'memory').name("Memory used").disable().listen();
/*
  infoFolder.add(info, 'buffers').name("Buffers").disable().listen();
  infoFolder.add(info, 'programCount').name("Program Count").disable().listen();
  infoFolder.add(info, 'textures').name("Textures").disable().listen();
*/
infoFolder.add(info, 'downloading').name("Data downloading").disable().listen();
infoFolder.close();

const cameraFolder = gui.addFolder('Camera');
let fov = { value: camera.fov * 180 / Math.PI };
cameraFolder.add(fov, 'value', 10, 180, 1).name("FOV").decimals(0).listen().onChange((value) => { camera.fov = value * Math.PI / 180; });
cameraFolder.add(camera, 'exposure', 0, 2, 0.01).name("Exposure");
cameraFolder.add(camera, 'distance').name("Camera distance").decimals(2).disable().listen();
cameraFolder.close();

let buttons = {
  updateMaterial: () => {
    Renderer.download("cloud.glsl", "text").then((shaderSource) => {
      cloudMaterial.program.markForDeletion();
      cloudMaterial.program = null;
      cloudMaterial.fragmentSource = shaderSource;
      cloudMesh.setMaterial(cloudMaterial);
    });
  },

  save: () => {
    draw();
    const link = document.createElement('a');
    link.download = 'download.png';
    link.href = gl.canvas.toDataURL();
    link.click();
    link.delete;
  },

  pause: () => {
    chrono.paused = !chrono.paused;
  }

};
buttons.updateMaterial();

gui.add(buttons, 'save').name("Save Image");
gui.add(chrono, 'time').name("Time").decimals(2).disable().listen();

const uniformFolder = gui.addFolder("Uniforms");

uniformFolder.add(cloudMaterial, 'renderBackground').name("Render background");

let sunUniforms = {
  elevation: 0.75,
  azimuth: 1.0
};

cloudMaterial.sunDirection = getSunDirection();

function getSunDirection() {
  let dir = [
    Math.cos(sunUniforms.azimuth) * Math.sin(sunUniforms.elevation),
    Math.cos(sunUniforms.elevation),
    Math.sin(sunUniforms.azimuth) * Math.sin(sunUniforms.elevation)
  ];

  return normalize(dir);
}

uniformFolder.add(cloudMaterial, 'dithering').name("Dithering");
uniformFolder.close();

const sunFolder = uniformFolder.addFolder("Sun");
sunFolder.add(sunUniforms, 'elevation', 0.0, Math.PI - 1e-4, 0.01).name("Elevation").onChange(
  () => { cloudMaterial.sunDirection = getSunDirection(); }
);
sunFolder.add(sunUniforms, 'azimuth', 0, 2.0 * Math.PI - 1e-4, 0.01).name("Azimuth").onChange(
  () => { cloudMaterial.sunDirection = getSunDirection(); }
);
sunFolder.add(cloudMaterial, 'sunStrength', 0, 200, 1).name("Strength");
sunFolder.addColor(cloudMaterial, 'sunColor').name("Color");
sunFolder.close();

const cloudFolder = uniformFolder.addFolder("Cloud");
cloudFolder.add(cloudMaterial, 'densityMultiplier', 0, 512, 0.5).name("Density");
cloudFolder.add(cloudMaterial, 'emissionStrength', 0, 1, 0.01).name("Emission strength");

const noiseFolder = cloudFolder.addFolder("Carving");
noiseFolder.add(cloudMaterial, 'detailStrength', 0, 1, 0.01).name("Strength");
noiseFolder.add(cloudMaterial, 'detailSize', 0, 3, 0.01).name("Size");
noiseFolder.hide();

function setSigmaT() {
  for (let i = 0; i < 3; i++) {
    cloudMaterial.sigmaT[i] = Math.max(1e-6, cloudMaterial.sigmaS[i] + cloudMaterial.sigmaA[i]);
  }
}
cloudFolder.addColor(cloudMaterial, 'sigmaS').name("&#963;<sub>S</sub>").onChange((v) => { cloudMaterial.sigmaS = v; setSigmaT(); });
cloudFolder.addColor(cloudMaterial, 'sigmaA').name("&#963;<sub>A</sub>").onChange((v) => { cloudMaterial.sigmaA = v; setSigmaT(); });
cloudFolder.close();

function updateCloudData(name) {

  switch (name) {
    case "Stanford Rabbit":
      noiseFolder.show();
      cloudMaterial.carve = true;
      noiseTextureSize = 256;
      if (renderedNoiseTextureSize != noiseTextureSize) {
        renderedNoiseTextureSize = noiseTextureSize;
        noiseTexture = Renderer.renderTo3DTexture(noiseTextureSize, NoiseMaterial);
        cloudMaterial.noiseTexture = noiseTexture;
      }
      if (rabbitTexture == null) {
        let rabbitTextureSize = 128;
        rabbitTexture = Renderer.renderTo3DTexture(rabbitTextureSize, DensityMaterial);
      }
      cloudMaterial.densityTexture = rabbitTexture;
      cloudMaterial.dataAspect = [1, 1, 1];
      cloudMaterial.aabbScale = [1, 1, 1];
      break;
    default:
      noiseFolder.hide();
      cloudMaterial.carve = false;
      cloudMaterial.densityTexture = Renderer.getVDBData(clouds.get(name));
      cloudMaterial.dataAspect = [1.25, 1.8181, 1.0];
      cloudMaterial.aabbScale = [0.8, 0.55, 1.0];
  }
}
updateCloudData(cloudController.cloud);

gui.close();

// ------------------------ Rendering ------------------------- //

gl.clearColor(0, 0, 0, 1);
gl.depthMask(false);
gl.depthFunc(gl.ALWAYS);

function render() {
  info.downloading = Renderer.getDownloadingCount();
  if (info.downloading != 0) {
    document.getElementById('loading_spinner').style.display = "inline-block";
  } else {
    document.getElementById('loading_spinner').style.display = "none";
  }

  chrono.thisFrame = Date.now();
  let dT = (chrono.thisFrame - chrono.lastFrame) / 1000;
  if (!chrono.paused) {
    chrono.time += dT;
    // Do not let frame get too large
    chrono.frame = ++chrono.frame % 1e5;
  }
  chrono.lastFrame = chrono.thisFrame;

  cloudMesh.material.time = chrono.time;
  cloudMesh.material.frame = chrono.frame;
  cloudMesh.material.resolution = [gl.canvas.width, gl.canvas.height];

  camera.update();

  stats.begin();
  draw();
  stats.end();

  requestAnimationFrame(render);
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  sceneRenderTarget.setSize(gl.canvas.width, gl.canvas.height);
  sceneRenderTarget.bind();

  Renderer.render(Renderer.RenderPass.TRANSMISSIVE, cloudMesh);

  // Output render target color texture to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  Renderer.render(Renderer.RenderPass.OPAQUE, sceneMesh);
}

render();
