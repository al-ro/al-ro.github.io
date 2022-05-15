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

var framesToFade = 30.0;
var wave_speed_d = 0.001;
var wave_speed_min_i = 0.0013;
var wave_speed_max_i = 0.0021;
var wave_height_d = 0.094;
var wave_height_min_i = 0.126;
var wave_height_max_i = 0.178;
var wave_speed = 0.02;
var wave_height = 0.16;

var scale = 0.3;

var gui = new dat.GUI({ autoPlace: false , width: 300});
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);

gui.add(this, 'wave_speed_d').min(0.0).max(0.02).step(0.0001).listen();
gui.add(this, 'wave_speed_min_i').min(0.0).max(0.02).step(0.0001).listen();
gui.add(this, 'wave_speed_max_i').min(0.0).max(0.02).step(0.0001).listen();
gui.add(this, 'wave_height_d').min(0.0).max(0.5).step(0.0001).listen();
gui.add(this, 'wave_height_min_i').min(0.0).max(0.5).step(0.0001).listen();
gui.add(this, 'wave_height_max_i').min(0.0).max(0.5).step(0.0001).listen();

gui.add(this, 'scale').min(0.01).max(1.0).step(0.001);
gui.close();
const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('canvas_container').appendChild(stats.domElement);

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

var noiseVertexSource = `
  
  attribute vec2 position;
  
  void main() { 
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

var noiseFragmentSource = `
  precision highp float;

  uniform vec2 resolution;
  uniform float scale;

  vec4 taylorInvSqrt(vec4 r){
  	return 1.79284291400159-0.85373472095314*r;
  }
  
  vec4 mod289(vec4 x){
      return x-floor(x*(1.0/289.0))*289.0;
  }
  
  vec4 permute(vec4 x){
      return mod289(((x*34.0)+1.0)*x);
  }
  
  vec2 fade(vec2 t){
      return (t * t * t) * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float perlin(vec2 Position, vec2 rep){
    vec4 Pi = floor(vec4(Position.x, Position.y, Position.x, Position.y)) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(vec4(Position.x, Position.y, Position.x, Position.y)) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod(Pi, vec4(rep.x, rep.y, rep.x, rep.y)); // To create noise with explicit period
    Pi = mod(Pi, vec4(289)); // To avoid truncation effects in permutation
    vec4 ix = vec4(Pi.x, Pi.z, Pi.x, Pi.z);
    vec4 iy = vec4(Pi.y, Pi.y, Pi.w, Pi.w);
    vec4 fx = vec4(Pf.x, Pf.z, Pf.x, Pf.z);
    vec4 fy = vec4(Pf.y, Pf.y, Pf.w, Pf.w);
  
    vec4 i = permute(permute(ix) + iy);
  
    vec4 gx = float(2) * fract(i / float(41)) - float(1);
    vec4 gy = abs(gx) - float(0.5);
    vec4 tx = floor(gx + float(0.5));
    gx = gx - tx;
  
    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);
  
    vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;
  
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
  
    vec2 fade_xy = fade(vec2(Pf.x, Pf.y));
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return float(2.3) * n_xy;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy/resolution;
    float noise = perlin(scale*uv, vec2(scale));
    gl_FragColor = vec4(vec3(0.5+0.5*noise), 1.0);
  }
`;



var vertexSource = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 vertexCoordinate;

  varying vec2 uv;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  
  uniform sampler2D perlinNoiseTexture;

  uniform float time;
  uniform float waveSpeed;
  uniform float waveHeight;

  uniform float scale;
  const int limit = 3;

  const float angle = 0.0;

  const float s = sin(angle);
  const float c = cos(angle);
  const mat2 rotation = mat2(c, s, -s, c);

  float getPerlinNoise(vec2 p){
    return 2.0*texture2D(perlinNoiseTexture, p).x-1.0;
  }

  float fbm(vec2 pos){
    float res = 0.0;
    float freq = 1.0;
    float amp = 1.0;
    float ampSum = 0.0;
    
    for(int i = 0; i < limit; i++){ 
	float offset = time * float(limit-i);
       	res += getPerlinNoise(freq*(pos+offset)) * amp;
	ampSum += amp;

        freq *= 2.0;
        amp *= 0.5;
        
        pos *= rotation;
    }
    return res/ampSum;
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
  uniform sampler2D perlinNoiseTexture;
  const float lineSpacing = ` + lineSpacing + `;
  const float lineWidth = ` + lineWidth + `;

  varying vec2 uv;
  
  void main(){
    float col = 0.5 + 0.5 * sin(uv.x * lineSpacing);
    gl_FragColor = vec4(vec3(0.5*pow(col, lineWidth)), 1.0);
  }
`;

//************** Utility functions **************
function createAndSetupTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
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
var noiseVertexShader = compileShader(noiseVertexSource, gl.VERTEX_SHADER);
var noiseFragmentShader = compileShader(noiseFragmentSource, gl.FRAGMENT_SHADER);

var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

//Create shader programs
var noiseProgram = gl.createProgram();
gl.attachShader(noiseProgram, noiseVertexShader);
gl.attachShader(noiseProgram, noiseFragmentShader);
gl.linkProgram(noiseProgram);
gl.useProgram(noiseProgram);

//Set up rectangle covering entire canvas 
var quadVertices = new Float32Array([
    -1.0,  1.0, // top left
    -1.0, -1.0, // bottom left
     1.0,  1.0, // top right
     1.0, -1.0, // bottom right
]);

//Create vertex buffer
const noiseVertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, noiseVertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);

var noisePositionHandle = getAttribLocation(noiseProgram, 'position');
// Layout of our data in the vertex buffer
gl.vertexAttribPointer(noisePositionHandle, 2, gl.FLOAT, false, 2*4, 0);
gl.enableVertexAttribArray(noisePositionHandle);

var noiseScaleHandle = gl.getUniformLocation(noiseProgram, 'scale');
var noiseResolutionHandle = gl.getUniformLocation(noiseProgram, 'resolution');

//Create and bind frame buffer
var noiseTexSize = 256;
var framebuffer = gl.createFramebuffer();
framebuffer.width = noiseTexSize;
framebuffer.height = noiseTexSize;
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

//Create texture
var perlinTexture = createAndSetupTexture(gl);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

//Attach texture to frame buffer
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, perlinTexture, 0);

//Draw noise to framebuffer
gl.useProgram(noiseProgram);

gl.uniform1f(noiseScaleHandle, 8.0);
gl.uniform2f(noiseResolutionHandle, noiseTexSize, noiseTexSize);

gl.viewport(0, 0, noiseTexSize, noiseTexSize); 
gl.clearColor(0, 0, 0, 1);  
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

//Fabric rendering
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

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
var scaleHandle = getUniformLocation(program, 'scale');
var projectionMatrixHandle = getUniformLocation(program, 'projectionMatrix');
var viewMatrixHandle = getUniformLocation(program, 'viewMatrix');
var modelMatrixHandle = getUniformLocation(program, 'modelMatrix');
var noiseTextureHandle = gl.getUniformLocation(program, 'perlinNoiseTexture');

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
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, perlinTexture);
gl.uniform1i(noiseTextureHandle, 0);
gl.uniformMatrix4fv(projectionMatrixHandle, false, projectionMatrix);
gl.uniformMatrix4fv(viewMatrixHandle, false, viewMatrix);
gl.uniformMatrix4fv(modelMatrixHandle, false, getModelMatrix());

var frame = 0;
var lastFrame = Date.now();
var thisFrame;

function draw(){
  stats.begin();
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
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); 
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(noiseTextureHandle, 0);
  gl.bindTexture(gl.TEXTURE_2D, perlinTexture);

  gl.uniform1f(timeHandle, time);
  gl.uniform1f(scaleHandle, scale);
  gl.uniform1f(waveSpeedHandle, wave_speed);
  gl.uniform1f(waveHeightHandle, wave_height);

  gl.clearColor(0, 0, 0, 1);  
  gl.enable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_SHORT, 0);
  requestAnimationFrame(draw);
  stats.end();
}

draw();
