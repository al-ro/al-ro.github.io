const mobile = ( navigator.userAgent.match(/Android/i)
  || navigator.userAgent.match(/webOS/i)
  || navigator.userAgent.match(/iPhone/i)
  //|| navigator.userAgent.match(/iPad/i)
  || navigator.userAgent.match(/iPod/i)
  || navigator.userAgent.match(/BlackBerry/i)
  || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

if(mobile){
  canvas.width = 360;
  canvas.height = 225;
}

var WIDTH = Math.floor(0.9*canvas.width);
var HEIGHT = Math.floor(0.9*canvas.height);

// Initialize the GL context
var gl = canvas.getContext('webgl');

if(!gl){
  alert("Unable to initialize WebGL.");
}
//Time step
var dt = 0.025;
//Time
var time = 0.0;
var bloom = 20;
var blurFactor = 6;
var blurCount = 5;
//For colour modes
var type = 0;
var toggle_render = true;
if(mobile){
  toggle_render = false;
  bloom = 50;
  blurFactor= 3;
}

//-----------GUI-----------//
//dat.gui library controls
var toggle_render_button = { toggle_render:function(){
  toggle_render = !toggle_render;
}};
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
gui.add(toggle_render_button, 'toggle_render');
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

//****************** Kaleidoscope shaders ******************
//Specify vertex shader. (x,y) coordinates are variable, z is 0
var kaleidoscopeVertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position.x, position.y, 0.0, 1.0);
}
`;

//Specify fragment shader. Set colour
var kaleidoscopeFragmentSource = `
precision highp float;
void main() {
  float r = 0.5;
  float g = 0.5;
  float b = 1.0;
  gl_FragColor = vec4(r, g, b, 1.0);
  gl_FragColor = vec4(gl_FragCoord.x/500.0,
                        gl_FragCoord.y/400.0,
                        0.0, 1.0);
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

void main() {
  vec4 srcColour = texture2D(srcData, texCoord);
  gl_FragColor = srcColour;
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
var kaleidoscopeVertexShader = compileShader(kaleidoscopeVertexSource, gl.VERTEX_SHADER);
var kaleidoscopeFragmentShader = compileShader(kaleidoscopeFragmentSource, gl.FRAGMENT_SHADER);

var combineVertexShader = compileShader(combineVertexSource, gl.VERTEX_SHADER);
var combineFragmentShader = compileShader(combineFragmentSource, gl.FRAGMENT_SHADER);

// Create shader programs
var kaleidoscope_program = gl.createProgram();
gl.attachShader(kaleidoscope_program, kaleidoscopeVertexShader);
gl.attachShader(kaleidoscope_program, kaleidoscopeFragmentShader);
gl.linkProgram(kaleidoscope_program);

var combine_program = gl.createProgram();
gl.attachShader(combine_program, combineVertexShader);
gl.attachShader(combine_program, combineFragmentShader);
gl.linkProgram(combine_program);

//Vertex data for canvas
var vertexData = new Float32Array([
  -1.0,  1.0, // top left
  -1.0, -1.0, // bottom left
  1.0,  1.0, // top right
  1.0, -1.0, // bottom right
]);

//Vertex data for triangle
var triangleVertices = new Float32Array([
  0.0,  -0.25,
  -0.25, -1.0,
  0.25, -1.0,
]);


//Create vertex buffer for scene
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
//Create vertex buffer for triangle
var triangleDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, triangleDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

// To make the geometry information available in the shader as attributes, we
// need to tell WebGL what the layout of our data in the vertex buffer is.
var positionHandle = getAttribLocation(kaleidoscope_program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
  2, // position is a vec2 (2 values per component)
  gl.FLOAT, // each component is a float
  false, // don't normalize values
  2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
  0 // how many bytes inside the buffer to start from
);

//Set uniform handles
var timeHandle = getUniformLocation(kaleidoscope_program, 'time');
var typeHandle = getUniformLocation(kaleidoscope_program, 'type');

//Create and bind frame buffer
var kaleidoscopeFramebuffer = gl.createFramebuffer();
kaleidoscopeFramebuffer.width = canvas.width;
kaleidoscopeFramebuffer.height = canvas.height;
gl.bindFramebuffer(gl.FRAMEBUFFER, kaleidoscopeFramebuffer);

//Create and bind texture
var kaleidoscopeTexture = createAndSetupTexture(gl);

//Allocate/send over empty texture data
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, kaleidoscopeFramebuffer.width, kaleidoscopeFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

//Assign texture as framebuffer colour attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, kaleidoscopeTexture, 0);

//****************** Main render loop ******************

var iterations = 0;

function step(){

  //Update time
  time -= dt;

  gl.useProgram(kaleidoscope_program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, kaleidoscopeFramebuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle,
    2, // position is a vec2 (2 values per component)
    gl.FLOAT, // each component is a float
    false, // don't normalize values
    2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 // how many bytes inside the buffer to start from
  );

  //Draw kaleidoscopes
  //Send time to program
  gl.uniform1f(timeHandle, time);
  gl.uniform1i(typeHandle, type);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  
  gl.useProgram(combine_program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle,
    2, // position is a vec2 (2 values per component)
    gl.FLOAT, // each component is a float
    false, // don't normalize values
    2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 // how many bytes inside the buffer to start from
  );
  gl.bindTexture(gl.TEXTURE_2D, kaleidoscopeTexture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(step);
}

step();
