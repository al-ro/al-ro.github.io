// Loophole prototype v. 1.0

import {Geometry} from "./geometry.js"
import {Controls} from "./controls.js"
import {Mesh} from "./mesh.js";
import {canvas, gl, canvasMultiplier} from "./canvas.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {UVMaterial} from "./uvMaterial.js";
import {WaveMaterial} from "./waveMaterial.js";
import {CircleMaterial} from "./circleMaterial.js";
import {StarsMaterial} from "./starsMaterial.js";

var leftCircle = {
  radius: 0.15,
  x: 0.115,
  y: 0.0,
};

var rightCircle = {
  radius: 0.145,
  x: -0.115,
  y: 0.0,
};

var middleCircle = {
  radius: 0.03,
  x: 0.0,
  y: 0.0,
  speed: 1.5,
  animate: false,
  affectGlow: false
};

var waves = {
  enabled: true,
  strength: -0.015,
  radius: 0.15,
  wobble: 0.9
}

var glow = {
  enabled: true,
  radius: 0.5,
  fade: 1.5
}

//************* GUI ***************

var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);

var leftFolder = gui.addFolder("Left");
leftFolder.add(leftCircle, 'radius').min(0.0).max(1).step(0.01);
leftFolder.add(leftCircle, 'x').min(-1.0).max(1).step(0.01);
leftFolder.add(leftCircle, 'y').min(-1.0).max(1).step(0.01);

var rightFolder = gui.addFolder("Right");
rightFolder.add(rightCircle, 'radius').min(0.0).max(1).step(0.01);
rightFolder.add(rightCircle, 'x').min(-1.0).max(1).step(0.01);
rightFolder.add(rightCircle, 'y').min(-1.0).max(1).step(0.01);

var middleFolder = gui.addFolder("Middle");
middleFolder.add(middleCircle, 'radius').min(0.0).max(1).step(0.01);
middleFolder.add(middleCircle, 'x').min(-1.0).max(1).step(0.01);
middleFolder.add(middleCircle, 'y').min(-1.0).max(1).step(0.01);
middleFolder.add(middleCircle, 'animate');
middleFolder.add(middleCircle, 'affectGlow');
middleFolder.add(middleCircle, 'speed').min(-4.0).max(4).step(0.01);

var wavesFolder = gui.addFolder("Waves");
wavesFolder.add(waves, 'enabled');
wavesFolder.add(waves, 'strength').min(-0.1).max(0.1).step(0.0001);
wavesFolder.add(waves, 'radius').min(0.01).max(1.0).step(0.0001);
wavesFolder.add(waves, 'wobble').min(0.8).max(0.999).step(0.0001);

var glowFolder = gui.addFolder("Glow");
glowFolder.add(glow, 'enabled');
glowFolder.add(glow, 'radius').min(0.0).max(2.0).step(0.0001);
glowFolder.add(glow, 'fade').min(0.0).max(4.0).step(0.0001);

//************* GUI ***************

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
var interact = true;

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
  //interact = false;
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

let starsMaterial = new StarsMaterial();

let starsMesh = new Mesh(getScreenspaceQuad(), starsMaterial);

let waveSolverResolution = 512;
let waveSolverCount = 1;

let waveTexture0 = createAndSetupTexture();
let waveTexture1 = createAndSetupTexture();
let waveTexture_null = createAndSetupTexture();

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, waveTexture0);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, waveSolverResolution, waveSolverCount, 0, gl.RGBA, gl.FLOAT, null);

gl.bindTexture(gl.TEXTURE_2D, waveTexture1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, waveSolverResolution, waveSolverCount, 0, gl.RGBA, gl.FLOAT, null);

gl.bindTexture(gl.TEXTURE_2D, waveTexture_null);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null);

let waveMaterial = new WaveMaterial();
let waveMesh = new Mesh(getScreenspaceQuad(), waveMaterial);

let waveFrameBuffer = gl.createFramebuffer();

function getMousePosition(){
  let width = canvas.width/canvasMultiplier;
  let height = canvas.height/canvasMultiplier;

  let x = (mousePos.x)/width;
  let y = 1.0-(mousePos.y/height);

  return [x, y];
}

function getEventLocation(centre){
  let width = canvas.width/canvasMultiplier;
  let height = canvas.height/canvasMultiplier;

  let x = (2.0 * (mousePos.x/width + centre[0]) - 1.0);
  let y = (2.0 * (1.0-mousePos.y/height + centre[1]) - 1.0);

  if(!interact){
    let lemniscate = setLemniscate();
    x = -lemniscate[0] + centre[0];
    y = -lemniscate[1] + centre[1];
  }

  let angle = Math.atan2(x, y) / (2.0 * Math.PI);

  return angle;

}

function getStrength(centre, radius){
  let width = canvas.width/canvasMultiplier;
  let height = canvas.height/canvasMultiplier;

  let x = (2.0 * (mousePos.x/width + centre[0]) - 1.0);
  let aspect = canvas.width/canvas.height;
  let y = (2.0 * (1.0-(mousePos.y/height + centre[1])) - 1.0)/(aspect);
  
  let strength = Math.hypot(x, y) - 2.0 * radius;

  return 0.005 * strength;

}

function waveSolver(t){
  let waveTexture = t > 0 ? waveTexture1 : waveTexture0;
  gl.bindFramebuffer(gl.FRAMEBUFFER, waveFrameBuffer);
  gl.viewport(0, 0, waveSolverResolution, waveSolverCount);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, waveTexture, 0);

  waveMaterial.setTexture(t > 0 ? waveTexture0 : waveTexture1);
  waveMaterial.setInteraction(interact ? 1 : 0);
  if(middleCircle.animate){
    waveMaterial.setInteraction(middleCircle.affectGlow || interact);
  }

  waveMaterial.setEventLocation([getEventLocation([leftCircle.x, leftCircle.y]), getEventLocation([rightCircle.x, rightCircle.y])]);
  waveMaterial.setStrength([waves.strength, waves.strength]);
  waveMaterial.setRadius(waves.radius);
  waveMaterial.setWobble(waves.wobble);
  circleMaterial.setTexture(t > 0 ? waveTexture1 : waveTexture0);

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

//console.log(hexToRgb("#8F00FF"));
//console.log(hexToRgb("#3242DE"));

var frame = 0;

function setLemniscate(){
  let width = 0.22;
  let height = 0.3
  let t = time * middleCircle.speed;
  let x = (width * Math.cos(t)) / (1.0 + Math.sin(t) * Math.sin(t));
  let y = (height * Math.sin(t) * Math.cos(t)) / (1.0 + Math.sin(t) * Math.sin(t));
  return [x, y];
}

function draw(){

  waveSolver(frame++ % 2);
	
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  circleMaterial.setMousePos(getMousePosition());
  //console.log(getMousePosition());

  circleMaterial.setAspect(canvas.width/canvas.height);

  circleMaterial.deformationEnabled = waves.enabled;
  circleMaterial.glowEnabled = glow.enabled;
  circleMaterial.glowRadius = glow.radius;
  circleMaterial.glowFade = glow.fade;

  circleMaterial.setRadius(leftCircle.radius);
  circleMaterial.setOffset([leftCircle.x, leftCircle.y]);
  circleMaterial.setData(0);
  mesh.render(time);

  circleMaterial.setRadius(rightCircle.radius);
  circleMaterial.setOffset([rightCircle.x, rightCircle.y]);
  circleMaterial.setData(1);
  mesh.render(time);

  circleMaterial.setRadius(middleCircle.radius);
  if(middleCircle.animate){
    circleMaterial.setOffset(setLemniscate());
  }else{
    circleMaterial.setOffset([middleCircle.x, middleCircle.y]); 
  }
  circleMaterial.setData(1);
  circleMaterial.setTexture(waveTexture_null);
  mesh.render(time);


  starsMaterial.setAspect(canvas.width/canvas.height);
  starsMesh.render(time);
  gl.disable(gl.BLEND);

  //Update time
  thisFrame = Date.now();
  time += (thisFrame - lastFrame)/500;	
  lastFrame = thisFrame;

  requestAnimationFrame(draw);
}

draw();
