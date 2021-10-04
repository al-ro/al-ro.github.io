var canvas = document.getElementById("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var gl = canvas.getContext('webgl');
if(!gl){
  console.error("Unable to initialize WebGL");
}

var time = 0.0;
var animate = false;

var mousePos = {x: 0, y: 0};

//************** Shader sources **************

var vertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

var fragmentSource = `
precision highp float;

uniform float width;
uniform float height;
vec2 resolution = vec2(width, height);

uniform float time;

uniform vec3 colour0;
uniform vec3 colour1;
uniform vec3 colour2;
uniform vec3 colour3;

vec2 rotatePosition(vec2 pos, vec2 centre, float angle) {
  float sinAngle = sin(angle);
  float cosAngle = cos(angle);
  pos -= centre;
  vec2 rotatedPos;
  rotatedPos.x = pos.x * cosAngle - pos.y * sinAngle;
  rotatedPos.y = pos.x * sinAngle + pos.y * cosAngle;
  rotatedPos += centre;
  return rotatedPos;
}

void main(){

  const float PI = 3.1415;
  float amplitude = 0.9;
  float frequency = 0.5;

  //Repetition of stripe unit
  float tilingFactor = 8.0;

  vec3 col = vec3(0);

  for(int i = -1; i <= 1; i++) {
    for(int j = -1; j <= 1; j++) {

      vec2 fragmentCoord = gl_FragCoord.xy+vec2(i, j) / 3.0;

      //Normalized pixel coordinates (from 0 to 1)
      vec2 uv = fragmentCoord/resolution.xy;

      //The ratio of the width and height of the screen
      float widthHeightRatio = resolution.x/resolution.y;

      //Adjust vertical pos to make the width of the stripes 
      //transform uniformly regardless of orientation
      uv.y /= widthHeightRatio;

      //Rotate pos around centre by specified radians
      uv = rotatePosition(uv, vec2(0.5), PI * 0.25);

      //Move frame along rotated y direction
      uv.y += 0.35 * time;

      vec2 position = uv * tilingFactor;
      position.x += amplitude * sin(frequency * position.y);

      //Set stripe colours
      int value = int(floor(fract(position.x) * 4.0));

      if(value == 0){col += colour0;}
      if(value == 1){col += colour1;}
      if(value == 2){col += colour2;}
      if(value == 3){col += colour3;}

    }
  }

  col /= 9.0;

  //col = pow(col, vec3(0.4545));

  gl_FragColor = vec4(col, 1.0);
}
`;

//************** Utility functions **************

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.uniform1f(widthHandle, canvas.width);
  gl.uniform1f(heightHandle, canvas.height);
}

canvas.addEventListener('mouseleave', animateEnd);
canvas.addEventListener('mousemove', mouseTrack);

canvas.addEventListener("touchstart", touchMove);
canvas.addEventListener("touchmove", touchMove);
canvas.addEventListener("touchend", animateEnd);
canvas.addEventListener("touchcancel", animateEnd);

function animateStart() {
  animate = true;
}

function animateEnd() {
  animate = false;
}

function mouseTrack(event) {
  animateStart();
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

function compileShader(shaderSource, shaderType){
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

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

//Create shader programs
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

//Set up rectangle covering entire canvas 
var vertexData = new Float32Array([-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0]);
var positionHandle = getAttribLocation(program, 'position');

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();

gl.enableVertexAttribArray(positionHandle);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 8, 0);

var timeHandle = getUniformLocation(program, 'time');
var colour0Handle = getUniformLocation(program, 'colour0');
var colour1Handle = getUniformLocation(program, 'colour1');
var colour2Handle = getUniformLocation(program, 'colour2');
var colour3Handle = getUniformLocation(program, 'colour3');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.useProgram(program);
gl.uniform1f(widthHandle, canvas.width);
gl.uniform1f(heightHandle, canvas.height);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);

var colour0 = [
  [0.140625, 0.4296875, 0.62265625],
  [0.34375, 0.4453125, 0.56640625], 
  [0.93359375, 0.97265625, 0.9375], 
  [0.96484375, 0.08984375, 0.20703125], 
  [0.390625, 0.4859375, 0.35234375],
  [0.85546875, 0.16796875, 0.22265625],
  [0.2, 0.378125, 0.45234375],
  [0.38671875, 0.515625, 0.45703125],
  [0.21875, 0.56640625, 0.6484375]];

var colour1 = [
  [0.9375, 0.39453125, 0.26171875], 
  [0.18359375, 0.58984375, 0.75390625], 
  [0.86328125, 0.78125, 0.765625], 
  [0.25390625, 0.9140625, 0.828125], 
  [0.26015625, 0.29921875, 0.359375], 
  [0.4375, 0.55078125, 0.50390625], 
  [0.97265625, 0.90234375, 0.515625], 
  [0.296875, 0.35546875, 0.359375]];

var colour2 = [
  [0.8828125, 0.20078125, 0.51953125], 
  [0.109375, 0.7890625, 0.84375], 
  [0.53515625, 0.4140625, 0.40234375], 
  [0.390625, 0.2859375, 0.35234375],
  [0.94921875, 0.65234375, 0.0703125], 
  [0.953125, 0.83203125, 0.55078125], 
  [0.89453125, 0.55859375, 0.39453125], 
  [0.98828125, 0.90234375, 0.296875]];

var colour3 = [
  [0.2484375, 0.4671875, 0.728125], 
  [0.08203125, 0.8984375, 0.80078125], 
  [0.41796875, 0.30078125, 0.33984375], 
  [0.98828125, 0.99609375, 0.984375], 
  [0.9375, 0.8046875, 0.625], 
  [0.74609375, 0.134375, 0.1171875], 
  [0.8125, 0.32421875, 0.32421875], 
  [0.85546875, 0.328125, 0.37890625]];

var c0;
var c1;
var c2;
var c3;

var default0 = [1.0, 0.256, 0.256];
var default1 = [1.0, 1.0, 0.0];    
var default2 = [0.481, 1.0, 0.481];
var default3 = [0.1, 0.696, 1.0];

var lastFrame = Date.now();
var thisFrame;

function draw(){
  thisFrame = Date.now();

  time += (thisFrame - lastFrame) / 1000;	
  lastFrame = thisFrame;

  if(animate){
  
    let i = Math.floor((8.0*Math.hypot(2.0*mousePos.x/canvas.width-1.0, 2.0*mousePos.y/canvas.height-1.0)) % 8);

    c0 = colour0[i];
    c1 = colour1[i];
    c2 = colour2[i];
    c3 = colour3[i];

  }else{
    c0 = default0;
    c1 = default1;
    c2 = default2;
    c3 = default3;
  }


  gl.useProgram(program);
  gl.uniform1f(timeHandle, time);
  gl.uniform3fv(colour0Handle, c0);
  gl.uniform3fv(colour1Handle, c1);
  gl.uniform3fv(colour2Handle, c2);
  gl.uniform3fv(colour3Handle, c3);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  requestAnimationFrame(draw);
}

draw();
