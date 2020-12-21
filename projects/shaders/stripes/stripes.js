//Based on:
//https://andreashackel.de/tech-art/stripes-shader-1/

var canvas = document.getElementById("canvas_1");

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

#define AA

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

  const float PI = 3.14;
  float amplitude = 0.9;
  float frequency = 0.4;

  //Centre of the screen
  vec2 centre = vec2(0.5, 0.5);

  //Repetition of stripe unit
  float tilingFactor = 15.0;

  float angle = -PI/4.0;

  vec3 col_1 = vec3(1.0, 0.05, 0.05);
  vec3 col_2 = vec3(1.0, 1.0, 0.0);    
  vec3 col_3 = vec3(0.2, 1.0, 0.2);
  vec3 col_4 = vec3(0.1, 0.45, 1.0);

  vec3 col = vec3(0);

  vec2 fC = gl_FragCoord.xy;

#ifdef AA
  for(int i = -1; i <= 1; i++) {
    for(int j = -1; j <= 1; j++) {

      fC = gl_FragCoord.xy+vec2(i,j)/3.0;

#endif

      //Normalized pixel coordinates (from 0 to 1)
      vec2 uv = fC/resolution.xy;

      //The ratio of the width and height of the screen
      float widthHeightRatio = resolution.x/resolution.y;

      //Adjust vertical pos to make the width of the stripes 
      //transform uniformly regardless of orientation
      uv.y /= widthHeightRatio;

      //Rotate pos around centre by specified radians
      uv = rotatePosition(uv, centre, angle);

      //Move frame along rotated y direction
      uv.y -= 0.35*time;

      vec2 position = uv * tilingFactor;
      position.x += amplitude * sin(frequency * position.y);

      //Set stripe colours
      int value = int(floor(fract(position.x) * 4.0));

      if(value == 0){col += col_1;}
      if(value == 1){col += col_2;}
      if(value == 2){col += col_3;}
      if(value == 3){col += col_4;}

#ifdef AA
    }
  }

  col /= 9.0;

#endif

  //Gamma
  col = pow(col, vec3(0.4545));

  //Fragment colour
  gl_FragColor = vec4(col,1.0);
}
`;

//************** Utility functions **************

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  if(!isInFullscreen()){
    w = 1440;
    h = 900;
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
  time += (thisFrame - lastFrame)/770;	
  lastFrame = thisFrame;

  //Send uniforms to program
  gl.uniform1f(timeHandle, time);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
