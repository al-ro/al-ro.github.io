const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

canvas.width = canvas.clientWidth;
canvas.height = canvas.width/1.6;;

// Initialize the GL context
var gl = canvas.getContext('webgl');
if(!gl){
  console.error("Unable to initialize WebGL.");
}

//Time step
var dt = 0.015;
//Time
var time = 0.0;

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

//Base values modified with depth later
float intensity = 1.0;
float radius = 0.1;

//Distance functions from 
//https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
float triangleDist(vec2 p){ 
  const float k = sqrt(3.0);
  p.x = abs(p.x) - 1.0;
  p.y = p.y + 1.0/k;
  if( p.x+k*p.y>0.0 ) p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
  p.x -= clamp( p.x, -2.0, 0.0 );
  return -length(p)*sign(p.y);
}

float boxDist(vec2 p){
  vec2 d = abs(p)-1.0;
  return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0);
}

float circleDist( vec2 p){
  return length(p) - 1.0;
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
  return pow(radius/dist, intensity);
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
  const float layers = 15.0;

  float depth;
  vec2 bend;

  vec3 purple = vec3(0.611, 0.129, 0.909);
  vec3 green = vec3(0.133, 0.62, 0.698);

  float angle;
  float rotationAngle;
  mat2 rotation;

  //For movement of the anchor point in time
  float d = 2.5*(sin(t) + sin(3.0*t));

  //Create an out of frame anchor point where all shapes converge to    
  vec2 anchor = vec2(0.5 + cos(d), 0.5 + sin(d));

  //Create light purple glow at the anchor loaction
  pos = anchor - uv;
  pos.y /= widthHeightRatio;
  dist = length(pos);
  glow = getGlow(dist, 0.35, 1.9);
  col += glow * vec3(0.7,0.6,1.0);

  for(float i = 0.0; i < layers; i++){

    //Time varying depth information depending on layer
    depth = fract(i/layers + t);

    //Move the focus of the camera in a circle
    centre = vec2(0.5 + 0.2 * sin(t), 0.5 + 0.2 * cos(t));

    //Position shapes between the anchor and the camera focus based on depth
    bend = mix(anchor, centre, depth);

    pos = bend - uv;
    pos.y /= widthHeightRatio;

    //Rotate shapes
    rotationAngle = 3.14 * sin(depth + fract(t) * 6.28) + i;
    rotation = mat2(cos(rotationAngle), -sin(rotationAngle), 
	sin(rotationAngle),  cos(rotationAngle));

    pos *= rotation;

    //Position shapes according to depth
    pos *= mix(scale, 0.0, depth);

    float m = mod(i, 3.0);
    if(m == 0.0){
      dist = abs(boxDist(pos));
    }else if(m == 1.0){
      dist = abs(triangleDist(pos));
    }else{
      dist = abs(circleDist(pos));
    }

    //Get glow from base radius and intensity modified by depth
    glow = getGlow(dist, radius+(1.0-depth)*2.0, intensity + depth);

    //Find angle along shape and map from [-PI; PI] to [0; 1]
    angle = (atan(pos.y, pos.x)+3.14)/6.28;
    //Shift angle depending on layer and map to [1...0...1]
    angle = abs((2.0*fract(angle + i/layers)) - 1.0);

    //White core
    //col += 10.0*vec3(smoothstep(0.03, 0.02, dist));

    //Glow according to angle value
    col += glow * mix(green, purple, angle);
  }

  //Tone mapping
  col = 1.0 - exp(-col);

  //Output to screen
  gl_FragColor = vec4(col,1.0);
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

//Create shader programs
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

gl.useProgram(program);

//Set up rectangle covering entire canvas 
var vertexData = new Float32Array([
    -1.0,  1.0, 	// top left
    -1.0, -1.0, 	// bottom left
    1.0,  1.0, 		// top right
    1.0, -1.0, 		// bottom right
]);

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
var positionHandle = getAttribLocation(program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
    2, 			// position is a vec2 (2 values per component)
    gl.FLOAT, 		// each component is a float
    false, 		// don't normalize values
    2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 			// how many bytes inside the buffer to start from
    );

//Set uniform handle
var timeHandle = getUniformLocation(program, 'time');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, canvas.width);
gl.uniform1f(heightHandle, canvas.height);

function draw(){
  //Update time
  time += dt;

  //Send uniforms to program
  gl.uniform1f(timeHandle, time);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
