import * as Renderer from "./renderer/renderer.js"
import { CurlMaterial } from "./renderer/materials/curlMaterial.js";
import { ParticleMaterial } from "./renderer/materials/particleMaterial.js";
import { NoiseMaterial } from "./renderer/materials/noiseMaterial.js";

const gl = Renderer.gl;


// ------------------------- Textures ------------------------- //

let noiseTextureSize = 256;
let noiseTexture = Renderer.renderTo3DTexture(noiseTextureSize, NoiseMaterial);

// -------------------- Rendering Objects --------------------- //

let camera = new Renderer.Camera(
  1.8, 2.9, 32.0, [0, 0, 0], [0, 1, 0], 60 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0
);

let controls = new Renderer.Controls(camera);
controls.onWindowResize();

// Main texture where the scene is rendered
let sceneTexture = Renderer.createAndSetupTexture();
let sceneDepthTexture = Renderer.createAndSetupTexture();
let width = 1;
let height = 1;
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
gl.bindTexture(gl.TEXTURE_2D, sceneDepthTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
let sceneRenderTarget = new Renderer.RenderTarget(sceneTexture, sceneDepthTexture);

// Render target for particle data
let dataTexture0 = Renderer.createAndSetupTexture();
let dataTexture1 = Renderer.createAndSetupTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, dataTexture0);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, dataTexture1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
let curlRenderTarget = new Renderer.RenderTarget(dataTexture0, null);
curlRenderTarget.internalFormat = gl.RGBA32F;
curlRenderTarget.format = gl.RGBA;
curlRenderTarget.type = gl.FLOAT;

// -------------------- Meshes --------------------- //

let sceneQuad = Renderer.getScreenspaceQuad();
let sceneMaterial = new Renderer.ScreenspaceMaterial(sceneTexture);
let sceneMesh = new Renderer.Mesh({ geometry: sceneQuad, material: sceneMaterial });
sceneMesh.cull = false;

let curlMaterial = new CurlMaterial(noiseTexture);
curlMaterial.setRenderTextures(dataTexture0, dataTexture1);
let curlMesh = new Renderer.Mesh({ geometry: sceneQuad, material: curlMaterial });
curlMesh.cull = false;

let particleMaterial = new ParticleMaterial(curlMaterial.thisFrameTexture);
let particleGeometry = Renderer.getSingleTriangle();
let particleMesh = new Renderer.Mesh({ geometry: particleGeometry, material: particleMaterial });
particleMesh.cull = false;
particleMesh.instanced = true;
particleMesh.instances = 250000;

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

// ---------------------- User Interface ---------------------- //

let gui = new lil.GUI({ autoPlace: false });
let customContainer = document.getElementById('canvas_overlay');
customContainer.appendChild(gui.domElement);
gui.domElement.style.cssText = "visibility: visible; position: absolute; top: 0px; right: 0; opacity: 0.8; z-index: 10000";

const cameraFolder = gui.addFolder('Camera');
let fov = { value: camera.fov * 180 / Math.PI };
cameraFolder.add(fov, 'value', 10, 180, 1).name("FOV").decimals(0).listen().onChange((value) => { camera.fov = value * Math.PI / 180; });
cameraFolder.close();

//gui.close();

let buttons = {
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

gui.add(chrono, 'time').name("Time").decimals(2).disable().listen();
gui.add(buttons, 'pause').name("Pause");
gui.add(buttons, 'save').name("Save Image");

const uniformFolder = gui.addFolder("Uniforms");

const curlFolder = uniformFolder.addFolder("Curl");
curlFolder.add(curlMaterial, 'lifetime', 1.0, 10.0, 0.1).name("Particle Lifetime");
curlFolder.add(curlMaterial, 'scale', 1, 512, 1).name("Noise Scale");
curlFolder.add(curlMaterial, 'speed', 0, 10, 0.05).name("Speed");
curlFolder.add(particleMesh, 'instances', 1000, 1024 * 1024, 1000).name("Draw Limit");

uniformFolder.close();

// ------------------------ Rendering ------------------------- //

function render() {

  chrono.thisFrame = Date.now();
  let deltaTime = (chrono.thisFrame - chrono.lastFrame) / 1000;
  if (!chrono.paused) {
    chrono.time += deltaTime;
    // Do not let frame get too large
    chrono.frame = ++chrono.frame % 1e5;
  } else {
    deltaTime = 0.0;
  }
  chrono.lastFrame = chrono.thisFrame;

  curlMesh.material.swapTextures();
  curlMesh.material.deltaTime = deltaTime;
  curlMesh.material.time = chrono.time;

  particleMaterial.lifetime = curlMaterial.lifetime;
  particleMaterial.particleDataTexture = curlMaterial.thisFrameTexture;

  camera.update();

  stats.begin();
  draw();
  stats.end();

  requestAnimationFrame(render);
}

function draw() {
  curlRenderTarget.setColorTexture(curlMesh.material.thisFrameTexture);
  curlRenderTarget.setSize(1024, 1024);
  curlRenderTarget.bind();
  gl.depthMask(false);
  gl.depthFunc(gl.ALWAYS);
  Renderer.render(Renderer.RenderPass.OPAQUE, curlMesh);

  sceneRenderTarget.setSize(gl.canvas.width, gl.canvas.height);
  sceneRenderTarget.bind();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearDepth(1.0);
  gl.clearColor(0.0975, 0.0975, 0.0975, 1);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  gl.depthMask(true);
  gl.depthFunc(gl.LEQUAL);
  Renderer.render(Renderer.RenderPass.OPAQUE, particleMesh);

  // Output render target color texture to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.depthMask(false);
  gl.depthFunc(gl.ALWAYS);
  //sceneMesh.material.texture = curlMesh.material.thisFrameTexture;
  Renderer.render(Renderer.RenderPass.OPAQUE, sceneMesh);
}

render();
