//2D raphics using WebGL and GLSL
//Based on:
//http://jamie-wong.com/2016/07/06/metaballs-and-webgl/
//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
//http://learningwebgl.com/blog/?p=1786
//https://dev.opera.com/articles/webgl-post-processing/
//https://webglfundamentals.org/
//And many more

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

var WIDTH = 2048;
var HEIGHT = WIDTH;

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Initialize the GL context
var gl = canvas.getContext('webgl');

if(!gl){
  alert("Unable to initialize WebGL.");
}
//Time step
var dt = 0.025;
//Time
var time = 0.0;

/*
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'dt').min(0.0).max(0.05).step(0.005).listen();
gui.add(this, 'bloom').min(0.0).max(100.0).step(1).listen();
gui.add(this, 'blurFactor').min(0.0).max(6.0).step(0.1).listen();
gui.add(red_button, 'red');
gui.add(green_button, 'green');
gui.add(blue_button, 'blue');
gui.add(gradient_button, 'gradient');
gui.close();
*/

//GLSL code is presented as a string that is passed for compilation. 
//Can use quotes (' or "), which require escaping newline, or backtick (`), which doesn't.

//****************** Noise shaders ******************
//Specify vertex shader. (x,y) coordinates are variable, z is 0
var noiseVertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

//Specify fragment shader. Set colour
var noiseFragmentSource = `
precision highp float;
const float WIDTH = ` + WIDTH + `.0;
const float HEIGHT = ` + HEIGHT + `.0;
vec2 resolution = vec2(WIDTH, HEIGHT);
uniform float time;

//WEBGL-NOISE FROM https://github.com/stegu/webgl-noise

//Description : Array and textureless GLSL 2D simplex noise function. Author : Ian McEwan, Ashima Arts. Maintainer : stegu Lastmod : 20110822 (ijm) License : Copyright (C) 2011 Ashima Arts. All rights reserved. Distributed under the MIT License. See LICENSE file. https://github.com/ashima/webgl-noise https://github.com/stegu/webgl-noise

vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec2 mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec3 permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);} float snoise(vec2 v){const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v -   i + dot(i, C.xx); vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m ; m = m*m ; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g);}
//END NOISE

#define TILES 1.0 // Use 1.0 for normal tiling across whole texture.
#define NUM_CELLS 4.0


float remap(float value, float old_low, float old_high, float new_low, float new_high){
  float ret_val = new_low + (value - old_low) * (new_high - new_low) / (old_high - old_low);
  return ret_val; 
}


//----------------------------------------------------------------------------------------
float Hash(vec2 p, float scale){

  //return 0.5 + 0.5  * snoise(mod(p, scale));
  // This is tiling part, adjusts with the scale...
  p = mod(p, scale);
  return fract(sin(dot(p, vec2(27.16898, 38.90563))) * 5151.5473453);
}

//------------------------------------------------------------------------
vec2 Hash2(vec2 p){

  float r = 523.0*sin(dot(p, vec2(53.3158, 43.6143)));
  return vec2(fract(15.32354 * r), fract(17.25865 * r));

}
//-----------------------------------------------------------------------------
float hash(float n){
  return fract( sin(n) * 43758.5453 );
}
//------------------------------------------------------------------------
// hash based 3d value noise
float noise(in vec3 x){
  vec3 p = floor(x);
  vec3 f = fract(x);

  f = f*f*(3.0 - 2.0 * f);
  float n = p.x + p.y*57.0 + 113.0*p.z;
  return mix(
      mix(
	mix(hash(n + 0.0), hash(n + 1.0), f.x),
	mix(hash(n + 57.0), hash(n + 58.0), f.x),
	f.y),
      mix(
	mix(hash(n + 113.0), hash(n + 114.0), f.x),
	mix(hash(n + 170.0), hash(n + 171.0), f.x),
	f.y),
      f.z);
}


//------------------------------------------------------------------------
float worley(vec2 pos, float numCells) {
  vec2 p = pos * numCells;
  float d = 1.0e10;
  for (int x = -1; x <= 1; x++){
    for (int y = -1; y <= 1; y++){
      vec2 tp = floor(p) + vec2(x, y);
      tp = p - tp - Hash2(mod(tp, numCells / TILES));
      d = min(d, dot(tp, tp));
    }
  }
  return 1.0 - clamp(d, 0.0, 1.0);
}

float worley(vec3 pos, float numCells){
  vec3 p = pos * numCells;
  float d = 1.0e10;
  for (int x = -1; x <= 1; x++){
    for (int y = -1; y <= 1; y++){
      for (int z = -1; z <= 1; z++){
	vec3 tp = floor(p) + vec3(x, y, z);
	tp = p - tp - noise(mod(tp, numCells / TILES));
	d = min(d, dot(tp, tp));
      }
    }
  }
  return 1.0 - clamp(d, 0.0, 1.0);
}

//----------------------------------------------------------------------------------------
float Noise(vec2 pos, float scale )
{
  vec2 f;

  vec2 p = pos * scale;

  f = fract(p);		// Separate integer from fractional
  p = floor(p);

  f = f*f*(3.0-2.0*f);	// Cosine interpolation approximation

  float res = mix(mix(Hash(p, scale), 
		      Hash(p + vec2(1.0, 0.0), scale), f.x),
		  mix(Hash(p + vec2(0.0, 1.0), scale),
		      Hash(p + vec2(1.0, 1.0), scale), f.x), 
	      f.y);
  return res;
}

//----------------------------------------------------------------------------------------
float fbm(vec2 pos){
  float f = 0.0;
  // Change starting scale to any integer value...
  float scale = 10.;
  vec2 p  = mod(pos, scale);
  float amp   = 0.5;

  for (int i = 0; i < 5; i++)
  {
    f += Noise(p, scale) * amp;
    amp *= 0.5;
    // Scale must be multiplied by an integer value...
    scale *= 2.0;
  }
  // Clamp it just in case....
  return min(f, 1.0);
}

float fbm(vec2 pos, float numCells){
  float f = 0.0;
  // Change starting scale to any integer value...
  float scale = 1.0;
  vec2 p  = mod(pos, scale);
  float amp  = 0.5;

  for (int i = 0; i < 3; i++){
    f += worley(p, numCells * scale) * amp;
    amp *= 0.5;
    // Scale must be multiplied by an integer value...
    scale *= 2.0;
  }
  // Clamp it just in case....
  return min(f, 1.0);
}

//Return the 3D coordinate corresponding to the 2D atlas uv coordinate.
//If invalid, return -1.0
vec3 get3Dfrom2D(vec2 uv, float tileRows){

  vec2 tile = floor(uv);

  float z = floor(tileRows * tile.y + tile.x);
  return vec3(fract(uv), z);
}

//type 0 == perlin-worley
//type 1 == worley
float getTextureForPoint(vec3 p, int type){
  float res;
  if(type == 0){
    //Perlin-Worley (Really, Simplex-Worley)

  }else{
    //Worley
    float worley0 = worley(p, NUM_CELLS);
    float worley1 = worley(p, NUM_CELLS*2.0);
    float worley2 = worley(p, NUM_CELLS*4.0);
    float worley3 = worley(p, NUM_CELLS*8.0);

    float FBM0 = worley0 * 0.625 + worley1 * 0.25 + worley2 * 0.125;
    float FBM1 = worley1 * 0.625 + worley2 * 0.25 + worley3 * 0.125;
    float FBM2 = worley2 * 0.75 + worley3 * 0.25;

    res = FBM0 * 0.625 + FBM1 * 0.25 + FBM2 * 0.125;

  }
  return res;
}

void main() {
  //Normalized pixel coordinates (from 0 to 1)
  float tileSize = 130.0;
  float padWidth = 1.0;
  float coreSize = tileSize - 2.0 * padWidth;
  float tileRows = 12.0;
  float tileCount = tileRows * tileRows;
  vec2 tile = floor((gl_FragCoord.xy - 0.5) / tileSize);

  bool padCell = false;
  if(mod(gl_FragCoord.x, tileSize) == 0.5 || mod(gl_FragCoord.x, tileSize) == tileSize - 0.5){
    padCell = true;
  }
  if(mod(gl_FragCoord.y, tileSize) == 0.5 || mod(gl_FragCoord.y, tileSize) == tileSize - 0.5){
    padCell = true;
  }
  bool startPadX = false;
  bool endPadX = false;
  bool startPadY = false;
  bool endPadY = false;
  if(gl_FragCoord.x == tile.x * tileSize + 0.5){
    startPadX = true;
  }
  if(gl_FragCoord.y == tile.y * tileSize + 0.5){
    startPadY = true;
  }
  if(gl_FragCoord.x == (tile.x + 1.0) * tileSize - 0.5){
    endPadX = true;
  }
  if(gl_FragCoord.y == (tile.y + 1.0) * tileSize - 0.5){
    endPadY = true;
  }
  vec2 padding = vec2(2.0 * padWidth) * tile;
  vec2 pixel;
  vec2 uv;
  if(!padCell){
    pixel = gl_FragCoord.xy - padWidth - padding;
    uv = vec2(pixel.xy/coreSize);
  }else{
    pixel = gl_FragCoord.xy - padWidth - padding;
    if(startPadX){
      pixel.x += coreSize;	
    }
    if(startPadY){
      pixel.y += coreSize;	
    }
    if(endPadX){
      pixel.x -= coreSize;	
    }
    if(endPadY){
      pixel.y -= coreSize;	
    }
    uv = vec2(pixel.xy/coreSize);
  }

  vec3 p_ = get3Dfrom2D(uv, tileRows);
  vec3 p = p_;
  p.z /= (tileRows*tileRows);

  vec3 col = vec3(0);
  //Get Perlin-Worley noise for level l
  col.r = getTextureForPoint(p, 0);
  //Get Worley noise for level l
  col.r = getTextureForPoint(p, 1);

  p_ = mod(p_ + 1.0, tileRows * tileRows);
  p = p_;
  p.z /= (tileRows*tileRows); 
  //Get Perlin-Worley noise for level l+1
  col.r = getTextureForPoint(p, 0);
  //Get Worley noise for level l+1
  col.g = getTextureForPoint(p, 1);

  //Show erroneous values as red
  if((col.x > 1.0) || (col.x < 0.0)){ col = vec3(1,0,0); }

  //Boundary cells
  if(padCell){
    //col = vec3(0,0,1);
  }
  //iterate layers
  if(floor(p_.z) == floor(mod(time, tileRows * tileRows))){
    if(padCell){
      //col = vec3(1,1,0);
    }else{
      //col = vec3(0,1,0);
    }
  }
  if(startPadX){
    //col /= vec3(1,1,0);
  }
  if(startPadY){
    //col /= vec3(1,1,0);
  }
  //Unused cells
  if(gl_FragCoord.x > tileRows * tileSize || gl_FragCoord.y > tileRows * tileSize){
    col = vec3(0,0,0);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

//****************** Canvas shaders ******************

var canvasVertexSource = `
attribute vec2 texPosition;
varying vec2 texCoord;

void main() {
  // map texture coordinates [0, 1] to world coordinates [-1, 1]
  // convert from 0->1 to 0->2
  // convert from 0->2 to -1->+1 (clipspace)

  texCoord = texPosition;
  gl_Position = vec4(texPosition*2.0-1.0, 0.0, 1.0);
}
`;

var canvasFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D srcData;
uniform sampler2D blurData;

void main() {
  vec4 srcColour = texture2D(srcData, texCoord);
  gl_FragColor = srcColour;
}
`;

//****************** Utility functions ******************

//Compile shader and canvas with source
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
// Utility to complain loudly if we fail to find the attribute
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Can not find attribute ' + name + '.';
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  var attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Can not find uniform ' + name + '.';
  }
  return attributeLocation;
}

function createAndSetupTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

//****************** Create shaders ******************

//Create vertex and fragment shaders
var noiseVertexShader = compileShader(noiseVertexSource, gl.VERTEX_SHADER);
var noiseFragmentShader = compileShader(noiseFragmentSource, gl.FRAGMENT_SHADER);

var canvasVertexShader = compileShader(canvasVertexSource, gl.VERTEX_SHADER);
var canvasFragmentShader = compileShader(canvasFragmentSource, gl.FRAGMENT_SHADER);


// Create shader programs
var noise_program = gl.createProgram();
gl.attachShader(noise_program, noiseVertexShader);
gl.attachShader(noise_program, noiseFragmentShader);
gl.linkProgram(noise_program);

var canvas_program = gl.createProgram();
gl.attachShader(canvas_program, canvasVertexShader);
gl.attachShader(canvas_program, canvasFragmentShader);
gl.linkProgram(canvas_program);

//Set up rectangle covering entire canvas 
var vertexData = new Float32Array([
    -1.0,  1.0, // top left
    -1.0, -1.0, // bottom left
    1.0,  1.0, // top right
    1.0, -1.0, // bottom right
]);

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// To make the geometry information available in the shader as attributes, we
// need to tell WebGL what the layout of our data in the vertex buffer is.
var positionHandle = getAttribLocation(noise_program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
    2, // position is a vec2 (2 values per component)
    gl.FLOAT, // each component is a float
    false, // don't normalize values
    2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 // how many bytes inside the buffer to start from
    );

//Set uniform handles
var timeHandle = getUniformLocation(noise_program, 'time');
var srcLocation = gl.getUniformLocation(canvas_program, "srcData");

//Create and bind frame buffer
var noiseFramebuffer = gl.createFramebuffer();
noiseFramebuffer.width = WIDTH;
noiseFramebuffer.height = HEIGHT;
gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFramebuffer);

//Create and bind texture
var noiseTexture = createAndSetupTexture(gl);

//Allocate/send over empty texture data
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noiseFramebuffer.width, noiseFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

//Assign texture as framebuffer colour attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTexture, 0);

var blurFBO = [];
var blurTexture = [];

for(i = 0; i < 2; i++){
  var framebuffer = gl.createFramebuffer();
  framebuffer.width = WIDTH;
  framebuffer.height = HEIGHT;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  var texture = createAndSetupTexture(gl);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  blurFBO.push(framebuffer);
  blurTexture.push(texture);
}

//****************** Main render loop ******************

//WebGL works like a state machine. Data is read from the last texture that was bound,
//using bindTexture, and written into the last framebuffer that was bound,
//using bindFramebuffer (and thereby into the texture bound to that frame buffer). 
//Binding to null displays onto the canvas (which is treated as a texture). 


function isVisible(obj){
  var clientRect = obj.getBoundingClientRect();
  return (clientRect.y > -clientRect.height/2) && (clientRect.y < clientRect.height/2);
}

function step(){

  //Unbind any textures
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.activeTexture(gl.TEXTURE0);

  //Update time
  time += dt;

  //Draw noises
  gl.useProgram(noise_program);
  //Send time to program
  gl.uniform1f(timeHandle, time);
  //Render to texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFramebuffer);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


  //Combine original and blurred image 
  gl.useProgram(canvas_program);

  //Draw to canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.uniform1i(srcLocation, 0);  // texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  //requestAnimationFrame(step);
}

step();
