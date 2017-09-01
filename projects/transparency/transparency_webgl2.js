var canvas = document.getElementById("canvas_1");

canvas.width = canvas.clientWidth;
canvas.height = canvas.width/1.6;;

var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.0};
var mouseDelta = {x: 0, y: 0};
var isMouseDown = false;

var lastPos = {x: mousePosition.x, y: mousePosition.y};


var yaw = Math.PI/4.0;
var pitch = 0.0;
var dist = 10.0;
var cameraPosition = {x: 1, y: 0, z: 1};
var numCubes = 40;

var positions = [];

for(let i = 0; i < numCubes; i++){
  let x_ = 2*Math.random()-1.0;
  let y_ = 2*Math.random()-1.0;
  let z_ = 2*Math.random()-1.0;
  let scale = 15;
  positions.push({x: scale*x_, y: scale*y_, z: scale*z_});
}

var rotations = [];

for(let i = 0; i < numCubes; i++){
  let x_ = 2*Math.random()-1.0;
  let y_ = 2*Math.random()-1.0;
  let z_ = 2*Math.random()-1.0;
  let scale = 5;
  rotations.push({x: scale*x_, y: scale*y_, z: scale*z_});
}
// Initialize the GL context
var gl = canvas.getContext('webgl2', {
  //premultipliedAlpha: false
});
if(!gl){
  console.error("Unable to initialize WebGL 2.");
}

const ext = gl.getExtension("EXT_color_buffer_float");
if (!ext) {
  console.log("need EXT_color_buffer_float");
}

//4 vertices per face
const vertices = new Float32Array([
    // Front face
    -1.0, -1.0,  1.0,
    1.0, -1.0,  1.0,
    1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
    1.0,  1.0,  1.0,
    1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0,  1.0,  1.0,
    1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
    ]);

const vertexNormals = [
  // Front
  0.0,  0.0,  1.0,
  0.0,  0.0,  1.0,
  0.0,  0.0,  1.0,
  0.0,  0.0,  1.0,

  // Back
  0.0,  0.0, -1.0,
  0.0,  0.0, -1.0,
  0.0,  0.0, -1.0,
  0.0,  0.0, -1.0,

  // Top
  0.0,  1.0,  0.0,
  0.0,  1.0,  0.0,
  0.0,  1.0,  0.0,
  0.0,  1.0,  0.0,

  // Bottom
  0.0, -1.0,  0.0,
  0.0, -1.0,  0.0,
  0.0, -1.0,  0.0,
  0.0, -1.0,  0.0,

  // Right
  1.0,  0.0,  0.0,
  1.0,  0.0,  0.0,
  1.0,  0.0,  0.0,
  1.0,  0.0,  0.0,

  // Left
  -1.0,  0.0,  0.0,
  -1.0,  0.0,  0.0,
  -1.0,  0.0,  0.0,
  -1.0,  0.0,  0.0
  ];

  const faceColors = [
    [1.0,  1.0,  1.0,  1.0],    // Front face: white
    [1.0,  0.0,  0.0,  1.0],    // Back face: red
    [0.0,  1.0,  0.0,  1.0],    // Top face: green
    [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
    [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
    [1.0,  0.0,  1.0,  1.0],    // Left face: purple
  ];

const indices = [
  0,  1,  2,      0,  2,  3,    // front
  4,  5,  6,      4,  6,  7,    // back
  8,  9,  10,     8,  10, 11,   // top
  12, 13, 14,     12, 14, 15,   // bottom
  16, 17, 18,     16, 18, 19,   // right
  20, 21, 22,     20, 22, 23,   // left
];


//Time
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
  return {x: a.y * b.z - a.z * b.y,
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

var vertexSource = `#version 300 es
//Attributes get optimised out when not used. Looking for the attribute location will then return -1.
  in vec3 position;
  in vec4 vertexColour;
  in vec3 vertexNormal;
  uniform mat4 modelMatrix;
  uniform mat4 normalMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  out vec3 vCol;
  out vec3 vNorm;
  void main(){
    vCol = vec3(1,0,0);//vertexColour.rgb;
    vertexColour.rgb;
  
    vec4 transformedNormal = normalMatrix * vec4(vertexNormal, 0.0);
    vNorm = transformedNormal.xyz;
  
    vec4 pos = projectionMatrix * viewMatrix * modelMatrix *  vec4(position, 1.0);
    gl_Position = vec4(pos);
  }
`;

var fragmentSource = `#version 300 es
  precision highp float;
  
  in vec3 vCol;
  in vec3 vNorm;
  layout(location=0) out vec4 fragColour;
  
  uniform float width;
  uniform float height;
  
  uniform float colour;
  
  void main(){
  
    vec3 lightDirection = normalize(vec3(100, 50, 200));
    float diff = max(dot(normalize(vNorm), lightDirection), 0.0);
  
    vec3 c;

    if( colour == 1.0){
      c = vec3(0.1, 1.0, 1.0);
    }else if (colour == 2.0){
      c = vec3(1.0, 1.1, 0.3);
    }else{
      c = vec3(0.5, 0.5, 0.5);
    }

    vec3 col = c * 0.5 + diff * c;
    float alpha = 1.;

    //Output to screen
    fragColour = vec4(alpha*col, alpha);
  }
`;

//****************** Alpha shaders ******************

var alphaFragmentSource = `#version 300 es
  precision highp float;

  layout(location=0) out vec4 fragColour;
  
  void main(){
    float alpha = 1.;

    //Output to screen
    fragColour = vec4(alpha);
  }
`;

//****************** Combine shaders ******************

var combineVertexSource = `#version 300 es
  
  in vec2 pos;
  
  void main() { 
    gl_Position = vec4(pos, 0.0, 1.0);
  }
`;

var combineFragmentSource = `#version 300 es
  
  precision highp float;
  
  out vec4 fragColour;
  uniform sampler2D srcData0;
  uniform sampler2D srcData1;
  
  void main() {
    vec4 srcColour = texelFetch(srcData0, ivec2(gl_FragCoord.xy), 0).rgba;
    float srcAlpha = texelFetch(srcData1, ivec2(gl_FragCoord.xy), 0).r;
    vec3 col = vec3(0);
    vec3 data = srcColour.rgb/srcColour.a;
    fragColour = vec4(col * srcAlpha + data , 1.0);
    //fragColour = vec4(col * srcAlpha + data * (1.0-srcAlpha), 1.0);
  }
`;


//************** Utility functions **************

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
  gl.uniform1f(widthHandle, canvas.width);
  gl.uniform1f(heightHandle, canvas.height);
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
  var attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Cannot find uniform ' + name + '.';
  }
  return attributeLocation;
}

//************** Create shaders **************

//Create vertex and fragment shaders
var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);
var alphaFragmentShader = compileShader(alphaFragmentSource, gl.FRAGMENT_SHADER);

//Create shader programs
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

var alphaProgram = gl.createProgram();
gl.attachShader(alphaProgram, vertexShader);
gl.attachShader(alphaProgram, fragmentShader);
gl.linkProgram(alphaProgram);

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
var positionHandle = getAttribLocation(program, 'position');

//var vao = gl.createVertexArray();/gl.bindVertexArray(vao);
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
    3, 			// position is a vec3
    gl.FLOAT, 		// each component is a float
    false, 		// don't normalize values
    0, 		// three 4 byte float components per vertex (32 bit float is 4 bytes)
    0 			// how many bytes inside the buffer to start from
    );

var normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

var vertexNormalHandle = getAttribLocation(program, 'vertexNormal');

gl.enableVertexAttribArray(vertexNormalHandle);
gl.vertexAttribPointer(vertexNormalHandle,
    3, 			// normal is a vec3
    gl.FLOAT, 		// each component is a float
    false, 		// don't normalize values
    0, 		// three 4 byte float components per vertex (32 bit float is 4 bytes)
    0 			// how many bytes inside the buffer to start from
    );

// Convert the array of colors into a table for all the vertices.

var colors = [];

for (var j = 0; j < faceColors.length; j++) {
  const c = faceColors[j];

  // Repeat each color four times for the four vertices of the face
  colors = colors.concat(c, c, c, c);
}

var colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
var vertexColourHandle = getAttribLocation(program, 'vertexColour');
gl.enableVertexAttribArray(vertexColourHandle);

gl.vertexAttribPointer(vertexColourHandle,
    4,
    gl.FLOAT,
    false,
    0,
    0);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
// Tell WebGL which indices to use to index the vertices
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

//Create and bind frame buffer
var framebuffer = gl.createFramebuffer();
framebuffer.width = canvas.width;
framebuffer.height = canvas.height;
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

var targetTexture0 = createAndSetupTexture(gl);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture0, 0);

var alphaFramebuffer = gl.createFramebuffer();
alphaFramebuffer.width = canvas.width;
alphaFramebuffer.height = canvas.height;
gl.bindFramebuffer(gl.FRAMEBUFFER, alphaFramebuffer);
var targetTexture1 = createAndSetupTexture(gl);
//var pixel = new Float32Array([1.0, 1.0, 1.0, 1.0]);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, alphaFramebuffer.width, alphaFramebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture1, 0);

//Set uniform handle
var colHandle = getUniformLocation(program, 'colour');
var projectionMatrixHandle = getUniformLocation(program, 'projectionMatrix');
var viewMatrixHandle = getUniformLocation(program, 'viewMatrix');
var modelMatrixHandle = getUniformLocation(program, 'modelMatrix');
var normalMatrixHandle = getUniformLocation(program, 'normalMatrix');

var alphaProjectionMatrixHandle = getUniformLocation(alphaProgram, 'projectionMatrix');
var alphaViewMatrixHandle = getUniformLocation(alphaProgram, 'viewMatrix');
var alphaModelMatrixHandle = getUniformLocation(alphaProgram, 'modelMatrix');
var alphaNormalMatrixHandle = getUniformLocation(alphaProgram, 'normalMatrix');

var combine_program = gl.createProgram();
var combineVertexShader = compileShader(combineVertexSource, gl.VERTEX_SHADER);
var combineFragmentShader = compileShader(combineFragmentSource, gl.FRAGMENT_SHADER);
gl.attachShader(combine_program, combineVertexShader);
gl.attachShader(combine_program, combineFragmentShader);
gl.linkProgram(combine_program);
gl.useProgram(combine_program);
//Set up rectangle covering entire canvas 
var vertexData = new Float32Array([
    -1.0,  1.0, // top left
    -1.0, -1.0, // bottom left
    1.0,  1.0, // top right
    1.0, -1.0, // bottom right
]);

//Create vertex buffer
var combineVertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, combineVertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
var combinePositionHandle = getAttribLocation(combine_program, 'pos');
gl.enableVertexAttribArray(combinePositionHandle);
gl.vertexAttribPointer(combinePositionHandle,
    2, 			// position is a vec2 (2 values per component)
    gl.FLOAT, 		// each component is a float
    false, 		// don't normalize values
    2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 			// how many bytes inside the buffer to start from
    );
var srcLocation0 = gl.getUniformLocation(combine_program, 'srcData0');
var srcLocation1 = gl.getUniformLocation(combine_program, 'srcData1');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');
gl.uniform1f(widthHandle, canvas.width);
gl.uniform1f(heightHandle, canvas.height);

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

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  gl.uniformMatrix4fv(projectionMatrixHandle, false, projectionMatrix);
  gl.uniformMatrix4fv(viewMatrixHandle, false, viewMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle,
      3, 			// position is a vec3
      gl.FLOAT, 		// each component is a float
      false, 		// don't normalize values
      0, 		// three 4 byte float components per vertex (32 bit float is 4 bytes)
      0 			// how many bytes inside the buffer to start from
      );

  gl.clearColor(0, 0, 0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.disable(gl.DEPTH_TEST);           // Enable depth testing

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  for(let i = 0; i < numCubes; i++){
    gl.uniform1f(colHandle, i%3);
    var modelMatrix = m4.create();
    modelMatrix = m4.scale(modelMatrix, 1.0, 2.0, 1.0); 
    modelMatrix = m4.translate(modelMatrix, positions[i].x, 0.0, positions[i].z); 
    //modelMatrix = m4.xRotate(modelMatrix, rotations[i].x);
    //modelMatrix = m4.yRotate(modelMatrix, rotations[i].y);
    //modelMatrix = m4.zRotate(modelMatrix, rotations[i].z); 

    var normalMatrix = m4.create();
    m4.invert(normalMatrix, modelMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(normalMatrixHandle, false, normalMatrix);
    gl.uniformMatrix4fv(modelMatrixHandle, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }



  //************* ALPHA **************//

  gl.useProgram(alphaProgram);

  gl.bindFramebuffer(gl.FRAMEBUFFER, alphaFramebuffer);

  gl.uniformMatrix4fv(alphaProjectionMatrixHandle, false, projectionMatrix);
  gl.uniformMatrix4fv(alphaViewMatrixHandle, false, viewMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle,
      3, 			// position is a vec3
      gl.FLOAT, 		// each component is a float
      false, 		// don't normalize values
      0, 		// three 4 byte float components per vertex (32 bit float is 4 bytes)
      0 			// how many bytes inside the buffer to start from
      );

  gl.clearColor(1, 1, 1, 1);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.disable(gl.DEPTH_TEST);           // Enable depth testing

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);

  for(let i = 0; i < numCubes; i++){
    var modelMatrix = m4.create();
    modelMatrix = m4.scale(modelMatrix, 1.0, 2.0, 1.0); 
    modelMatrix = m4.translate(modelMatrix, positions[i].x, 0.0, positions[i].z); 
    //modelMatrix = m4.scale(1.0, 10.0, 1.0); 
    //modelMatrix = m4.xRotate(modelMatrix, rotations[i].x);
    //modelMatrix = m4.yRotate(modelMatrix, rotations[i].y);
    //modelMatrix = m4.zRotate(modelMatrix, rotations[i].z); 

    var normalMatrix = m4.create();
    m4.invert(normalMatrix, modelMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(alphaNormalMatrixHandle, false, normalMatrix);
    gl.uniformMatrix4fv(alphaModelMatrixHandle, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }

  //Combine original and blurred image 
  gl.useProgram(combine_program);

  //Draw to canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, targetTexture0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, targetTexture1);
  gl.uniform1i(srcLocation0, 0);  // texture unit 0
  gl.uniform1i(srcLocation1, 1);  // texture unit 1

  gl.clearColor(0.9, 0.9, 0.9, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, combineVertexDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(combinePositionHandle);
  gl.vertexAttribPointer(combinePositionHandle, 2, gl.FLOAT, false, 2 * 4, 0);

  gl.disable(gl.BLEND);
  //gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);
  //gl.blendFunc(gl.ONE, gl.ZERO);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
