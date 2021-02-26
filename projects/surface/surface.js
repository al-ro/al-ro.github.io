const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

// Canvas
var canvas = document.getElementById("canvas_1");

if(mobile){
  canvas.width = 1440;
  canvas.height = 900;
}else{
  canvas.width = 2880;
  canvas.height = 1800;
}

// Initialize the GL context
var gl = canvas.getContext('webgl', {antialias: true});

if(!gl){
  console.error("Unable to initialize WebGL.");
}

// Main variables
var time = 10.0;

const framesToFade = 30.0;
const wave_speed_d = 0.008;
const wave_speed_min_i = 0.013;
const wave_speed_max_i = 0.021;
const wave_height_d = 0.094;
const wave_height_min_i = 0.126;
const wave_height_max_i = 0.178;
var wave_speed = 0.02;
var wave_height = 0.16;

const ratio = 2.0;
const scaleZ = 2.0;
const translateZ = -0.09;

var mouseOn = false;

// Geometry
var  vertices = [];
var  uv = [];

var height = 128;

if(mobile){
  height = 64;
}
const width = height * ratio;

const elementCount = 2 * 3 * (width - 1) * (height - 1);

for(let j = 0; j < height; j++){
  for(let i = 0; i < width; i++){
    vertices.push(i/width-0.5, 0.0, j/height-0.5);
    uv.push(i/width, j/height);
  }
}

var indices = [];
for (var y = 0; y < height-1; y++) {
  for (var x = 0; x < width-1; x++) {
    indices.push(x + y * width, x + y * width + 1, x + (1+y) * width);
    indices.push(x + y * width + 1, x + (y+1) * width + 1, x + (1+y) * width);
  }
}

// Mouse
var mousePosition = {x: 0.5, y: 0.5};

// Camera
var pitch = 0.16;
var yaw = 1.26;
var dist = 1.79;
var cameraPosition = {x: 1, y: 0, z: 1};
updateCameraPosition();

var projectionMatrix;
var viewMatrix;

// Camera utilities
function normalize(v){
  var length = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
  return {x: v.x/length, y: v.y/length, z: v.z/length};
}

function getCameraPosition(){
  return [dist * cameraPosition.x, dist * cameraPosition.y, dist * cameraPosition.z];
}

function updateCameraPosition(){
  cameraPosition.x = Math.sin(yaw);
  cameraPosition.z = Math.cos(yaw);
  pitch = Math.max(-Math.PI/2.0, Math.min(Math.PI/2.0, pitch));
  cameraPosition.y = -Math.sin(pitch);
  cameraPosition = normalize(cameraPosition);
}

function setCamera(){
  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;

  projectionMatrix = m4.perspective(fieldOfView, aspect, zNear, zFar);

  var cameraTarget = [0, 0, 0];
  var up = [0, 1, 0];

  var cameraMatrix = m4.lookAt(getCameraPosition(), cameraTarget, up);

  viewMatrix = m4.inverse(cameraMatrix);
}

//************** Shader sources **************
var vertexSource = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 vertexCoordinate;

  varying vec2 uv;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  
  uniform sampler2D greyNoiseTexture;

  uniform float time;
  uniform float waveSpeed;
  uniform float waveHeight;

  const float scale = 3.52;
  const int limit = 3;

  const float angle = 0.0;

  const float s = sin(angle);
  const float c = cos(angle);
  const mat2 rotation = mat2(c, s, -s, c);

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
    
    for(int i = 0; i < limit; i++){ 
	float offset = time * float(limit-i);
       	res += noised(freq*(pos+offset)) * amp;

        freq *= 1.75;
        amp *= 0.5;
        
        pos *= rotation;
    }
    return res;
  }
  
  void main(){ 
    float noiseH = waveHeight * fbm(scale*position.xz);
    vec3 offset = vec3(noiseH, 0.0, 0.0);
    float noiseV = waveHeight * fbm(scale*(position.xz+offset.xz));
    offset.y += noiseV;

    vec4 pos = projectionMatrix * viewMatrix * modelMatrix * vec4(position + offset, 1.0);
    uv = vertexCoordinate;
    gl_Position = pos;
  }
`;

var lineSpacing =  mobile ? `100.0` : `193.0`;
var lineWidth =  mobile ? `25.0` : `55.0`;

var fragmentSource = `
  precision highp float;
  const float lineSpacing = ` + lineSpacing + `;
  const float lineWidth = ` + lineWidth + `;

  varying vec2 uv;
  
  void main(){
    float col = 0.5 + 0.5 * sin(uv.x * lineSpacing);
    gl_FragColor = vec4(vec3(0.5*pow(col, lineWidth)), 1.0);
  }
`;

//************** Utility functions **************
function loadTexture(gl, texture, url) {
  gl.bindTexture(gl.TEXTURE_2D, texture);

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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  };
  image.crossOrigin = "";
  image.src = url;

  return texture;
}

gl.activeTexture(gl.TEXTURE0);
var noiseTexture = gl.createTexture();

//https://shadertoyunofficial.wordpress.com/2019/07/23/shadertoy-media-files/
loadTexture(gl, noiseTexture, 'https://al-ro.github.io/images/terrain/greyNoise.png');

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
var modelMatrixHandle = getUniformLocation(program, 'modelMatrix');
var noiseTextureHandle = gl.getUniformLocation(program, 'greyNoiseTexture');

var waveHeightHandle = gl.getUniformLocation(program, 'waveHeight');
var waveSpeedHandle = gl.getUniformLocation(program, 'waveSpeed');

// Interaction
function mix(x, y, a){
  return x * ( 1.0 - a ) + y * a;
}

function fadeIn(f){
   wave_speed = mix(wave_speed_d, mix(wave_speed_min_i, wave_speed_max_i, mousePosition.x), f);
   wave_height = mix(wave_height_d, mix(wave_height_min_i, wave_height_max_i, mousePosition.y), f);
}

function mouseMove(evt){
  mouseOn = true;
  let rect = canvas.getBoundingClientRect();
  mousePosition.x = (evt.clientX - rect.left) / rect.width;
  mousePosition.y = (evt.clientY - rect.top) / rect.height;

}

function mouseLeave(evt){
  mouseOn = false;
}

function mouseEnter(evt){
  mouseOn = true;
}

function touchMove(evt) {
  var touches = evt.changedTouches;
  let rect = canvas.getBoundingClientRect();
  mousePosition.x = (touches[0].pageX - rect.left) / rect.width;
  mousePosition.y = (touches[0].pageY - rect.top) / rect.height;
}

canvas.addEventListener('mousemove', mouseMove);
canvas.addEventListener('mouseleave', mouseLeave);
canvas.addEventListener('mouseenter', mouseEnter);
canvas.addEventListener('touchmove', touchMove, {passive: true});
canvas.addEventListener('touchend', mouseLeave, {passive: true});
canvas.addEventListener('touchstart', mouseEnter, {passive: true});

function getModelMatrix(){
  var modelMatrix = m4.create();
  modelMatrix = m4.zRotate(modelMatrix, Math.PI/2.0); 
  modelMatrix = m4.scale(modelMatrix, 1.0, 1.0, scaleZ); 
  modelMatrix = m4.translate(modelMatrix, 0.0, 0.0, translateZ); 
  return modelMatrix;
}

setCamera(); 

gl.useProgram(program);
gl.uniform1i(noiseTextureHandle, 0);
gl.uniformMatrix4fv(projectionMatrixHandle, false, projectionMatrix);
gl.uniformMatrix4fv(viewMatrixHandle, false, viewMatrix);
gl.uniformMatrix4fv(modelMatrixHandle, false, getModelMatrix());

var frame = 0;
var lastFrame = Date.now();
var thisFrame;

function draw(){

  if(mouseOn){
    frame = Math.min(framesToFade, frame + 1.0);
  }else{
    frame = Math.max(0, frame - 1.0);
  }

  fadeIn(frame/framesToFade);

  thisFrame = Date.now();
  time += 25.0 * wave_speed * (thisFrame - lastFrame)/1000;	
  lastFrame = thisFrame;

  gl.useProgram(program);

  gl.uniform1f(timeHandle, time);
  gl.uniform1f(waveSpeedHandle, wave_speed);
  gl.uniform1f(waveHeightHandle, wave_height);

  gl.clearColor(0, 0, 0, 1);  
  gl.enable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_SHORT, 0);
  requestAnimationFrame(draw);
}

draw();
