var canvas = document.getElementById("canvas_1");

// Initialize the GL context
var gl = canvas.getContext('webgl');
if(!gl){
  console.error("Unable to initialize WebGL.");
}

//Time step
var dt = 0.01;
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

//See https://www.shadertoy.com/view/3s3GDn for comments on the glow
float getWaveGlow(vec2 pos, float radius, float intensity, float speed, float amplitude, float frequency, float shift){

  float dist = (pos.y + amplitude * sin(shift + speed * time + pos.x * frequency));
  dist = 1.0/dist;
  dist *= radius;
  dist = pow(dist, intensity);
  return dist;
}

void main(){

  vec2 uv = gl_FragCoord.xy/resolution.xy;
  float widthHeightRatio = resolution.x/resolution.y;
  vec2 centre = vec2(0.5, 0.5);
  vec2 pos = centre - uv;
  pos.y /= widthHeightRatio;

  float intensity = 0.7;
  float radius = 0.012;

  vec3 col = vec3(0.0);
  float dist = 0.0;

  dist = getWaveGlow(pos, radius,intensity, 3.0, 0.01, 2.0, 0.0);
  col += dist * vec3(1.0,0.5,0.1);
  dist = getWaveGlow(pos, radius, intensity, 5.0, 0.01, 2.0, 2.0);
  col += dist * vec3(0.5,0.2,0.2);
  dist = getWaveGlow(pos, radius, intensity, 8.0, 0.01, 5.0, 1.0);
  //Use time varying colours from the basic template
  //Add it to vec3(0.1) to always have a bright core
  col += dist * (vec3(0.1) + 0.5 + 0.5*cos(time+vec3(0,2,4)));

  // Output to screen
  gl_FragColor = vec4(col, 1.0);
}
`;

//************** Utility functions **************

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
