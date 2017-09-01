var canvas = document.getElementById("canvas_1");

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

#define POINT_COUNT 8

vec2 points[POINT_COUNT];

const float speed = -0.5;
const float len = 0.25;

float intensity = 1.1;
float radius = 0.01;

//https://www.shadertoy.com/view/MlKcDD
//Signed distance to a quadratic bezier
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;

  float kk = 1.0 / dot(b,b);
  float kx = kk * dot(a,b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);      

  float res = 0.0;

  float p = ky - kx * kx;
  float p3 = p * p * p;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float h = q * q + 4.0 * p3;

  if(h >= 0.0){ 
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = uv.x + uv.y - kx;
    t = clamp(t, 0.0, 1.0);

    // 1 root
    vec2 qos = d + (c + b * t) * t;
    res = length(qos);
  }else{
    float z = sqrt(-p);
    float v = acos( q / (p * z * 2.0) ) / 3.0;
    float m = cos(v);
    float n = sin(v) * 1.732050808;
    vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
    t = clamp( t, 0.0, 1.0 );

    // 3 roots
    vec2 qos = d + (c + b * t.x) * t.x;
    float dis = dot(qos, qos);

    res = dis;

    qos = d + (c + b * t.y) * t.y;
    dis = dot(qos, qos);
    res = min(res, dis);

    qos = d + (c + b * t.z) * t.z;
    dis = dot(qos, qos);
    res = min(res, dis);

    res = sqrt(res);
  }

  return res;
}

vec2 getHeartPosition(float t){
  return vec2(16.0 * sin(t) * sin(t) * sin(t),
      -(13.0 * cos(t) - 5.0 * cos(2.0 * t)
        - 2.0 * cos(3.0 * t) - cos(4.0 * t)));
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
  return pow(radius/dist, intensity);
}

float getSegment(float t, vec2 pos, float offset){

  float scale = 0.015;

  for(int i = 0; i < POINT_COUNT; i++){
    points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);
  }

  vec2 c = (points[0] + points[1]) * 0.5;
  vec2 c_prev;
  float dist = 10000.0;

  for(int i = 0; i < POINT_COUNT - 1; i++){
    c_prev = c;
    c = (points[i] + points[i+1]) * 0.5;
    dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
  }
  return max(0.0, dist);
}

vec3 ACESFilm(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

//https://www.shadertoy.com/view/4d3SR4
vec3 getPastelGradient(float h) {
    h = fract(h + 0.92620819117478) * 6.2831853071796;
    vec2 cocg = 0.25 * vec2(cos(h), sin(h));
    vec2 br = vec2(-cocg.x, cocg.x) - cocg.y;
    vec3 c = 0.729 + vec3(br.y, cocg.y, br.x);
    return c * c;
}

vec3 getColour(float line){
  if(animate > 0){
    return getPastelGradient(time + line * 0.2);
  }
  return line > 0.0 ? vec3(1.0,0.05,0.3) : vec3(0.1,0.4,1.0);
}

void main(){
  vec2 pos = vec2(0.5) - gl_FragCoord.xy/resolution.xy;
  pos.y /= resolution.x/resolution.y;
  pos.y += 0.02;

  //Get first segment
  float dist = getSegment(time, pos, 0.0);
  float glow = getGlow(dist, radius, intensity);

  vec3 col = vec3(0.0);

  //White core
  col += 10.0 * vec3(smoothstep(0.006, 0.003, dist));
  //Purple glow
  col += glow * getColour(0.0);

  //Get second segment
  dist = getSegment(time, pos, 3.4);
  glow = getGlow(dist, radius, intensity);

  //White core
  col += 10.0 * vec3(smoothstep(0.006, 0.003, dist));
  //Blue glow
  col += glow * getColour(1.0);

  col = ACESFilm(col);
  col = pow(col, vec3(0.4545));

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
    speed = 2.0 * Math.hypot(2.0*mousePos.x/canvas.width-1.0, 2.0*mousePos.y/canvas.height-1.0);
  }else{
    speed = 1.0;
  }

  time += speed * (thisFrame - lastFrame)/1000;	
  lastFrame = thisFrame;

  gl.useProgram(program);
  gl.uniform1f(timeHandle, time);
  gl.uniform1i(animateHandle, animate ? 1 : 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  requestAnimationFrame(draw);
}

draw();
