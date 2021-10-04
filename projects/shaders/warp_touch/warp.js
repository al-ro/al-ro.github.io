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
uniform vec2 direction;

void main(){

  float t = time * 0.3;
  float strength = 0.4;
 
  vec3 col = vec3(0);
  
  for(int i = -1; i <= 1; i++) {
    for(int j = -1; j <= 1; j++) {
 
      vec2 fC = gl_FragCoord.xy + vec2(i, j) / 3.0;
      
      //Normalized pixel coordinates (from 0 to 1)
      vec2 pos = fC/resolution.xy;
      
      pos.y /= resolution.x/resolution.y;
      pos = 3.0 * (vec2(0.5) - pos);
      
      for(float k = 1.0; k < 7.0; k += 1.0){ 
      	pos.x += direction.x * strength * sin(2.0 * t + k * 1.5 * pos.y) + t * 0.5;
      	pos.y += direction.y * strength * cos(2.0 * t + k * 1.5 * pos.x);
      }
      
      //Time varying pixel colour
      col += 0.5 + 0.5 * cos(time + pos.xyx + vec3(0, 2, 4));
      
    }
  }
  
  col /= 9.0;

  //Gamma
  col = pow(col, vec3(0.4545));
  
  //Fragment colour
  gl_FragColor = vec4(col,1.0);
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
var directionHandle = getUniformLocation(program, 'direction');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.useProgram(program);
gl.uniform1f(widthHandle, canvas.width);
gl.uniform1f(heightHandle, canvas.height);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);

var lastFrame = Date.now();
var thisFrame;

var direction = [1, 1];

function draw(){
  thisFrame = Date.now();

  if(animate){
    direction[0] = (2.0*mousePos.x/canvas.width-1.0);
    direction[1] = (2.0*mousePos.y/canvas.height-1.0);
  }else{
    direction = [1, 1];
  }

  time += (thisFrame - lastFrame) / 1000;	
  lastFrame = thisFrame;

  gl.useProgram(program);
  gl.uniform1f(timeHandle, time);
  gl.uniform2fv(directionHandle, direction);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  requestAnimationFrame(draw);
}

draw();
