//Learning ray marching
//Features: domain manipulation, sdf operations, floor plane, Phong shading, soft shadows, 
//	    ambient occlusion, reflection

//Based on 
//http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
//https://www.iquilezles.org/www/index.htm
//https://www.youtube.com/watch?v=PGtv-dBi2wE
//https://www.youtube.com/playlist?list=PL3POsQzaCw53iK_EhOYR39h1J9Lvg-m-g

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

if(mobile){
  canvas.width = 360;
  canvas.height = 225;
}

// Initialize the GL context
var gl = canvas.getContext('webgl');
if(!gl){
  alert("Unable to initialize WebGL.");
}

//Time step
var dt = 0.02;
//Time
var time = 0.0;

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

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

const int MAX_STEPS = 100;
const float MIN_DIST = 0.0;
const float MAX_DIST = 100.0;
const float EPSILON = 1e-4;
const float PI = 3.1415;
const float shadow_sharpness = 64.0;

struct Material{
  vec3 ambientColour;
  vec3 diffuseColour;
  vec3 specularColour;
  float ambientStrength;
  float diffuseStrength;
  float shininess;
  float specularStrength;
};

struct Light{       
  vec3 position;
  vec3 colour; 
  //Attenuation variables
  float attn_linear;
  float attn_quad;
};

vec4 getColour(vec3 cameraPos, vec3 rayDir, float dist);

Material ring_material = Material(vec3(0.9, 0.6, 0.0), vec3(1.0, 0.7, 0.2), vec3(1.0), 0.4, 0.9, 128.0, 1.0);
Material floor_material = Material(vec3(0.8), vec3(1.0), vec3(1.0), 0.6, 0.7, 128.0, 0.0);

Light light = Light(vec3(-1.0, 4.5, -1.0), vec3(1.0), 0.09, 0.032);

vec3 rotate(vec3 p, vec4 q){
  return 2.0 * cross(q.xyz, p * q.w + cross(q.xyz, p)) + p;
}

vec3 rotate_xyz(vec3 p, float angle){
  vec3 position = p;
  position = rotate(position, vec4(sin(angle/2.0), 0.0, 0.0, cos(angle/2.0)));
  position = rotate(position, vec4(0.0, sin(angle/2.0), 0.0, cos(angle/2.0)));
  position = rotate(position, vec4(0.0, 0.0, sin(angle), cos(angle)));
  return position;
}

vec3 rotate_zyx(vec3 p, float angle){
  vec3 position = p;
  position = rotate(position, vec4(0.0, 0.0, sin(angle), cos(angle)));
  position = rotate(position, vec4(0.0, sin(angle/2.0), 0.0, cos(angle/2.0)));
  position = rotate(position, vec4(sin(angle/2.0), 0.0, 0.0, cos(angle/2.0)));
  return position;
}


float sphereSDF(vec3 p, float radius) {
  return length(p) - radius;
}

float torusSDF(vec3 p, float smallRadius, float largeRadius) {
  return length(vec2(length(p.xz) - largeRadius, p.y)) - smallRadius;
}

float getSDF(vec3 position) {
  //Lift object above XZ plane
  position.y -= 1.5;

  //Cut a ring out of a torus using a sphere, and rotate
  float angle = 0.4*2.0*time;
  float radius = 1.0;

  //Centre
  position = rotate_xyz(position, angle);
  float dist = max(sphereSDF(position, radius), torusSDF(position, 0.1, radius));

  //Middle
  //Undo centre rotation
  position = rotate_zyx(position, -angle);

  angle = 0.4*time + 0.2;
  position = rotate_xyz(position, angle);
  radius = 1.2;
  dist =  min(max(sphereSDF(position, radius), torusSDF(position, 0.1, radius)), dist);

  //Outer
  //Undo middle rotation
  position = rotate_zyx(position, -angle);
  angle = 0.4*-time;
  position = rotate_xyz(position, angle);
  radius = 1.4;
  dist =  min(max(sphereSDF(position, radius), torusSDF(position, 0.1, radius)), dist);;
  return dist;
}

vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
  vec2 xy = fragCoord - resolution.xy / 2.0;
  float z = resolution.y / tan(radians(fieldOfView) / 2.0);
  return normalize(vec3(xy, -z));
}

//https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
mat3 lookAt(vec3 camera, vec3 at, vec3 up){
  vec3 zaxis = normalize(at-camera);    
  vec3 xaxis = normalize(cross(zaxis, up));
  vec3 yaxis = cross(xaxis, zaxis);

  return mat3(xaxis, yaxis, -zaxis);
}

//Get surface normal from the gradient of the surrounding sdf field
//by sampling the values in the neighbouring area
vec3 estimateNormal(vec3 p) {
  return normalize(vec3(
	getSDF(vec3(p.x + EPSILON, p.y, p.z)) - getSDF(vec3(p.x - EPSILON, p.y, p.z)),
	getSDF(vec3(p.x, p.y + EPSILON, p.z)) - getSDF(vec3(p.x, p.y - EPSILON, p.z)),
	getSDF(vec3(p.x, p.y, p.z + EPSILON)) - getSDF(vec3(p.x, p.y, p.z - EPSILON))
	));
}

//https://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
float softShadow(vec3 pos, vec3 rayDir, float start, float end, float k ){
  float res = 1.0;
  float depth = start;
  for(int counter = 0; counter < (MAX_STEPS); counter++){
    float dist = getSDF(pos + rayDir * depth);
    if( abs(dist) < 100.0*EPSILON){ return 0.0; }       
    if( depth > end){ break; }
    res = min(res, k*dist/depth);
    depth += dist;
  }
  return res;
}

float distanceToScene(vec3 cameraPos, vec3 rayDir, float start, float end) {

  //Start at a predefined distance from the camera in the ray direction
  float depth = start;

  //Variable that tracks the distance to the scene 
  //at the current ray endpoint
  float dist;

  //For a set number of steps
  for (int i = 0; i < MAX_STEPS; i++) {

    //Get the sdf value at the ray endpoint, giving the maximum 
    //safe distance we can travel in any direction without hitting a surface
    dist = getSDF(cameraPos + depth * rayDir);

    //If it is small enough, we have hit a surface
    //Return the depth that the ray travelled through the scene
    if (dist < EPSILON){ return depth; }

    //Else, march the ray by the sdf value
    depth += dist;

    //Test if we have left the scene
    if (depth >= end){ return end; }
  }

  //Return max value if we hit nothing but remain in the scene after max steps
  return end;
}

//Ambinet occlusion reduces the ambinet light strength in areas 
//which are closely shielded by other objects
//https://www.youtube.com/watch?v=22PZF7fWLqI
float ambientOcclusion(vec3 position, vec3 normal){
  float ao = 0.0;
  //step size
  float del = 0.05;
  float weight = 0.07;

  //Travel out from point with fixed step size and accumulate proximity to other surfaces
  //iq slides include 1.0/pow(2.0, i) factor to reduce the effect of farther objects
  //but Peer Play uses just 1.0/dist
  for(float i = 1.0; i <= 5.0; i+=1.0){
    float dist = i * del;
    //Ignore measurements from inside objects
    ao += max(0.0, (dist - getSDF(position + normal * dist))/dist);
  }
  //Return a weighted occlusion amount
  return 1.0 - weight * ao;
}

//http://www.iquilezles.org/www/articles/checkerfiltering/checkerfiltering.htm
bool isEven(vec3 position){
  vec2 s = sign(fract(position.xz*0.5)-0.5);
  return (0.5 - 0.5*s.x*s.y) > 0.5;
}

vec4 reflection(vec3 position, vec3 rayDir, vec3 normal){
  vec3 refDir = normalize(reflect(rayDir, normal));
  float dist = distanceToScene(position + normal * EPSILON, refDir, MIN_DIST, MAX_DIST);
  vec4 col = getColour(position, refDir, dist);
  return col;
}

//Return colour of surface fragment based on light information
vec3 phongShading(vec3 position, vec3 normal, vec3 cameraPosition, 
    Material material, Light light){

  //Create checkered pattern on the floor that fades in the distance
  if(material == floor_material){
    float weight = smoothstep(0.0, 0.5, length(cameraPosition - position)/MAX_DIST);
    vec3 darker_ambient = material.ambientColour * 0.5;
    vec3 mixed_ambient = (darker_ambient + material.ambientColour) * 0.5;
    darker_ambient = mix(darker_ambient, mixed_ambient, weight);
    material.ambientColour = mix(material.ambientColour, mixed_ambient, weight);

    if(isEven(0.5*position)){
      material.ambientColour = darker_ambient;
    }
  }

  vec3 lightDirection = normalize(light.position - position); 
  float distToLight = length(light.position - position);

  //How much a fragment faces the light
  float diff = max(dot(normal, lightDirection), 0.0);

  //Colour when lit by light
  vec3 diffuse = diff * material.diffuseColour * light.colour;

  //How much a fragment directly reflects the light to the camera
  vec3 viewDirection = normalize(cameraPosition - position);

  vec3 halfwayDir = normalize(lightDirection + viewDirection);  
  float spec = pow(max(dot(normal, halfwayDir), 0.0), material.shininess);

  //Colour of light sharply reflected into the camera
  vec3 specular = spec * material.specularColour * light.colour;   

  //https://learnopengl.com/Lighting/Light-casters
  float attenuation = 1.0 / (1.0 + light.attn_linear * distToLight + 
      light.attn_quad * (distToLight * distToLight)); 
  //Path to light blocked     
  float shadow = softShadow(position + normal * EPSILON * 128.0, lightDirection, MIN_DIST,
      distToLight, shadow_sharpness);
  //Get ambient occlusion
  float ao = ambientOcclusion(position, normal);

  //Combine all aspects into a single colour
  vec3 result = ao * material.ambientStrength * material.ambientColour + 
    attenuation * shadow *(material.diffuseStrength * diffuse + 
	material.specularStrength * specular);
  return  result;
}

Material getMaterial(int id){
  if(id == 0){
    return floor_material;
  }else{
    return ring_material;
  }
}

float distToFloor(vec3 cameraPos, vec3 rayDir, vec3 floor_norm){
  //Find the distance to the floor as the hypotenuse of a triangle defined by
  //the height of the camera and the angle between the ray direction and the
  //negative floor normal
  return  abs(cameraPos.y/sin(PI*0.5 - acos(dot(rayDir, -floor_norm))));
}

vec4 getColour(vec3 cameraPos, vec3 rayDir, float dist){

  bool floor_ = false;
  vec3 floor_norm = vec3(0.0, 1.0, 0.0);
  float floor_dist = -1.0;

  //If ray points below the XZ plane, and the distance to the floor is smaller
  //than what is returned by the ray (either surface or max), render the floor
  if(rayDir.y < -EPSILON){
    floor_dist = distToFloor(cameraPos, rayDir, floor_norm);
    //Is the floor closer than other distances?
    floor_ = dist > floor_dist;
  }

  if(floor_){    
    dist = floor_dist;
  }

  //If the ray endpoint is not at a surface
  if (dist > MAX_DIST - EPSILON) {
    //If not pointing to floor, return sky colour
    if(!floor_){
      float weight = smoothstep(0.45, 0.6, pow(0.5 + 0.5 * rayDir.y, 1.0));
      return mix(vec4(0.7,0.82,0.92,1), vec4(0.2,0.37,0.68,1), weight);
    }
  }

  //Else, determine the surface colour
  vec3 position = cameraPos + rayDir * dist;
  vec3 normal = floor_ ? floor_norm : estimateNormal(position);
  vec3 col = phongShading(position, normal, cameraPos, getMaterial(floor_ ? 0 : 1),light);
  return vec4(col, 1.0);
}

//https://learnopengl.com/PBR/Theory
float fresnelSchlick(vec3 cameraPos, vec3 position, vec3 normal){
  float cosTheta = dot(normal, normalize(cameraPos - position));
  float F0 = 0.04;
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main(){
  //Get the default direction of the ray (along the negative Z direction)
  vec3 rayDir = rayDirection(45.0, gl_FragCoord.xy);

  //--------------- Define a camera ---------------
  vec3 cameraPos = vec3(sin(-0.05*time) * 10.0, 1.8 + 0.5+0.5*sin(-0.05*time), cos(-0.05*time) * -14.0);

  vec3 target = vec3(0.0, 1.5, 0.0);
  vec3 up = vec3(0.0, 1.0, 0.0);

  //-----------------------------------------------

  //Get the view matrix from the camera orientation
  mat3 viewMatrix = lookAt(cameraPos, target, up);
  //Transform the ray to point in the correct direction
  rayDir = viewMatrix * rayDir;

  vec3 floor_norm = vec3(0.0,1.0,0.0);

  //Find the distance to where the ray stops
  float dist = distanceToScene(cameraPos, rayDir, MIN_DIST, MAX_DIST);

  vec3 position = cameraPos + rayDir * dist;
  vec3 normal = estimateNormal(position);
  vec4 col = getColour(cameraPos, rayDir, dist);

  //If object in scene
  if (dist < MAX_DIST - EPSILON){
    vec4 reflectedCol = reflection(position, rayDir, normal);
    float fresnel = fresnelSchlick(cameraPos, position, normal);
    col += reflectedCol * fresnel;
  }

  //If floor
  if(rayDir.y < -EPSILON){
    float floor_dist = distToFloor(cameraPos, rayDir, floor_norm);
    if(dist > floor_dist){
      position = cameraPos + rayDir * floor_dist;
      col = 0.9 * col +  0.1 * vec4(reflection(position, rayDir, floor_norm));
    }
  }
  gl_FragColor = col;
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
    1.0,  1.0, 	// top right
    1.0, -1.0, 	// bottom right
]);

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
var positionHandle = getAttribLocation(program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
      2, 		// position is a vec2 (2 values per component)
      gl.FLOAT, 	// each component is a float
      false, 		// don't normalize values
      2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
      0 		// how many bytes inside the buffer to start from
    );

//Set uniform handle
var timeHandle = getUniformLocation(program, 'time');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, canvas.width);
gl.uniform1f(heightHandle, canvas.height);

function draw(){
  stats.begin();
  //Update time
  time += dt;

  //Send time to program
  gl.uniform1f(timeHandle, time);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  stats.end();
  requestAnimationFrame(draw);
}

draw();