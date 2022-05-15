// Canvas
var canvas = document.getElementById("canvas_1");

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

//canvas.width = canvas.clientWidth;
//canvas.height = canvas.width/1.6;

// Initialize the GL context
var gl = canvas.getContext('webgl', {antialias: true});

if(!gl){
  console.error("Unable to initialize WebGL.");
}

// GUI

var framesToFade = 30.0;
var wave_speed_d = 0.008;
var wave_speed_min_i = 0.013;
var wave_speed_max_i = 0.021;
var wave_height_d = 0.094;
var wave_height_min_i = 0.126;
var wave_height_max_i = 0.178;
var wave_speed = 0.02;
var wave_height = 0.16;
var scale = 3.52;
var line_spacing = 193.0;
var line_width = 55.0;
var limit = 3.0;
var radius = 0.5;
var strength = 5.0;
var lines = true;
var wireframe = false;
var scaleZ = 2.0;
var translateZ = -0.09;

var mouseOn = false;

if(mobile){
  limit = 3;
  line_spacing = 100.0;
  line_width = 35;
}

// Mouse
var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.0};
var mouseDelta = {x: 0, y: 0};
var isMouseDown = false;

var lastPos = {x: 0.5, y: 0.5};
// Camera
var pitch = 0.16;
var yaw = 1.26;
var dist = 1.79;
var cameraPosition = {x: 1, y: 0, z: 1};
updateCameraPosition(mouseDelta);

var gui = new dat.GUI({ autoPlace: false , width: 300});
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'framesToFade').min(1).max(200).step(1);
gui.add(this, 'limit').min(1).max(9).step(1);
//gui.add(this, 'radius').min(0).max(1).step(0.01);
//gui.add(this, 'strength').min(0).max(10).step(0.01);

gui.add(this, 'wave_speed_d').min(0.0).max(0.05).step(0.001).listen();
gui.add(this, 'wave_speed_min_i').min(0.0).max(0.05).step(0.001).listen();
gui.add(this, 'wave_speed_max_i').min(0.0).max(0.05).step(0.001).listen();
gui.add(this, 'wave_height_d').min(0.0).max(0.5).step(0.001).listen();
gui.add(this, 'wave_height_min_i').min(0.0).max(0.5).step(0.001).listen();
gui.add(this, 'wave_height_max_i').min(0.0).max(0.5).step(0.001).listen();

gui.add(this, 'scale').min(0.0).max(16.0).step(0.01);
gui.add(this, 'line_spacing').min(0.00001).max(1000.0).step(0.1);
gui.add(this, 'line_width').min(1.0).max(512.0).step(1.0);
gui.add(this, 'lines').onChange(function(value){ lines = value;});
gui.add(this, 'wireframe').onChange(function(value){ wireframe = value;});
/*
gui.add(this, 'scaleZ').min(0.1).max(5.0).step(0.01);
gui.add(this, 'translateZ').min(-0.5).max(0.5).step(0.01);
gui.add(this, 'pitch').min(-Math.PI/2.0).max(Math.PI/2.0).step(0.01).listen().onChange(function(value){updatePitchAndYaw()});
gui.add(this, 'yaw').min(0.0).max(6.28).step(0.01).listen().onChange(function(value){updatePitchAndYaw()});
gui.add(this, 'dist').min(0.0).max(5.0).step(0.01);
*/
gui.close();

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('canvas_container').appendChild(stats.domElement);

var  vertices = [];
var  uv = [];

const ratio = 2.0;

var height = 128;
if(mobile){
  height = 64;
}
const width = height * ratio;

for(let j = 0; j < height; j++){
  for(let i = 0; i < width; i++){
    vertices.push(i/width-0.5, 0.0, j/height-0.5);
    uv.push(i/width, j/height);
  }
}


var  indices = [];
for (var y = 0; y < height-1; y++) {
  for (var x = 0; x < width-1; x++) {
    indices.push(x + y * width, x + y * width + 1, x + (1+y) * width);
    indices.push(x + y * width + 1, x + (y+1) * width + 1, x + (1+y) * width);
  }
}

// Time
var time = 10.0;

function getViewMatrixAsArray(){
  var array = [];
  for(i = 0; i < 3; i++){
    array.push(viewMatrix[i].x);
    array.push(viewMatrix[i].y);
    array.push(viewMatrix[i].z);
  }
  return array;
}

function normalize(v){
  var length = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
  return {x: v.x/length, y: v.y/length, z: v.z/length};
}

function cross(a, b){
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }; 
}

function negate(a){
  return {x: -a.x, y: -a.y, z: -a.z};
}

//https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
function lookAt(camera, targetDir, up){
  var zaxis = normalize(targetDir);    
  var xaxis = normalize(cross(zaxis, up));
  var yaxis = cross(xaxis, zaxis);

  return [xaxis, yaxis, negate(zaxis)];
}

//************** Shader sources **************

var vertexSource = `
//Attributes get optimised out when not used. Looking for the attribute location will then return -1.
  precision highp float;
  uniform float time;
  attribute vec3 position;
  attribute vec2 vertexCoordinate;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat4 inverseViewMatrix;
  uniform mat4 inverseProjectionMatrix;
  
  uniform sampler2D greyNoiseTexture;

  varying vec2 uv;

  uniform float waveSpeed;
  uniform float waveHeight;
  uniform float scale;
  uniform float limit;
  uniform float strength;
  uniform float radius;
  uniform vec2 mousePos;
  uniform vec3 cameraPos;

  const float angle = 0.0;

  const float s = sin(angle);
  const float c = cos(angle);
  const mat2 rotation = mat2(c, s, -s, c);

//WEBGL-NOISE FROM https://github.com/stegu/webgl-noise

//Description : Array and textureless GLSL 2D simplex noise function. Author : Ian McEwan, Ashima Arts. Maintainer : stegu Lastmod : 20110822 (ijm) License : Copyright (C) 2011 Ashima Arts. All rights reserved. Distributed under the MIT License. See LICENSE file. https://github.com/ashima/webgl-noise https://github.com/stegu/webgl-noise

vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec2 mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec3 permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);} float snoise(vec2 v){const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v -   i + dot(i, C.xx); vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m ; m = m*m ; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g);}
//END NOISE

  //By iq
  float noised(vec2 x){

    vec2 f = fract(x);
    vec2 u = f*f*(3.0-2.0*f);

    vec2 p = floor(x);
    float a = texture2D(greyNoiseTexture, (p+vec2(0.5,0.5))/256.0).x;
    float b = texture2D(greyNoiseTexture, (p+vec2(1.5,0.5))/256.0).x;
    float c = texture2D(greyNoiseTexture, (p+vec2(0.5,1.5))/256.0).x;
    float d = texture2D(greyNoiseTexture, (p+vec2(1.5,1.5))/256.0).x;

    float res = (a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y);
    res = res - 0.5;
    return res;

  }


 float fbm(vec2 pos){
    float res = 0.0;
    float freq = 1.0;
    float amp = 1.0;
    float ampSum = 0.0;
    
    for(int i = 0; i < 9; i++){ 
        if(i == int(limit)){break;}

	float offset = time * float(int(limit)-i);
       	res += snoise(freq*(pos+offset))*amp;
	ampSum += amp;
        freq *= 1.75;
        amp *= 0.5;
        
        pos *= rotation;
    }
	return res/ampSum;
  }
  
  //Assume normalised vectors.
  float getPlaneIntersection(vec3 org, vec3 ray, vec3 planePoint, vec3 normal){
      float denom = dot(normal, ray); 
      if (denom > 1e-6) { 
          vec3 p0l0 = planePoint - org; 
          float t = dot(p0l0, normal) / denom; 
          return t; 
      } 
   
      return 0.0; 
  }
 
  void main(){ 
    float noiseH = waveHeight*fbm(scale*position.xz);
    vec3 offset = vec3(noiseH, 0.0, 0.0);
    float noiseV = waveHeight*fbm(scale*(position.xz+offset.xz));
    offset.y += noiseV;
   /* 
    float x = 2.0 * mousePos.x - 1.0;
    float y = 2.0 * mousePos.y - 1.0;
    float z = 1.0;
    vec3 ray_nds = vec3(x, y, z);
    vec4 ray_clip = vec4(ray_nds.xy, -1.0, 1.0);
    vec4 ray_eye = inverseProjectionMatrix * ray_clip;
    ray_eye = vec4(ray_eye.xy, -1.0, 0.0);
    vec3 ray = (inverseViewMatrix * ray_eye).xyz;
    ray = normalize(ray);
    
    float t = getPlaneIntersection(cameraPos, ray, (modelMatrix * vec4(position, 1.0)).xyz, vec3(-1.0, 0.0, 0.0));
    float distance = 0.0;
    if(t > 0.0){
      distance = radius-(min(radius, length((cameraPos + ray * t) - (modelMatrix * vec4(position, 1.0)).xyz)));
    }
*/
    vec4 pos = projectionMatrix * viewMatrix * modelMatrix * vec4(position + offset, 1.0);
    uv = vertexCoordinate;
    gl_Position = pos;
  }
`;

var fragmentSource = `
  precision highp float;
  uniform float lineSpacing;
  uniform float lineWidth;
  uniform bool wireframe;

  varying vec2 uv;
  
  void main(){

    float col = 0.5 + 0.5 * sin(uv.x * lineSpacing);
  
    if(wireframe){
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }else{
      gl_FragColor = vec4(vec3(0.5*pow(col, lineWidth)), 1.0);
    }
  }
`;

//************** Utility functions **************

// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.

function loadTexture(gl, texture, url) {
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const internalFormat = gl.RGBA;
  const width_ = 1;
  const height_ = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([255, 0, 0, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width_, height_, border, srcFormat, srcType, pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  };
  image.crossOrigin = "";
  image.src = url;

  return texture;
}

gl.activeTexture(gl.TEXTURE0);
var tex1 = gl.createTexture();
//Noise LUT from Shadertoy which is cheaper than calculating noise in the fragment shader
//https://shadertoyunofficial.wordpress.com/2019/07/23/shadertoy-media-files/
loadTexture(gl, tex1, 'https://al-ro.github.io/images/terrain/greyNoise.png');

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
/*  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  if(!isInFullscreen()){
    h = w / 1.6;
  }
  canvas.width = w;
  canvas.height = h;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);*/
}

//Compile shader and combine with source
function compileShader(shaderSource, shaderType){
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

//From https://codepen.io/jlfwong/pen/GqmroZ
//Utility to complain loudly if we fail to find the attribute/uniform
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Cannot find attribute ' + name + '.';
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  var uniformLocation = gl.getUniformLocation(program, name);
  if (uniformLocation === -1) {
    throw 'Cannot find uniform ' + name + '.';
  }
  return uniformLocation;
}

//************** Create shaders **************

//Create vertex and fragment shaders
var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

//Create shader programs
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

//Create vertex buffer
const vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
var positionHandle = getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionHandle, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionHandle);

const uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);

var uvHandle = getAttribLocation(program, 'vertexCoordinate');
gl.vertexAttribPointer(uvHandle, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(uvHandle);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// Set uniform handle
var timeHandle = getUniformLocation(program, 'time');
var projectionMatrixHandle = getUniformLocation(program, 'projectionMatrix');
var viewMatrixHandle = getUniformLocation(program, 'viewMatrix');
var invProjectionMatrixHandle = getUniformLocation(program, 'inverseProjectionMatrix');
var invViewMatrixHandle = getUniformLocation(program, 'inverseViewMatrix');
var modelMatrixHandle = getUniformLocation(program, 'modelMatrix');
var noiseTextureHandle = gl.getUniformLocation(program, 'greyNoiseTexture');
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(noiseTextureHandle, 0);

var waveHeightHandle = gl.getUniformLocation(program, 'waveHeight');
var waveSpeedHandle = gl.getUniformLocation(program, 'waveSpeed');
var scaleHandle = gl.getUniformLocation(program, 'scale');
var limitHandle = gl.getUniformLocation(program, 'limit');
var radiusHandle = gl.getUniformLocation(program, 'radius');
var strengthHandle = gl.getUniformLocation(program, 'strength');
var lineSpacingHandle = gl.getUniformLocation(program, 'lineSpacing');
var lineWidthHandle = gl.getUniformLocation(program, 'lineWidth');
var wireframeHandle = gl.getUniformLocation(program, 'wireframe');
var mousePosHandle = gl.getUniformLocation(program, 'mousePos');
var cameraPosHandle = gl.getUniformLocation(program, 'cameraPos');

var lastFrame = Date.now();
var thisFrame;

function getPos(canvas, evt){
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function mouseDown(event){
  isMouseDown = true;
  //var pos = getPos(canvas, event);
  //lastPos.x = pos.x;
  //lastPos.y = pos.y;
}

function mouseUp(event){
  isMouseDown = false;
  mouseDelta.x = 0.0;
  mouseDelta.y = 0.0;
}

function getCameraPosition(){
  return [dist*cameraPosition.x, dist*cameraPosition.y, dist*cameraPosition.z];
}

function updatePitchAndYaw(){
  cameraPosition.x = Math.sin(yaw);
  cameraPosition.z = Math.cos(yaw);
  cameraPosition.y = -Math.sin(pitch);
  cameraPosition = normalize(cameraPosition);
}

function updateCameraPosition(delta){
  //var yawChange = (delta.x * 0.01) % (2.0 * Math.PI);
  //yaw += yawChange;
  cameraPosition.x = Math.sin(yaw);
  cameraPosition.z = Math.cos(yaw);
  cameraPosition = normalize(cameraPosition);
  //yawChange = (delta.y * 0.01) % (2.0 * Math.PI);
  //pitch += yawChange;
  pitch = Math.max(-Math.PI/2.0, Math.min(Math.PI/2.0, pitch));
  cameraPosition.y = -Math.sin(pitch);
  cameraPosition = normalize(cameraPosition);
}

function mix(x, y, a){
  return x * (1.0-a) + y * a;
}

function mouseMove(event){
  mouseOn = true;
  //if(isMouseDown){
  var rect = canvas.getBoundingClientRect();
  lastPos.x = (event.clientX - rect.left) / rect.width;
  lastPos.y = (event.clientY - rect.top) / rect.height;
  //wave_speed = mix(wave_speed_min_i, wave_speed_max_i, lastPos.x);
  //wave_height = mix(wave_height_min_i, wave_height_max_i, lastPos.y);

  //wave_speed *= lastPos.x;
  //wave_height *= lastPos.y;
/*
  var pos = getPos(canvas, event);
  mouseDelta.x = lastPos.x - pos.x;
  mouseDelta.y = lastPos.y - pos.y;

  updateCameraPosition(mouseDelta);
  lastPos.x = pos.x;
  lastPos.y = pos.y;
  //}
*/
}

function fadeIn(f){
   wave_speed = mix(wave_speed_d, mix(wave_speed_min_i, wave_speed_max_i, lastPos.x), f);
   wave_height = mix(wave_height_d, mix(wave_height_min_i, wave_height_max_i, lastPos.x), f);
}

function mouseLeave(event){
  mouseOn = false;
  //lastPos.x = 0.5;
  //lastPos.y = 0.5;
  //wave_speed = wave_speed_d;
  //wave_height = wave_height_d;
}
function mouseEnter(event){
  mouseOn = true;
  //wave_speed = mix(wave_speed_min_i, wave_speed_max_i, lastPos.x);
  //wave_height = mix(wave_height_min_i, wave_height_max_i, lastPos.y);
}

function onScroll(event){
  event.preventDefault();
  dist += event.deltaY * 0.1;
  dist = Math.min(Math.max(1.0, dist), 50.0);
}

canvas.addEventListener('mousedown', mouseDown);
canvas.addEventListener('mouseup', mouseUp);
canvas.addEventListener('mousemove', mouseMove);
canvas.addEventListener('mouseleave', mouseLeave);
canvas.addEventListener('mouseenter', mouseEnter);
//canvas.addEventListener('wheel', onScroll);

var projectionMatrix;
var viewMatrix;
var inverseProjectionMatrix = m4.create();
var inverseViewMatrix = m4.create();

function setCamera(time){
  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  projectionMatrix = m4.perspective(fieldOfView, aspect, zNear, zFar);

  var cameraTarget = [0, 0, 0];
  //var cameraPosition = [Math.sin(time)*10, 0, Math.cos(time)*10.0];
  var up = [0, 1, 0];

  // Compute the camera's matrix using look at.
  var cameraMatrix = m4.lookAt(getCameraPosition(), cameraTarget, up);

  // Make a view matrix from the camera matrix.
  viewMatrix = m4.inverse(cameraMatrix);
}

function getModelMatrix(){
  var modelMatrix = m4.create();
  modelMatrix = m4.zRotate(modelMatrix, Math.PI/2.0); 
  modelMatrix = m4.scale(modelMatrix, 1.0, 1.0, scaleZ); 
  modelMatrix = m4.translate(modelMatrix, 0.0, 0.0, translateZ); 
  return modelMatrix;
}

var frame = 0;

function draw(){
  //console.log(lastPos);
  stats.begin();

  if(mouseOn){
    frame = Math.min(framesToFade, frame + 1.0);
  }else{
    frame = Math.max(0, frame - 1.0);
  }
  f = frame/framesToFade;
  //console.log(wave_speed);
  fadeIn(f);

  //Update time
  thisFrame = Date.now();
  time += 25.0 * wave_speed * (thisFrame - lastFrame)/1000;	
  lastFrame = thisFrame;

  setCamera(time); 

  gl.useProgram(program);

  m4.invert(inverseProjectionMatrix, projectionMatrix);
  m4.invert(inverseViewMatrix, viewMatrix);

  gl.uniform1f(timeHandle, time);
  gl.uniformMatrix4fv(projectionMatrixHandle, false, projectionMatrix);
  gl.uniformMatrix4fv(viewMatrixHandle, false, viewMatrix);
  gl.uniformMatrix4fv(invProjectionMatrixHandle, false, inverseProjectionMatrix);
  gl.uniformMatrix4fv(invViewMatrixHandle, false, inverseViewMatrix);
  gl.uniformMatrix4fv(modelMatrixHandle, false, getModelMatrix());
  gl.uniform1f(waveSpeedHandle, wave_speed);
  gl.uniform1f(waveHeightHandle, wave_height);
  gl.uniform1f(scaleHandle, scale);
  gl.uniform1f(limitHandle, limit);
/*
  gl.uniform1f(radiusHandle, radius);
  gl.uniform1f(strengthHandle, strength);
*/
  gl.uniform1f(lineSpacingHandle, line_spacing);
  gl.uniform1f(lineWidthHandle, line_width);
  gl.uniform2f(mousePosHandle, lastPos.x, 1.0-lastPos.y);
  gl.uniform3f(cameraPosHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
  gl.clearColor(0, 0, 0, 1);  
  gl.enable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT);

  if(lines){
    gl.uniform1f(wireframeHandle, 0);
    gl.drawElements(gl.TRIANGLES, 2*3*(width-1)*(height-1), gl.UNSIGNED_SHORT, 0);
  }
  if(wireframe){
    gl.uniform1f(wireframeHandle, 1);
    gl.drawElements(gl.LINES, 2*3*(width-1)*(height-1), gl.UNSIGNED_SHORT, 0);
  }
  stats.end();
  requestAnimationFrame(draw);
}

draw();
