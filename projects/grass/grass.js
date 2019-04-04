//Based on:
//"Realistic real-time grass rendering" by Eddie Lee, 2010
//https://www.eddietree.com/grass
//https://medium.com/@Zadvorsky/into-vertex-shaders-594e6d8cd804u
//https://github.com/zadvorsky/three.bas
//https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing_dynamic.html

var canvas = document.getElementById("canvas_1");
var cont = document.getElementById("cc_1");

var TWO_PI = Math.PI*2;

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
    );


//Variables for blade mesh
var joints = 5;
var w_ = 0.12;
var h_ = 1;

//Patch side length
var width = 150;

//Number of blades
var instances = 100000;
if(mobile){
  instances = 10000;
  width = 50;
}

//Camera rotate
var rotate = false;

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w,h,false);
renderer.setClearColor( 0x66deff, 1);
distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);
camera.position.set(-60, 10, 60);
if(mobile){
  camera.position.set(-40, 20, 40);
}
scene.add(camera);

//Lights
var light_1 = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(light_1);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = rotate;
controls.autoRotateSpeed = 0.5;

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

//http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm
function multiplyQuaternions(q1, q2){
  x =  q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x;
  y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y;
  z =  q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z;
  w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w;
  return new THREE.Vector4(x, y, z, w);
}


var vertexSource = `
precision mediump float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec3 offset;
attribute vec2 uv;
attribute vec4 orientation;
attribute float halfRootAngleSin;
attribute float halfRootAngleCos;
attribute float stretch;
uniform float time;
varying vec2 vUv;
varying float frc;

/*** WEBGL-NOISE FROM https://github.com/stegu/webgl-noise ***/

// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
{
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
      -0.577350269189626,  // -1.0 + 2.0 * C.x
      0.024390243902439); // 1.0 / 41.0
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

//*** END NOISE ***

//https://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
vec3 rotateVectorByQuaternion( vec3 v, vec4 q){
  return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}

//https://en.wikipedia.org/wiki/Slerp
vec4 slerp(vec4 v0, vec4 v1, float t) {
  // Only unit quaternions are valid rotations.
  // Normalize to avoid undefined behavior.
  normalize(v0);
  normalize(v1);

  // Compute the cosine of the angle between the two vectors.
  float dot_ = dot(v0, v1);

  // If the dot product is negative, slerp won't take
  // the shorter path. Note that v1 and -v1 are equivalent when
  // the negation is applied to all four components. Fix by 
  // reversing one quaternion.
  if (dot_ < 0.0) {
    v1 = -v1;
    dot_ = -dot_;
  }  

  const float DOT_THRESHOLD = 0.9995;
  if (dot_ > DOT_THRESHOLD) {
    // If the inputs are too close for comfort, linearly interpolate
    // and normalize the result.

    vec4 result = t*(v1 - v0) + v0;
    normalize(result);
    return result;
  }

  // Since dot is in range [0, DOT_THRESHOLD], acos is safe
  float theta_0 = acos(dot_);        // theta_0 = angle between input vectors
  float theta = theta_0*t;          // theta = angle between v0 and result
  float sin_theta = sin(theta);     // compute this value only once
  float sin_theta_0 = sin(theta_0); // compute this value only once

  float s0 = cos(theta) - dot_ * sin_theta / sin_theta_0;  // == sin(theta_0 - theta) / sin(theta_0)
  float s1 = sin_theta / sin_theta_0;

  return (s0 * v0) + (s1 * v1);
}

void main() {

  //Relative position of vertex along the mesh Y direction
  frc = position.y/float(` + h_ + `);

  //Get wind data from simplex noise 
  float noise = 1.0-(snoise(vec2((time-offset.x/50.0), (time-offset.z/50.0)))); 

  //Define the direction of an unbent blade of grass rotated around the Y axis
  vec4 direction = vec4(0.0, halfRootAngleSin, 0.0, halfRootAngleCos);

  //Interpolate between the unbent direction and the direction of growth calculated on the CPU. 
  //Using the relative location of the vertex along the Y axis as the weight, we get a smooth bend
  direction = slerp(direction, orientation, frc);
  vec3 vPosition = vec3(position.x, position.y + position.y * stretch, position.z);
  vPosition = rotateVectorByQuaternion(vPosition, direction);

	//Apply wind
	float angle = noise * 0.3;
  vPosition = rotateVectorByQuaternion(vPosition, normalize(vec4(sin(angle/2.0), 0.0, -sin(angle/2.0), cos(angle/1.0))));

  //UV for texture
  vUv = uv;

  //Calculate final position of the vertex from the world offset and the above shenanigans 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(offset + vPosition, 1.0 );
}`;

var fragmentSource = `
precision mediump float;
uniform sampler2D map;
uniform sampler2D alphaMap;
varying vec2 vUv;
varying float frc;

void main() {
  //Get transparency information from alpha map
  float alpha = texture2D(alphaMap, vUv).r;
  //If transparent, don't draw
  if(alpha < 0.15){
    discard;
  }
  //Get colour data from texture
  vec4 col = vec4(texture2D(map, vUv));
  //Add more green towards root
  col = mix(vec4(0.0, 0.6, 0.0, 1.0), col, frc);
  //Add a shadow towards root
  col = mix(vec4(0.0, 0.1, 0.0, 1.0), col, frc);
  gl_FragColor = col;
}`;

//Use noise.js library to generate a grid of 2D simplex noise values
noise.seed(Math.random());

function getYPosition(x, z){
  var y = 2*noise.simplex2(x/50, z/50);
  y += 4*noise.simplex2(x/100, z/100);
  y += 0.2*noise.simplex2(x/10, z/10);
  return y;
};

//The ground
var ground_geometry = new THREE.PlaneGeometry(width, width, 32, 32);
ground_geometry.lookAt(new THREE.Vector3(0,1,0));
ground_geometry.verticesNeedUpdate = true;
var ground_material = new THREE.MeshPhongMaterial({color: 0x002300});
var ground = new THREE.Mesh(ground_geometry, ground_material);

for (var i = 0; i < ground.geometry.vertices.length; i++){
  var v = ground.geometry.vertices[i];
  v.y = getYPosition(v.x, v.z); 
}
ground.geometry.computeVertexNormals();
scene.add(ground);

//Define base geometry that will be instanced. We use a plane for an individual blade of grass
var base_geometry = new THREE.PlaneBufferGeometry(w_, h_, 1, joints);
base_geometry.translate(0,h_/2,0);
var base_material = new THREE.MeshPhongMaterial({color: 0xff0000, side: THREE.DoubleSide});
var base_blade = new THREE.Mesh(base_geometry, base_material);

//From:
//https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing_dynamic.html
var instanced_geometry = new THREE.InstancedBufferGeometry();

//----------ATTRIBUTES----------//
instanced_geometry.index = base_geometry.index;
instanced_geometry.attributes.position = base_geometry.attributes.position;
instanced_geometry.attributes.uv = base_geometry.attributes.uv;

// Each instance has its own data for position, rotation and scale
var offsets = [];
var orientations = [];
var stretches = [];
var halfRootAngleSin = [];
var halfRootAngleCos = [];

//Temp variables
var quaternion_0 = new THREE.Vector4();
var quaternion_1 = new THREE.Vector4();
var x, y, z, w;

//The min and max angle for the growth direction (in radians)
var min = -0.25;
var max =  0.25;

//For each instance of the grass blade
for (var i = 0; i < instances; i++){
  //Offset of the roots
  x = Math.random() * width - width/2;
  z = Math.random() * width - width/2;
  y = getYPosition(x, z); 
  offsets.push( x, y, z);

  //Define random growth directions
  //Rotate around Y
  var angle = Math.PI - Math.random() * (2 * Math.PI);
  halfRootAngleSin.push(Math.sin(0.5*angle));
  halfRootAngleCos.push(Math.cos(0.5*angle));

  var RotationAxis = new THREE.Vector3(0, 1, 0);
  var x = RotationAxis.x * Math.sin(angle / 2.0);
  var y = RotationAxis.y * Math.sin(angle / 2.0);
  var z = RotationAxis.z * Math.sin(angle / 2.0);
  var w = Math.cos(angle / 2.0);
  quaternion_0.set( x, y, z, w).normalize();

  //Rotate around X
  angle = Math.random() * (max - min) + min;
  RotationAxis = new THREE.Vector3(1, 0, 0);
  x = RotationAxis.x * Math.sin(angle / 2.0);
  y = RotationAxis.y * Math.sin(angle / 2.0);
  z = RotationAxis.z * Math.sin(angle / 2.0);
  w = Math.cos(angle / 2.0);
  quaternion_1.set( x, y, z, w).normalize();

  //Combine rotations to a single quaternion
  quaternion_0 = multiplyQuaternions(quaternion_0, quaternion_1);

  //Rotate around Z
  angle = Math.random() * (max - min) + min;
  RotationAxis = new THREE.Vector3(0, 0, 1);
  x = RotationAxis.x * Math.sin(angle / 2.0);
  y = RotationAxis.y * Math.sin(angle / 2.0);
  z = RotationAxis.z * Math.sin(angle / 2.0);
  w = Math.cos(angle / 2.0);
  quaternion_1.set( x, y, z, w).normalize();

  //Combine rotations to a single quaternion
  quaternion_0 = multiplyQuaternions(quaternion_0, quaternion_1);

  orientations.push(quaternion_0.x, quaternion_0.y, quaternion_0.z, quaternion_0.w);

  //Define variety in height
  if(i < instances/3){
    stretches.push(Math.random() * 1.8);
  }else{
    stretches.push(Math.random()); 
  }
}

var offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3);
var stretchAttribute = new THREE.InstancedBufferAttribute( new Float32Array( stretches ), 1);
var halfRootAngleSinAttribute = new THREE.InstancedBufferAttribute( new Float32Array( halfRootAngleSin ), 1);
var halfRootAngleCosAttribute = new THREE.InstancedBufferAttribute( new Float32Array( halfRootAngleCos ), 1);
var orientationAttribute = new THREE.InstancedBufferAttribute( new Float32Array( orientations ), 4);

instanced_geometry.addAttribute( 'offset', offsetAttribute);
instanced_geometry.addAttribute( 'orientation', orientationAttribute);
instanced_geometry.addAttribute( 'stretch', stretchAttribute);
instanced_geometry.addAttribute( 'halfRootAngleSin', halfRootAngleSinAttribute);
instanced_geometry.addAttribute( 'halfRootAngleCos', halfRootAngleCosAttribute);

//Get alpha map and blade texture
//These have been taken from "Realistic real-time grass rendering" by Eddie Lee, 2010
THREE.ImageUtils.crossOrigin = '';
var texture = THREE.ImageUtils.loadTexture("https://res.cloudinary.com/al-ro/image/upload/v1552838655/v2_iqvzcx.png");
var alphaMap = THREE.ImageUtils.loadTexture("https://res.cloudinary.com/al-ro/image/upload/v1552834315/Screen_Shot_2019-03-17_at_15.50.35_y5zfyu.png");

//Define the material, specifying attributes, uniforms, shaders etc.
var material = new THREE.RawShaderMaterial( {
  uniforms: {
    map: { value: texture},
    alphaMap: { value: alphaMap},
    time: {type: 'float', value: 0}
  },
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
  side: THREE.DoubleSide
} );

mesh = new THREE.Mesh( instanced_geometry, material );
scene.add(mesh);

//Show base geometry
//scene.add(base_blade);

//----------DRAW----------//
var time = 0;
function draw(){
  stats.begin();
  time += 1/100;
  material.uniforms.time.value = time;
  renderer.render(scene, camera);
  if(rotate){
    controls.update();
  }
  stats.end();
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
