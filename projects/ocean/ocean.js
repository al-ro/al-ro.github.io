// Canvas
var canvas = document.getElementById("canvas_1");

canvas.width = canvas.clientWidth;
canvas.height = canvas.width/1.6;

// Initialize the GL context
var gl = canvas.getContext('webgl', {
  //premultipliedAlpha: false
});

if(!gl){
  console.error("Unable to initialize WebGL.");
}

// Mouse
var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.0};
var mouseDelta = {x: 0, y: 0};
var isMouseDown = false;

var lastPos = {x: mousePosition.x, y: mousePosition.y};

// Camera
var yaw = Math.PI/4.0;
var pitch = -2.0;
var dist = 2.0;
var cameraPosition = {x: 1, y: 0, z: 1};
updateCameraPosition(mouseDelta);

var  vertices = [];
var  uv = [];

const ratio = 2.0;

const height = 50;
const width = height * ratio;

for(let j = 0; j < height; j++){
  for(let i = 0; i < width; i++){
    vertices.push(i/width-0.5, 0.0, j/height-0.5);
    uv.push(i/width, j/width);
  }
}

var modelMatrix = m4.create();
modelMatrix = m4.scale(modelMatrix, 3.0, 1.0, 3.0*ratio); 

var  indices = [];
for (var y = 0; y < height-1; y++) {
  for (var x = 0; x < width-1; x++) {
    indices.push(x + y * width, x + y * width + 1, x + (1+y) * width);
    indices.push(x + y * width + 1, x + (y+1) * width + 1, x + (1+y) * width);
  }
}

// Time
var time = 0.0;

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
  
  uniform sampler2D greyNoiseTexture;

  varying vec2 uv;

  float waveSpeed = 0.1;

  const float angle = 3.14;

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


 float fbm(vec2 pos, int limit){
    float res = 0.0;
    float freq = 1.0;
    float amp = 1.0;
    
    for(int i = 0; i < 9; i++){ 
        if(i == limit){break;}

       	res += noised(freq*(pos+time*(waveSpeed*float(9-i+1))))*amp;

        freq *= 1.75;
        amp *= 0.5;
        
        pos *= rotation;
    }
	return res;
  }
 
  void main(){ 
    vec3 noise = vec3(0, 0.15*fbm(10.0*position.xz, 9), 0);
    vec4 pos = projectionMatrix * viewMatrix * modelMatrix * vec4(position + noise, 1.0);
    uv = vertexCoordinate;
    gl_Position = pos;
  }
`;

var fragmentSource = `
  precision highp float;
const vec3 skyColour = vec3(0.09, 0.33, 0.81);
const vec3 sunLightColour = vec3(1);
const vec3 sunColour = sunLightColour;

float specularStrength = 100.0;
float shininess = 2048.0;
const vec3 specularColour = sunLightColour;

//In a circle of 2*PI
const float sunLocation = 0.0;
//0: horizon, 1: zenith
const float sunHeight = 0.35;

const float diffuseStrength = 0.2;
const vec3 diffuseColour = diffuseStrength * vec3(0.05,0.45,0.65);

float ambientStrength = 0.5;
vec3 ambientColour = 0.5 * diffuseColour;

vec3 scatterColour = vec3(0.05, 0.8, 0.7);
float power = 8.0;
float scale = 0.4;
float distortion = 0.2;
float scatterStrength = 0.3;

float HEIGHT = 10.0;

  varying vec2 uv;

float saturate(float x){
	return clamp(x, 0.0, 1.0);
}

//https://learnopengl.com/PBR/Theory
float fresnelSchlick(vec3 cameraPos, vec3 position, vec3 normal){
    float cosTheta = dot(normal, normalize(cameraPos - position));
	float F0 = 0.02;
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

//Return colour of surface fragment based on light information.
vec3 shading(vec3 cameraPos, vec3 position, vec3 normal, vec3 rayDir, vec3 lightDirection){
    
	vec3 result = vec3(0.0); 
    
	vec3 halfwayDir = normalize(lightDirection - rayDir);  
	float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);

	//Colour of light sharply reflected into the camera.
	vec3 specular = spec * specularColour * sunLightColour; 
	
	//How much a fragment faces the sun.
	float sun = max(dot(normal, lightDirection), 0.0);
    //Main sunlight contribution.
    vec3 sunLight = sun * sunLightColour;
    
    //How much the fragment faces up.
    float sky = max(dot(normal, vec3(0,1,0)), 0.0);
    //Sky light. A blue light from directly above.
	vec3 skyLight = sky * skyColour;
    
    //Combine light
    result += 0.1 * sunLight;
    result += 0.1 * skyLight;
    
    //Sample point height in the wave.
    float heightFraction = (position.y + HEIGHT) / (2.0 * HEIGHT);
    
    //Lighten the water when looking towards the horizon and darken it straight down.
    vec3 col = mix(ambientColour, 0.5*scatterColour, pow(0.5+0.5*rayDir.y, 2.0));
    
    //Light and material interaction.
    result *= diffuseColour;
    result += ambientStrength * col + specularStrength * specular;
    
    //Fake subsurface scattering based on light direction and surface normal.
    //https://www.alanzucconi.com/2017/08/30/fast-subsurface-scattering-1/
    vec3 h = normalize(-lightDirection + normal * distortion);
	float vDotH = pow(saturate(dot(rayDir, -h)), power) * scale;
    
/*
    //Scattering in stronger closer to the camera and higher in the wave.
    result += 	scatterStrength * pow((1.0-dist/MAX_DIST), 4.0) * 
        		heightFraction * vDotH * scatterColour;
*/
    
    //Reflection of the sky.
    vec3 reflectedDir = normalize(reflect(rayDir, normal));
    vec3 reflectedCol = vec3(1);//getSkyColour(reflectedDir);
    float fresnel = saturate(fresnelSchlick(cameraPos, position, normal));
   	result = mix(result, reflectedCol, 0.45*fresnel);

    return result;
}
  
  void main(){

    float col = 0.5 + 0.5 * sin(uv.x * 200.0);
  
    gl_FragColor = vec4(vec3(pow(col, 16.0)), 1.0);
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
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  if(!isInFullscreen()){
    h = w / 1.6;
  }
  canvas.width = w;
  canvas.height = h;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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
var modelMatrixHandle = getUniformLocation(program, 'modelMatrix');
var noiseTextureHandle = gl.getUniformLocation(program, 'greyNoiseTexture');
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(noiseTextureHandle, 0);

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
  var pos = getPos(canvas, event);
  lastPos.x = pos.x;
  lastPos.y = pos.y;
}

function mouseUp(event){
  isMouseDown = false;
  mouseDelta.x = 0.0;
  mouseDelta.y = 0.0;
}

function getCameraPosition(){
  return [dist*cameraPosition.x, dist*cameraPosition.y, dist*cameraPosition.z];
}

function updateCameraPosition(delta){
  var yawChange = (delta.x * 0.01) % (2.0 * Math.PI);
  yaw += yawChange;
  cameraPosition.x = Math.sin(yaw);
  cameraPosition.z = Math.cos(yaw);
  cameraPosition = normalize(cameraPosition);
  yawChange = (delta.y * 0.01) % (2.0 * Math.PI);
  pitch += yawChange;
  pitch = Math.max(-Math.PI/2.0, Math.min(Math.PI/2.0, pitch));
  cameraPosition.y = -Math.sin(pitch);
  cameraPosition = normalize(cameraPosition);
}

function mouseMove(event){
  if(isMouseDown){
    var pos = getPos(canvas, event);
    mouseDelta.x = lastPos.x - pos.x;
    mouseDelta.y = lastPos.y - pos.y;

    updateCameraPosition(mouseDelta);
    lastPos.x = pos.x;
    lastPos.y = pos.y;
  }
}

function onScroll(event){
  event.preventDefault();
  dist += event.deltaY * 0.1;
  dist = Math.min(Math.max(1.0, dist), 50.0);
}

canvas.addEventListener('mousedown', mouseDown);
canvas.addEventListener('mouseup', mouseUp);
canvas.addEventListener('mousemove', mouseMove);
canvas.addEventListener('wheel', onScroll);

var projectionMatrix;
var viewMatrix;

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

function draw(){

  //Update time
  thisFrame = Date.now();
  time += (thisFrame - lastFrame)/1000;	
  lastFrame = thisFrame;

  setCamera(time); 

  gl.useProgram(program);

  gl.uniform1f(timeHandle, time);
  gl.uniformMatrix4fv(projectionMatrixHandle, false, projectionMatrix);
  gl.uniformMatrix4fv(viewMatrixHandle, false, viewMatrix);
  gl.uniformMatrix4fv(modelMatrixHandle, false, modelMatrix);
  gl.clearColor(0, 0, 0, 1);  
  gl.enable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawElements(gl.TRIANGLES, 2*3*(width-1)*(height-1), gl.UNSIGNED_SHORT, 0);
  requestAnimationFrame(draw);
}

draw();
