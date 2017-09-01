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
uniform int animate;
uniform vec2 mousePos;

//Base values modified with depth later
float intensity = 1.0;
float radius = 0.025;

//Distance functions from 
//https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
float triangleDist(vec2 p){ 
  const float k = sqrt(3.0);
  p.x = abs(p.x) - 1.0;
  p.y = p.y + 1.0 / k;
  if( p.x + k * p.y > 0.0 ){
    p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  }
  p.x -= clamp( p.x, -2.0, 0.0 );
  return -length(p) * sign(p.y);
}

float boxDist(vec2 p){
  vec2 d = abs(p) - 1.0;
  return length(max(d, vec2(0))) + min(max(d.x, d.y), 0.0);
}

float circleDist(vec2 p){
  return length(p) - 1.0;
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
  return pow(radius/dist, intensity);
}

vec3 ACESFilm(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy/resolution.xy;
  float widthHeightRatio = resolution.x/resolution.y;
  vec2 centre;
  vec2 pos;

  float t = time * 0.05;

  float dist;
  float glow;
  vec3 col = vec3(0);

  //The spacing between shapes
  float scale = 500.0;

  //Number of shapes
  const int layers = 15;

  float depth;
  vec2 bend;

  vec3 purple = vec3(0.611, 0.129, 0.909);
  vec3 green = vec3(0.133, 0.62, 0.698);

  float rotationAngle;
  mat2 rotation;

  vec2 m = normalize(mousePos);
  float angle;

  if(animate == 1){
    angle = atan(m.y, m.x);
  }else{
    angle = 2.5 * (sin(t) + sin(3.0 * t));
  }

  //Create an out of frame anchor point where all shapes converge to    
  vec2 anchor = 0.5 + vec2(cos(angle), sin(angle));

  //Create light purple glow at the anchor location
  pos = anchor - uv;
  pos.y /= widthHeightRatio;
  dist = length(pos);
  glow = getGlow(dist, 0.25, 3.5);
  col += glow * vec3(0.6, 0.4, 1.0);

  //Move the focus of the camera in a circle
  centre = 0.5 + vec2(0.2 * sin(10.0*t), 0.2 * cos(10.0*t));

  for(int i = 0; i < layers; i++){

    float layerFraction = float(i) / float(layers);

    //Time varying depth information depending on layer
    depth = fract(layerFraction + t);

    //Position shapes between the anchor and the camera focus based on depth
    bend = mix(anchor, centre, depth);

    pos = bend - uv;
    pos.y /= widthHeightRatio;

    //Rotate shapes
    rotationAngle = 3.1415 * sin(depth + fract(t) * 6.283) + float(i);
    rotation = mat2(cos(rotationAngle), -sin(rotationAngle), sin(rotationAngle), cos(rotationAngle));

    pos *= rotation;

    //Position shapes according to depth
    pos *= mix(scale, 0.0, depth);

    float m = mod(float(i), 3.0);
    if(m == 0.0){
      dist = abs(boxDist(pos));
    }else if(m == 1.0){
      dist = abs(triangleDist(pos));
    }else{
      dist = abs(circleDist(pos));
    }

    //Get glow from base radius and intensity modified by depth
    glow = getGlow(dist, radius + (1.0 - depth) * 2.0, intensity + depth);

    //Find angle along shape and map from [-PI; PI] to [0; 1]
    float a = (atan(pos.y, pos.x) + 3.1415) / 6.283;
    //Shift angle depending on layer and map to [1...0...1]
    a = abs((2.0 * fract(a + layerFraction)) - 1.0);

    //Glow according to angle value
    col += glow * mix(green, purple, a);
  }

  col = ACESFilm(col);
  col = pow(col, vec3(0.4545));

  //Output to screen
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
var mousePosHandle = getUniformLocation(program, 'mousePos');
var animateHandle = getUniformLocation(program, 'animate');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.useProgram(program);
gl.uniform1f(widthHandle, canvas.width);
gl.uniform1f(heightHandle, canvas.height);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);

var lastFrame = Date.now();
var thisFrame;

var speed = 1.0;

function draw(){
  thisFrame = Date.now();

  if(animate){
    speed = 4.0 * Math.hypot(2.0*mousePos.x/canvas.width-1.0, 2.0*mousePos.y/canvas.height-1.0);
  }else{
    speed = 1.0;
  }

  time += speed * (thisFrame - lastFrame) / 1000;
  lastFrame = thisFrame;

  gl.useProgram(program);
  gl.uniform1f(timeHandle, time);
  if(animate){
    gl.uniform2fv(mousePosHandle, [(2.0*mousePos.x/canvas.width-1.0), -(2.0*mousePos.y/canvas.height-1.0)]);
  }
  gl.uniform1i(animateHandle, animate ? 1 : 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  requestAnimationFrame(draw);
}

draw();
