// Loophole prototype v. 1.0

import {Geometry} from "./geometry.js"
import {Controls} from "./controls.js"
import {Mesh} from "./mesh.js";
import {canvas, gl, canvasMultiplier} from "./canvas.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {UVMaterial} from "./uvMaterial.js";
import {WaveMaterial} from "./waveMaterial.js";
import {CircleMaterial} from "./circleMaterial.js";

function createAndSetupTexture() {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  return texture;
}

var controls = new Controls();

var mousePos = {x: 0, y: 0};
var interact = false;

canvas.addEventListener('mouseup', interactEnd);
canvas.addEventListener('mousedown', interactStart);
canvas.addEventListener('mousemove', mouseTrack);

canvas.addEventListener("touchstart", touchMove);
canvas.addEventListener("touchmove", touchMove);
canvas.addEventListener("touchend", interactEnd);
canvas.addEventListener("touchcancel", interactEnd);

function interactStart() {
  interact = true;
}

function interactEnd() {
  interact = false;
}

function mouseTrack(event) {
  mousePos.x = event.offsetX;
  mousePos.y = event.offsetY;
}

function getPos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX - rect.left, 
    y: evt.touches[0].clientY - rect.top
  };
}

function touchMove(event) {
  event.preventDefault();
  animateStart();
  mousePos.x = getPos(canvas, event).x;
  mousePos.y = getPos(canvas, event).y;
}

//Time
var time = 0.0;

var lastFrame = Date.now();
var thisFrame;

let circleMaterial = new CircleMaterial();

let mesh = new Mesh(getScreenspaceQuad(), circleMaterial);

let waveSolverResolution = 512;
let waveSolverCount = 1;

let waveTexture0 = createAndSetupTexture();
let waveTexture1 = createAndSetupTexture();

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, waveTexture0);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, waveSolverResolution, waveSolverCount, 0, gl.RGBA, gl.FLOAT, null);

gl.bindTexture(gl.TEXTURE_2D, waveTexture1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, waveSolverResolution, waveSolverCount, 0, gl.RGBA, gl.FLOAT, null);

let waveMaterial = new WaveMaterial();
let waveMesh = new Mesh(getScreenspaceQuad(), waveMaterial);

let waveFrameBuffer = gl.createFramebuffer();

function waveSolver(t){
  let waveTexture = t > 0 ? waveTexture1 : waveTexture0;
  gl.bindFramebuffer(gl.FRAMEBUFFER, waveFrameBuffer);
  gl.viewport(0, 0, waveSolverResolution, waveSolverCount);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, waveTexture, 0);

  waveMaterial.setTexture(t > 0 ? waveTexture0 : waveTexture1);
  waveMaterial.setInteraction(interact ? 1 : 0);
  let width = canvas.width/canvasMultiplier;
  let height = canvas.height/canvasMultiplier;
  let angle = Math.atan2(2.0 * mousePos.x/width - 1.0, 2.0 * (1.0-mousePos.y/height) - 1.0) /  (2.0 * Math.PI);
  waveMaterial.setEventLocation(angle);
  circleMaterial.setTexture(t > 0 ? waveTexture1 : waveTexture0);
  //waveMaterial.setAspect(canvas.width/canvas.height);
  gl.disable(gl.BLEND);
  waveMesh.render(time);
}

gl.enable(gl.CULL_FACE);


function hexToRgb(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  let array = result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;

  return [array.r/255, array.g/255, array.b/255];
}

console.log(hexToRgb("#8F00FF"));
console.log(hexToRgb("#3242DE"));

var frame = 0;

function draw(){

  waveSolver(frame++ % 2);
	
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  circleMaterial.setAspect(canvas.width/canvas.height);

  circleMaterial.setRadius(0.15);
  circleMaterial.setOffset([0.115, 0.0]);
  circleMaterial.setData[0];
  mesh.render(time);

  circleMaterial.setRadius(0.145);
  circleMaterial.setOffset([-0.115, 0.0]);
  circleMaterial.setData[1];
  mesh.render(time);

  circleMaterial.setRadius(0.03);
  circleMaterial.setOffset([-0.0, 0.0]);
  circleMaterial.setData[1];
  mesh.render(time);

  gl.disable(gl.BLEND);

  //Update time
  thisFrame = Date.now();
  time += (thisFrame - lastFrame)/500;	
  lastFrame = thisFrame;

  requestAnimationFrame(draw);
}

draw();
