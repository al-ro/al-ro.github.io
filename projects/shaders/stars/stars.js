//Based on:
//https://www.youtube.com/watch?v=3CycKKJiwis

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

canvas.width = canvas.clientWidth;
canvas.height = canvas.width/1.6;

var layers = 10;

if(mobile){
  layers = 5;
}

// Initialize the GL context
var gl = canvas.getContext('webgl');
if(!gl){
  console.error("Unable to initialize WebGL.");
}

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
float random(vec2 par){
  return fract(sin(dot(par.xy,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 random2(vec2 par){
  float rand = random(par);
  return vec2(rand, random(par+rand));
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
  return pow(radius/dist, intensity);
}

void main(){

  float t = 1.0 + time * 0.05;
  const float layers = float(`+layers+`);
  float scale = 32.0;
  float depth;
  float phase;
  float rotationAngle = time * -0.1;
  float size;
  float glow;
  //Iteration step size for outermost loop
  const float del = 1.0/layers;

  vec2 uv;
  //Value of floor(uv)
  vec2 fl;
  vec2 local_uv;
  vec2 index;
  vec2 pos;
  //Seed for random values
  vec2 seed;
  vec2 centre;    
  //The indices of 3x3 cells surrounding the fragment
  vec2 cell;
  //To move the focus of the camera in a circle
  vec2 rot = vec2(cos(t), sin(t));

  //To rotate layers
  mat2 rotation = mat2(cos(rotationAngle), -sin(rotationAngle), 
      sin(rotationAngle),  cos(rotationAngle));
  vec3 col = vec3(0);
  vec3 tone;

  //For all layers
  for(float i = 0.0; i <= 1.0; i+=del){
    //Find depth from layer index and move it in time
    depth = fract(i + t);

    //Move centre in a circle depending on the depth of the layer
    centre = rot * 0.2 * depth + 0.5;

    //Get uv from the fragment coordinates, rotation and depth
    uv = centre-gl_FragCoord.xy/resolution.x;
    uv *= rotation;
    uv *= mix(scale, 0.0, depth);
    fl = floor(uv);
    //The local cell coordinates. uv-fl == frac(uv)
    local_uv = uv - fl - 0.5;


    //For a 3x3 group of cells around the fragment, find the 
    //distance from the points of each to the current fragment 
    //and draw an accumulative glow accordingly
    for(float j = -1.0; j <= 1.0; j++){
      for(float k = -1.0; k <= 1.0; k++){
	cell = vec2(j,k);

	index = fl + cell;

	//Cell seed
	seed = 128.0 * i + index;

	//Get a random position in relation to the considered cell
	pos = cell + 0.9 * (random2(seed) - 0.5);

	//Get a random phase
	phase = 128.0 * random(seed);
	//Get colour from cell information
	tone = vec3(random(seed), random(seed + 1.0), random(seed + 2.0));

	//Get distance to the generated point, fade distant points
	//and make glow radius pulse in time
	size = (0.1 + 0.5 + 0.5 * sin(phase * t)) * depth;
	glow = size * getGlow(length(local_uv-pos), 0.07, 2.5);
	//Add white core and glow
	col += 3.0 * vec3(0.02 * glow) + tone * glow;
      }
    }
  }

  //Tone mapping
  col = 1.0 - exp(-col);

  //Gamma
  col = pow(col, vec3(0.4545));

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
  }else if(mobile){
    //Reduce resolution if mobile full screen for performance
    w *= 0.7;
    h *= 0.7;
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

var lastFrame = Date.now();
var thisFrame;

function draw(){
	
  //Update time
  thisFrame = Date.now();
  time += (thisFrame - lastFrame)/1000;	
  lastFrame = thisFrame;


  //Send uniforms to program
  gl.uniform1f(timeHandle, time);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
