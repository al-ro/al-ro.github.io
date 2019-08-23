//Using textures by Ulrick Wery, Kuko Cai

var canvas = document.getElementById("canvas_1");
var cont = document.getElementById("cc_1");

const mobile = ( navigator.userAgent.match(/Android/i)
 || navigator.userAgent.match(/webOS/i)
 || navigator.userAgent.match(/iPhone/i)
 || navigator.userAgent.match(/BlackBerry/i)
 || navigator.userAgent.match(/Windows Phone/i)
);

//Initialise three.js
var scene = new THREE.Scene();

var width = 256;
var resolution = 64;
var delta = width/resolution;
var radius = 160;
var repeat = 5;
var dPos = 0.1;
var treeHeight = 36;
var treeCount = 400;
var trees = [];
var positions = [];
var bend = 3.0;
var branchCount = 40;
var speed = 0.1;
var treeBend = 0.3;

//The global coordinates
//The geometry never leaves a box of width*width around (0, 0)
//But we track where in space the camera would be globally
var pos = {x:0, z:0};
var del = {x:0, z:0};

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h, false);
renderer.setClearColor( 0x6ac3ff, 1);
renderer.shadowMap.enabled = true;
//renderer.shadowMap.type = THREE.BasicShadowMap;
//renderer.shadowMap.renderSingleSided = false;
//renderer.setClearColor( 0x221155, 0);

var distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);
camera.position.set(-5, 40, 50);
scene.add(camera);

//Create Three.js skybox
var skyBoxLoader = new THREE.CubeTextureLoader();
skyBoxLoader.crossOrigin = '';
//Skybox image taken from https://hdrihaven.com/
skyBoxLoader.setPath('https://al-ro.github.io/images/planet/');
var skyBox = skyBoxLoader.load([
  'side.jpg',
  'side.jpg',
  'top.jpg',
  'bottom.jpg',
  'side.jpg',
  'side.jpg'
]);
scene.background = skyBox;

//Lights
var ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
scene.add(ambientLight);
var shadowStrength = 0.85;
directionalLight = new THREE.DirectionalLight(0xffffff, shadowStrength);
directionalLight.position.set(40, 40, 40);
directionalLight.lookAt(0,0,0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;  // default
directionalLight.shadow.mapSize.height = 1024; // default
directionalLight.shadow.camera.near = -10.0;       // default
directionalLight.shadow.camera.far = 150      // default

directionalLight.shadow.camera.top = 60;
directionalLight.shadow.camera.bottom = -60;
directionalLight.shadow.camera.right = 60;
directionalLight.shadow.camera.left = -60;

directionalLight.shadow.bias = -0.005;
directionalLight.shadow.radius = 1.0;
var helper = new THREE.CameraHelper(directionalLight.shadow.camera);
//scene.add(helper);
scene.add(directionalLight);
directionalLight_2 = new THREE.DirectionalLight(0xffffff, 1-shadowStrength);
directionalLight_2.position.set(40, 40, 40);
directionalLight_2.lookAt(0,0,0);
scene.add(directionalLight_2);


var wispLight = new THREE.PointLight(0x9999ff, 2.0); 
wispLight.position.set(0, 5, 0);
wispLight.distance = 25;
wispLight.decay = 1.5;
scene.add(wispLight);

var rotate = false;
//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = rotate;
controls.target = new THREE.Vector3(0, 5, 0);
controls.autoRotateSpeed = 0.5;
controls.update();

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

//Dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'radius').min(10).max(400).step(5);
gui.add(this, 'repeat').min(1).max(400).step(1).onChange(function(val){groundTexture.repeat.set(val, val);});
gui.add(this, 'dPos').min(0).max(1).step(0.01);
gui.add(this, 'speed').min(0).max(1).step(0.01);

document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
  var keyCode = event.which;
  if (keyCode == 87 || keyCode == 38) {
    dPos = speed;
  } else if (keyCode == 83 || keyCode == 40) {
    dPos = -speed;
  } 
};

document.addEventListener("keyup", onDocumentKeyUp, false);
function onDocumentKeyUp(event) {
  var keyCode = event.which;
  if (keyCode == 87 || keyCode == 38) {
    dPos = 0.0;
  } else if (keyCode == 83 || keyCode == 40) {
    dPos = 0.0;
  } 
};

//************** Ground **************
//The ground
var baseGeometry = new THREE.PlaneBufferGeometry(width, width, resolution, resolution);
baseGeometry.lookAt(new THREE.Vector3(0,1,0));
baseGeometry.verticesNeedUpdate = true;

var groundGeometry = new THREE.PlaneBufferGeometry(width, width, resolution, resolution);
groundGeometry.addAttribute( 'basePosition', baseGeometry.getAttribute("position") );
groundGeometry.lookAt(new THREE.Vector3(0,1,0));
groundGeometry.verticesNeedUpdate = true;

var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
//Ground texture by Ulrick Wery
var groundTexture =  loader.load( 'https://al-ro.github.io/images/planet/ulrick-wery-grassflower.jpg' );
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(repeat, repeat);
groundTexture.offset.set(0,0);
var groundMaterial = new THREE.MeshPhongMaterial({color: 0x999999, map: groundTexture, reflectivity: 0, shininess: 0});

var vertexPrefix = noiseSource + `
uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

float placeOnSphere(vec3 v){
  float theta = acos(v.z/radius);
  float phi = acos(v.x/(radius * sin(theta)));
  float sV = radius * sin(theta) * sin(phi);
  //If undefined, set to default value
  if(sV != sV){
    sV = v.y;
  }
  return sV;
}

float getYPosition(float x, float z){
  vec2 p = vec2(x,z);
  float y = 8.0*snoise(p/150.0);
  y += 8.0*snoise(p/50.0);
  y += 2.0*snoise(p/30.0);
  return y * 0.5;
}

//Three.js src/math/Matrix4.js
mat4 getWorldMatrix(vec4 quaternion, vec3 position, vec3 scale){
  float x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
  float x2 = x + x,	y2 = y + y, z2 = z + z;
  float xx = x * x2, xy = x * y2, xz = x * z2;
  float yy = y * y2, yz = y * z2, zz = z * z2;
  float wx = w * x2, wy = w * y2, wz = w * z2;

  float sx = scale.x, sy = scale.y, sz = scale.z;

  vec4 col_1; 
  vec4 col_2; 
  vec4 col_3; 
  vec4 col_4;

  col_1.x = ( 1.0 - ( yy + zz ) ) * sx;
  col_1.y = ( xy + wz ) * sx;
  col_1.z = ( xz - wy ) * sx;
  col_1.w = 0.0;

  col_2.x = ( xy - wz ) * sy;
  col_2.y = ( 1.0 - ( xx + zz ) ) * sy;
  col_2.z = ( yz + wx ) * sy;
  col_2.w = 0.0;

  col_3.x = ( xz + wy ) * sz;
  col_3.y = ( yz - wx ) * sz;
  col_3.z = ( 1.0 - ( xx + yy ) ) * sz;
  col_3.w = 0.0;

  col_4.x = position.x;
  col_4.y = position.y;
  col_4.z = position.z;
  col_4.w = 1.0;

  return mat4(col_1, col_2, col_3, col_4);
}

//Three.js src/math/Quaternion.js
vec4 setQuaternionFromUnitVectors(vec3 vFrom, vec3 vTo){

  //Assumes direction vectors vFrom and vTo are normalized
  vec4 quaternion;
  float r = dot(vFrom, vTo) + 1.0;

  if (r < 0.000001) {

    r = 0.0;

    if (abs(vFrom.x) > abs(vFrom.z)) {
      quaternion = vec4(-vFrom.y, vFrom.x, 0.0, r);
    }else{
      quaternion = vec4(0.0, -vFrom.z, vFrom.y, r);
    }
  }else{
    quaternion.xyz = cross(vFrom, vTo);
    quaternion.w = r;
  }

  return normalize(quaternion);
}
`;

//************** Ground shader **************
var groundVertexPrefix = vertexPrefix + ` 

attribute vec3 basePosition;
vec3 norm;
vec3 pos;

//Get the position of the ground from the [x,z] coordinates, the sphere and the noise height field
vec3 getPosition(vec3 pos, float epsX, float epsZ){
  vec3 temp;
  temp.x = pos.x + epsX;
  temp.z = pos.z + epsZ;
  temp.y = max(0.0, placeOnSphere(temp)) - radius;
  temp.y += getYPosition(basePosition.x+epsX+delta*floor(posX), basePosition.z+epsZ+delta*floor(posZ));
  return temp;
}

//Find the normal at pos as the cross product of the central-differences in x and z directions
vec3 getNormal(vec3 pos){
  float eps = 1e-1;

  vec3 tempP = getPosition(pos, eps, 0.0);
  vec3 tempN = getPosition(pos, -eps, 0.0);
  
  vec3 slopeX = tempP - tempN;

  tempP = getPosition(pos, 0.0, eps);
  tempN = getPosition(pos, 0.0, -eps);

  vec3 slopeZ = tempP - tempN;

  vec3 norm = normalize(cross(slopeZ, slopeX));
  return norm;
}
`;

var groundShader;
groundMaterial.onBeforeCompile = function ( shader ) {
  shader.uniforms.delta = { value: delta };
  shader.uniforms.posX = { value: pos.x };
  shader.uniforms.posZ = { value: pos.z };
  shader.uniforms.radius = { value: radius };
  shader.uniforms.width = { value: width };
  shader.vertexShader = groundVertexPrefix + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `//https://dev.to/maurobringolf/a-neat-trick-to-compute-modulo-of-negative-numbers-111e
      pos.x = basePosition.x - mod(mod((delta*posX),delta) + delta, delta);
      pos.z = basePosition.z - mod(mod((delta*posZ),delta) + delta, delta);
      pos.y = max(0.0, placeOnSphere(pos)) - radius;
      pos.y += getYPosition(basePosition.x+delta*floor(posX), basePosition.z+delta*floor(posZ));
      vec3 objectNormal = getNormal(pos);
#ifdef USE_TANGENT
      vec3 objectTangent = vec3( tangent.xyz );
#endif`
      );
  shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(pos);`
      );
  groundShader = shader;
};

var ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.castShadow = true; //default is false
ground.receiveShadow = true; //default

ground.geometry.computeVertexNormals();
scene.add(ground);


//************** Trunks **************
var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
//Bark texture by Ulrick Wery
var barkTexture =  loader.load( 'https://al-ro.github.io/images/planet/ulrick-wery-soil.jpg' );
barkTexture.wrapS = THREE.RepeatWrapping;
barkTexture.wrapT = THREE.RepeatWrapping;
barkTexture.offset.set(Math.random(), Math.random());
barkTexture.repeat.set(4, 4);
var trunkMaterial = new THREE.MeshPhongMaterial( {color: 0xbbbbbb, map: barkTexture, reflectivity: 0, shininess: 0, wireframe: false} );

//************** Trunk shader **************
var trunkVertexPrefix = vertexPrefix + `
  attribute vec3 offset;
  attribute float scale;
  mat4 worldMatrix; 
  vec4 quaternion;

  vec4 multiplyQuaternions(vec4 q1, vec4 q2){
    return vec4( q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x,
		-q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y,
		 q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z,
		-q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w);
  }

  float random(vec2 par){
    return fract(sin(dot(par.xy,vec2(12.9898,78.233))) * 43758.5453);
  }
`;

function augmentShader(shader){
  shader.uniforms.delta = { value: delta };
  shader.uniforms.posX = { value: pos.x };
  shader.uniforms.posZ = { value: pos.z };
  shader.uniforms.radius = { value: radius };
  shader.uniforms.width = { value: width };
  shader.vertexShader = trunkVertexPrefix + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `vec3 pos;
      vec3 globalPos;
      vec3 tile;
  
      float angle = 6.28 * random(offset.xz)*0.5;
      vec4 rotateY = vec4(0.0, sin(angle), 0.0, cos(angle));

      globalPos.x = offset.x-posX*delta;
      globalPos.z = offset.z-posZ*delta;

      tile.x = floor((globalPos.x + 0.5 * width) / width);
      tile.z = floor((globalPos.z + 0.5 * width) / width);

      pos.x = globalPos.x - tile.x * width;
      pos.z = globalPos.z - tile.z * width;

      pos.y = max(0.0, placeOnSphere(pos)) - radius;
      pos.y += getYPosition(pos.x + posX*delta, pos.z + posZ*delta)-1.0;

      vec3 targetAxis;
      targetAxis.x = pos.x/radius;
      targetAxis.y = max(0.0, placeOnSphere(pos))/radius;
      targetAxis.z = pos.z/radius;

      quaternion = setQuaternionFromUnitVectors(vec3(0,1,0), targetAxis);
      quaternion = multiplyQuaternions(quaternion, rotateY);

      worldMatrix = getWorldMatrix(quaternion, pos, vec3(scale));

      vec3 objectNormal = normalize((worldMatrix * vec4(normal, 0.0)).xyz);
#ifdef USE_TANGENT
      vec3 objectTangent = vec3( tangent.xyz );
#endif`
      );
  shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = (worldMatrix * vec4(position, 1.0)).xyz;`
);
}

var trunkShader;
trunkMaterial.onBeforeCompile = function ( shader ) {
  augmentShader(shader);
  trunkShader = shader;
};

//Foliage texture is an edited version of work by Kuko Cai
var foliageTexture =  loader.load( 'https://al-ro.github.io/images/planet/foliage_diffuse.jpg' );
var foliageAlpha =  loader.load( 'https://al-ro.github.io/images/planet/foliage_alpha.jpg' );
var foliageMaterial = new THREE.MeshPhongMaterial( {color: 0xdddddd, map: foliageTexture, alphaMap: foliageAlpha, alphaTest: 0.5, side: THREE.DoubleSide, reflectivity: 0, shininess: 0});

var foliageShader;
foliageMaterial.onBeforeCompile = function(shader){
  augmentShader(shader);
  foliageShader = shader;
};
var trunkGeometry = new THREE.ConeBufferGeometry(1, treeHeight, 8, 8);
//trunkGeometry = THREE.BufferGeometryUtils.mergeVertices(trunkGeometry);
console.log(trunkGeometry);
trunkGeometry.translate(0, treeHeight/2, 0);
trunkGeometry.verticesNeedUpdate = true;
trunkGeometry.computeVertexNormals();
for(v = 0; v < trunkGeometry.getAttribute("position").array.length; v++){
  var yPos = trunkGeometry.getAttribute("position").array[3*v+1];
  if(yPos == 0){
    trunkGeometry.getAttribute("position").array[3*v] *= 1.3;
    trunkGeometry.getAttribute("position").array[3*v+2] *= 1.3;
  }	
  if(yPos == 4){
    trunkGeometry.getAttribute("position").array[3*v] *= 1.1;
    trunkGeometry.getAttribute("position").array[3*v+2] *= 1.1;
  }	
  trunkGeometry.getAttribute("position").array[3*v] += Math.sin((treeHeight-yPos)/6)*treeBend;
  trunkGeometry.getAttribute("position").array[3*v+2] += Math.sin((treeHeight-yPos)/6)*treeBend;
}
trunkGeometry.verticesNeedUpdate = true;
trunkGeometry.computeVertexNormals();

var instancedTrunkGeometry = new THREE.InstancedBufferGeometry();

instancedTrunkGeometry.index = trunkGeometry.index;
instancedTrunkGeometry.attributes.position = trunkGeometry.attributes.position;
instancedTrunkGeometry.attributes.uv = trunkGeometry.attributes.uv;
instancedTrunkGeometry.attributes.normal = trunkGeometry.attributes.normal;

var scales = [];
var offsets = [];
var scales_1 = [];
var offsets_1 = [];
var scales_2 = [];
var offsets_2 = [];
var scales_3 = [];
var offsets_3 = [];

//************** Branches **************
var branchBase = new THREE.PlaneBufferGeometry(6,12,2,4);
branchBase.lookAt(new THREE.Vector3(0,1,0));
branchBase.translate(0,0,6);
function backIn(t) {
    let s = 0.5;
    return t * t * ((s + 1) * t - s);
  }
for(v = 3; v < 45; v+=9){
  t = branchBase.getAttribute("position").array[v+2]/12;
  branchBase.getAttribute("position").array[v+1] += bend + bend * backIn(t);//(Math.pow(2, 10 * t - 10));	
}
branchBase.verticesNeedUpdate = true;
branchBase.computeVertexNormals();

function getInstancedBranches(branchCount, angle, rotations){
  var branchGeoms = [];
  for(j = 0; j < branchCount; j++){
    var branchGeometry = branchBase.clone();
    var sc = (branchCount-Math.max(j, 2))/branchCount;
    branchGeometry.translate(0, -bend, 0);
    branchGeometry.rotateX(1-sc+angle);
    branchGeometry.translate(0, bend, 0);
    branchGeometry.translate(0, 0, 0.5);
    branchGeometry.scale(sc, sc, sc);
    branchGeometry.rotateY(Math.random() + j/branchCount * 6.28 * rotations);

    var step = (treeHeight-8)/branchCount;
    branchGeometry.translate(0, 8 + j * step, 0);
    branchGeoms.push(branchGeometry);
  }

  var branchesGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(branchGeoms, true);
  for(v = 0; v < branchesGeometry.getAttribute("position").array.length; v++){
    var yPos = branchesGeometry.getAttribute("position").array[3*v+1];
    branchesGeometry.getAttribute("position").array[3*v] += Math.sin((treeHeight-yPos)/6)*treeBend;
    branchesGeometry.getAttribute("position").array[3*v+2] += Math.sin((treeHeight-yPos)/6)*treeBend;
  }
  branchesGeometry.verticesNeedUpdate = true;
  branchesGeometry.computeVertexNormals();

  var instancedBranchGeometry = new THREE.InstancedBufferGeometry();

  instancedBranchGeometry.index = branchesGeometry.index;
  instancedBranchGeometry.attributes.position = branchesGeometry.attributes.position;
  instancedBranchGeometry.attributes.uv = branchesGeometry.attributes.uv;
  instancedBranchGeometry.attributes.normal = branchesGeometry.attributes.normal;
  return instancedBranchGeometry;
}

var instancedBranchGeometry_1 = getInstancedBranches(30, 0.3, 6.5);
var instancedBranchGeometry_2 = getInstancedBranches(20, 0.0, 6.0);
var instancedBranchGeometry_3 = getInstancedBranches(40, 0.4, 7.5);

var scale;
var treeX;
var treeZ;

for(i = 0; i < treeCount; i++){
  scale = 1.0 - Math.random() * 0.8;

  treeX = width/2-Math.random() * width;
  treeZ = width/2-Math.random() * width;
  offsets.push(treeX, 0, treeZ);
  scales.push(scale);

  if(scale < 0.5){
    offsets_2.push(treeX, 0, treeZ);
    scales_2.push(scale);
  }else if(scale < 0.85){
    offsets_1.push(treeX, 0, treeZ);
    scales_1.push(scale);
  }else{
    offsets_3.push(treeX, 0, treeZ);
    scales_3.push(scale);
  }
}

var offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3);
var scaleAttribute = new THREE.InstancedBufferAttribute( new Float32Array( scales ), 1);
instancedTrunkGeometry.addAttribute( 'offset', offsetAttribute);
instancedTrunkGeometry.addAttribute( 'scale', scaleAttribute);

var offsetAttribute_1 = new THREE.InstancedBufferAttribute( new Float32Array( offsets_1 ), 3);
var scaleAttribute_1 = new THREE.InstancedBufferAttribute( new Float32Array( scales_1 ), 1);
var offsetAttribute_2 = new THREE.InstancedBufferAttribute( new Float32Array( offsets_2 ), 3);
var scaleAttribute_2 = new THREE.InstancedBufferAttribute( new Float32Array( scales_2 ), 1);
var offsetAttribute_3 = new THREE.InstancedBufferAttribute( new Float32Array( offsets_3 ), 3);
var scaleAttribute_3 = new THREE.InstancedBufferAttribute( new Float32Array( scales_3 ), 1);
instancedBranchGeometry_1.addAttribute( 'offset', offsetAttribute_1);
instancedBranchGeometry_1.addAttribute( 'scale', scaleAttribute_1);
instancedBranchGeometry_2.addAttribute( 'offset', offsetAttribute_2);
instancedBranchGeometry_2.addAttribute( 'scale', scaleAttribute_2);
instancedBranchGeometry_3.addAttribute( 'offset', offsetAttribute_3);
instancedBranchGeometry_3.addAttribute( 'scale', scaleAttribute_3);

var trunk = new THREE.Mesh(instancedTrunkGeometry, trunkMaterial);
scene.add(trunk);
var branch_1 = new THREE.Mesh(instancedBranchGeometry_1, foliageMaterial);
scene.add(branch_1);
var branch_2 = new THREE.Mesh(instancedBranchGeometry_2, foliageMaterial);
scene.add(branch_2);
var branch_3 = new THREE.Mesh(instancedBranchGeometry_3, foliageMaterial);
scene.add(branch_3);

var depthMaterial= new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, alphaMap: foliageAlpha, alphaTest: 0.5});
 //var depthMaterial= new THREE.MeshDepthMaterial({shadowSide: THREE.DoubleSide, depthPacking: THREE.RGBADepthPacking, alphaMap: foliageAlpha, alphaTest: 0.5});
var depthShader;
depthMaterial.onBeforeCompile = function ( shader ) {
  shader.uniforms.delta = { value: delta };
  shader.uniforms.posX = { value: pos.x };
  shader.uniforms.posZ = { value: pos.z };
  shader.uniforms.radius = { value: radius };
  shader.uniforms.width = { value: width };
  shader.vertexShader = trunkVertexPrefix + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 pos;
      vec3 globalPos;
      vec3 tile;

      float angle = 6.28 * random(offset.xz)*0.5;
      vec4 rotateY = vec4(0.0, sin(angle), 0.0, cos(angle));

      globalPos.x = offset.x-posX*delta;
      globalPos.z = offset.z-posZ*delta;

      tile.x = floor((globalPos.x + 0.5 * width) / width);
      tile.z = floor((globalPos.z + 0.5 * width) / width);

      pos.x = globalPos.x - tile.x * width;
      pos.z = globalPos.z - tile.z * width;

      pos.y = max(0.0, placeOnSphere(pos)) - radius;
      pos.y += getYPosition(pos.x + posX*delta, pos.z + posZ*delta)-1.0;

      vec3 targetAxis;
      targetAxis.x = pos.x/radius;
      targetAxis.y = max(0.0, placeOnSphere(pos))/radius;
      targetAxis.z = pos.z/radius;

      quaternion = setQuaternionFromUnitVectors(vec3(0,1,0), targetAxis);
      quaternion = multiplyQuaternions(quaternion, rotateY);

      worldMatrix = getWorldMatrix(quaternion, pos, vec3(scale));

      vec3 transformed = (worldMatrix * vec4(position, 1.0)).xyz;`
  );
  depthShader = shader;
};

trunk.customDepthMaterial = depthMaterial;
branch_1.customDepthMaterial = depthMaterial;
branch_2.customDepthMaterial = depthMaterial;
branch_3.customDepthMaterial = depthMaterial;

trunk.castShadow = true; //default is false
trunk.receiveShadow = true; //default
branch_1.castShadow = true; //default is false
branch_1.receiveShadow = true; //default
branch_2.castShadow = true; //default is false
branch_2.receiveShadow = true; //default
branch_3.castShadow = true; //default is false
branch_3.receiveShadow = true; //default

var wispGeometry = new THREE.SphereGeometry(0.5,32,32);
var wispMaterial = new THREE.MeshBasicMaterial();
var wisp = new THREE.Mesh(wispGeometry, wispMaterial);
wisp.translateY(28);
//wisp.castShadow = true; //default is false
//wisp.receiveShadow = true; //default
scene.add(wisp);

//************** Update **************

var time = 0;
function update(pos){

  groundTexture.offset.set((delta*Math.floor(pos.x))/(width/repeat), (-delta*Math.floor(pos.z))/(width/repeat));

  if(groundShader){
    groundShader.uniforms.posX.value = pos.x;
    groundShader.uniforms.posZ.value = pos.z;
    groundShader.uniforms.delta.value = delta;
    groundShader.uniforms.radius.value = radius;
  }
  if(trunkShader){
    trunkShader.uniforms.posX.value = pos.x;
    trunkShader.uniforms.posZ.value = pos.z;
    trunkShader.uniforms.delta.value = delta;
    trunkShader.uniforms.radius.value = radius;
  }
  if(foliageShader){
    foliageShader.uniforms.posX.value = pos.x;
    foliageShader.uniforms.posZ.value = pos.z;
    foliageShader.uniforms.delta.value = delta;
    foliageShader.uniforms.radius.value = radius;
  }
  if(depthShader){
    depthShader.uniforms.posX.value = pos.x;
    depthShader.uniforms.posZ.value = pos.z;
    depthShader.uniforms.delta.value = delta;
    depthShader.uniforms.radius.value = radius;
  }

  time += 1;
  wisp.position.y = (12 + Math.sin(time*0.1));
  wispLight.position.y = wisp.position.y;

}

//Adjust the shadow camera frustum according to the camera's distance from the scene to create more detailed shadows when zoomed in.
function setShadowCamera(){
  var distance = Math.max(40, Math.sqrt(camera.position.x * camera.position.x + camera.position.y * camera.position.y + camera.position.z * camera.position.z));
  directionalLight.shadow.camera.top = distance;
  directionalLight.shadow.camera.bottom = -distance;
  directionalLight.shadow.camera.left = 1.5*-distance;
  directionalLight.shadow.camera.right = 1.5*distance;
  directionalLight.shadow.camera.updateProjectionMatrix();
}

//************** Draw **************
var vector = new THREE.Vector3();
var length;
function draw(){
  stats.begin();
  setShadowCamera();
  camera.getWorldDirection(vector);
  length = Math.sqrt(vector.x*vector.x + vector.z*vector.z);
  vector.x /= length;
  vector.z /= length;
  del.x = vector.x * dPos;
  del.z = vector.z * dPos;
  pos.x += del.x;
  pos.z += del.z;
  update(pos);
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(draw);
}

draw();
