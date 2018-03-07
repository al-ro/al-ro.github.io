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
    //|| navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

var WIDTH = 600;
var HEIGHT = canvas.height;

// Initialize the GL context
var gl = canvas.getContext('webgl');

if(!gl){
  alert("Unable to initialize WebGL.");
}
//Time step
var dt = 0.03;
//Time
var time = 0.0;
var bloom = 20;
var blurFactor = 6;
var blurCount = 5;
if(mobile){
  blurCount = 3;
}
//For colour modes
var type = 0;

//-----------GUI-----------//
//dat.gui library controls
var red_button = { red:function(){
  type = 0;
}};
var green_button = { green:function(){
  type = 1;
}};
var blue_button = { blue:function(){
  type = 2;
}};
var gradient_button = { gradient:function(){
  type = 3;
}};


var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'dt').min(0.0).max(0.05).step(0.005).listen();
gui.add(this, 'bloom').min(0.0).max(100.0).step(10).listen();
gui.add(this, 'blurFactor').min(0.0).max(6.0).step(1).listen();
gui.add(red_button, 'red');
gui.add(green_button, 'green');
gui.add(blue_button, 'blue');
gui.add(gradient_button, 'gradient');
gui.close();

function setSize(){
  material.size = size;
}

function setColour(){
  material.color.setHex(colour);
}



//GLSL code is presented as a string that is passed for compilation. 
//Can use quotes (' or "), which require escaping newline, or backtick (`), which doesn't.

//****************** Flame shaders ******************
//Specify vertex shader. (x,y) coordinates are variable, z is 0
var flameVertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

//Specify fragment shader. Set colour
var flameFragmentSource = `
precision highp float;
const float WIDTH = ` + WIDTH + `.0;
const float HEIGHT = ` + HEIGHT + `.0;
uniform float time;
uniform int type;

/*** WEBGL-NOISE FROM https://github.com/stegu/webgl-noise ***/

// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
{
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
      -0.577350269189626,  // -1.0 + 2.0 * C.x
      0.024390243902439); // 1.0 / 41.0
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

/*** END WEBGL-NOISE ***/

void main() {
  float x = gl_FragCoord.x/(WIDTH);
  float y = gl_FragCoord.y/(WIDTH);
  float gradient = gl_FragCoord.y/(HEIGHT);

  //Create red to yellow gradient for flame
  float r = 1.0;
  float g = 0.0;
  float b = 0.0;

  //Get noise value at location with some mixing
  float noise = snoise(vec2(x/10.0,y/10.0 + 11.0));
  noise += gradient * snoise(vec2(x*2.0,y*2.0 + 1.5 * time));
  noise += gradient * snoise(vec2(x*3.0,y*3.0 + 2.0 * time));
  noise += gradient * snoise(vec2(x*6.0,y*6.0 + 3.0 * time));

  noise = max(0.0, noise);
  
  //Set colour mode
  if(type == 0){
    //Red to yello
    g = 3.0 * noise * (gradient);
    b = noise * (gradient)/2.0; 
  }else if(type == 1){
    //Green
    r = noise * (gradient);
    g = 1.0;
    b = noise * (gradient)/2.0; 
  }else if(type == 2){
    //Blue
    r = noise * (gradient)/2.0; 
    g = 3.0 * noise * (gradient);
    b = 1.0; 
  }else if(type == 3){
    //Blue to magenta to yellow
    r = 3.0 * noise * (gradient * 10.0);
    g = noise * (gradient);
    b = 0.5 - gradient; 
  }

  noise *= 0.65*(1.0-gradient);

  //m = 1.0 if (gradient * 0.5) < noise, 0.0 otherwise.
  float m = step(gradient * 0.5, noise);

  gl_FragColor = vec4(m * r, m * g, m * b, 1.0);
}
`;

//****************** Blur shaders ******************

//Apply Gaussian blur with stencil size 11
//Based on a tutorial by ThinMatrix
var blurXVertexSource = `
attribute vec2 texPosition;
varying vec2 blurTextureCoords[11];
uniform float width;

void main() {
  //texCoord = texPosition;
  gl_Position = vec4(texPosition, 0.0, 1.0);
  vec2 centreTexCoords = texPosition * 0.5 + 0.5;
  float pixelSize = 1.0/width;

  for(int i = -5; i <= 5; i++){
    blurTextureCoords[i+5] = centreTexCoords + vec2(pixelSize * float(i), 0.0);
  }
}
`;

var blurYVertexSource = `
attribute vec2 texPosition;
varying vec2 blurTextureCoords[11];
uniform float height;

void main() {
  gl_Position = vec4(texPosition, 0.0, 1.0);
  vec2 centreTexCoords = texPosition * 0.5 + 0.5;
  float pixelSize = 1.0/height;

  for(int i = -5; i <= 5; i++){
    blurTextureCoords[i+5] = centreTexCoords + vec2(0.0, pixelSize * float(i));
  }
}
`;

var blurFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D texData;

varying vec2 blurTextureCoords[11];

void main() {
  vec4 colour = vec4(0.0);
  colour += texture2D(texData, blurTextureCoords[0]) * 0.0093;
  colour += texture2D(texData, blurTextureCoords[1]) * 0.028002;
  colour += texture2D(texData, blurTextureCoords[2]) * 0.065984;
  colour += texture2D(texData, blurTextureCoords[3]) * 0.121703;
  colour += texture2D(texData, blurTextureCoords[4]) * 0.175713;
  colour += texture2D(texData, blurTextureCoords[5]) * 0.198596;
  colour += texture2D(texData, blurTextureCoords[6]) * 0.175713;
  colour += texture2D(texData, blurTextureCoords[7]) * 0.121703;
  colour += texture2D(texData, blurTextureCoords[8]) * 0.065984;
  colour += texture2D(texData, blurTextureCoords[9]) * 0.028002;
  colour += texture2D(texData, blurTextureCoords[10]) * 0.0093;
  gl_FragColor = colour;
}
`;


//****************** Bright shaders ******************

//Select only bright pixels in the domain
//Based on a tutorial by ThinMatrix
var brightVertexSource = `
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

var brightFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D brightData;
uniform float bloom;

void main() {
  vec4 colour = texture2D(brightData, texCoord);
  float brightness = (colour.r * 0.2126) + (colour.g * 0.7152) + (colour.b * 0.0722);
  gl_FragColor = colour * (brightness * bloom);
}
`;

//****************** Combine shaders ******************

var combineVertexSource = `
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

var combineFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D srcData;
uniform sampler2D blurData;

void main() {
  vec4 srcColour = texture2D(srcData, texCoord);
  vec4 blurColour = texture2D(blurData, texCoord);
  gl_FragColor = srcColour + blurColour;
}
`;

//****************** Utility functions ******************

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
var flameVertexShader = compileShader(flameVertexSource, gl.VERTEX_SHADER);
var flameFragmentShader = compileShader(flameFragmentSource, gl.FRAGMENT_SHADER);

var combineVertexShader = compileShader(combineVertexSource, gl.VERTEX_SHADER);
var combineFragmentShader = compileShader(combineFragmentSource, gl.FRAGMENT_SHADER);

var x_blurVertexShader = compileShader(blurXVertexSource, gl.VERTEX_SHADER);
var x_blurFragmentShader = compileShader(blurFragmentSource, gl.FRAGMENT_SHADER);

var y_blurVertexShader = compileShader(blurYVertexSource, gl.VERTEX_SHADER);
var y_blurFragmentShader = compileShader(blurFragmentSource, gl.FRAGMENT_SHADER);

var brightVertexShader = compileShader(brightVertexSource, gl.VERTEX_SHADER);
var brightFragmentShader = compileShader(brightFragmentSource, gl.FRAGMENT_SHADER);

// Create shader programs
var flame_program = gl.createProgram();
gl.attachShader(flame_program, flameVertexShader);
gl.attachShader(flame_program, flameFragmentShader);
gl.linkProgram(flame_program);

var x_blur_program = gl.createProgram();
gl.attachShader(x_blur_program, x_blurVertexShader);
gl.attachShader(x_blur_program, x_blurFragmentShader);
gl.linkProgram(x_blur_program);

var y_blur_program = gl.createProgram();
gl.attachShader(y_blur_program, y_blurVertexShader);
gl.attachShader(y_blur_program, y_blurFragmentShader);
gl.linkProgram(y_blur_program);

var bright_program = gl.createProgram();
gl.attachShader(bright_program, brightVertexShader);
gl.attachShader(bright_program, brightFragmentShader);
gl.linkProgram(bright_program);

var combine_program = gl.createProgram();
gl.attachShader(combine_program, combineVertexShader);
gl.attachShader(combine_program, combineFragmentShader);
gl.linkProgram(combine_program);

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
var positionHandle = getAttribLocation(flame_program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
    2, // position is a vec2 (2 values per component)
    gl.FLOAT, // each component is a float
    false, // don't normalize values
    2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 // how many bytes inside the buffer to start from
    );

//Set uniform handles
var timeHandle = getUniformLocation(flame_program, 'time');
var typeHandle = getUniformLocation(flame_program, 'type');
var widthHandle = getUniformLocation(x_blur_program, 'width');
var heightHandle = getUniformLocation(y_blur_program, 'height');
var srcLocation = gl.getUniformLocation(combine_program, "srcData");
var blurLocation = gl.getUniformLocation(combine_program, "blurData");
var brightLocation = gl.getUniformLocation(bright_program, "brightData");
var bloomHandle = gl.getUniformLocation(bright_program, "bloom");

//Create and bind frame buffer
var flameFramebuffer = gl.createFramebuffer();
flameFramebuffer.width = canvas.width;
flameFramebuffer.height = canvas.height;
gl.bindFramebuffer(gl.FRAMEBUFFER, flameFramebuffer);

//Create and bind texture
var flameTexture = createAndSetupTexture(gl);

//Allocate/send over empty texture data
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, flameFramebuffer.width, flameFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

//Assign texture as framebuffer colour attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flameTexture, 0);

var blurFBO = [];
var blurTexture = [];

for(i = 0; i < 2; i++){
  var framebuffer = gl.createFramebuffer();
  framebuffer.width = canvas.width;
  framebuffer.height = canvas.height;
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

function step(){

  //Unbind any textures
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.activeTexture(gl.TEXTURE0);

  //Update time
  time -= dt;

  //Draw flames
  gl.useProgram(flame_program);
  //Send time to program
  gl.uniform1f(timeHandle, time);
  gl.uniform1i(typeHandle, type);
  //Render to texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, flameFramebuffer);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  //Bright pass filter to select only light pixels
  gl.useProgram(bright_program);
  gl.uniform1f(bloomHandle, bloom);
  gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO[0]);
  gl.bindTexture(gl.TEXTURE_2D, flameTexture);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  //Blur the result of the bright filter
  for(i = 1; i < blurCount; i++){
    gl.useProgram(x_blur_program);
    gl.uniform1f(widthHandle, WIDTH/(i * blurFactor));
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO[1]);
    gl.bindTexture(gl.TEXTURE_2D, blurTexture[0]);
    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(y_blur_program);
    gl.uniform1f(heightHandle, HEIGHT/(i * blurFactor));
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO[0]);
    gl.bindTexture(gl.TEXTURE_2D, blurTexture[1]);
    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  //Combine original and blurred image 
  gl.useProgram(combine_program);

  //Draw to canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.uniform1i(srcLocation, 0);  // texture unit 0
  gl.uniform1i(blurLocation, 1);  // texture unit 1
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, flameTexture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, blurTexture[0]);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(step);
}

step();
