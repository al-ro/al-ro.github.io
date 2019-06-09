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

var width = 400;
var resolution = 32;

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h, false);
renderer.setClearColor( 0x66deff, 1);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);
camera.position.set(-50, 10, -50);
scene.add(camera);

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

//Lights
var light_1 = new THREE.AmbientLight(0xffffff, 1.0); 
scene.add(light_1);

light_2 = new THREE.DirectionalLight(0xffffff, 1.0);
light_2.position.set(1, 1, 1);
scene.add(light_2);


var rotate = false;
//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = rotate;
controls.autoRotateSpeed = 0.5;

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

var radius = 210;
var repeat = 10;
//Dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'radius').min(10).max(400).step(5);
gui.add(this, 'repeat').min(1).max(400).step(1);



//Use noise.js library to generate a grid of 2D simplex noise values
noise.seed(Math.random());

function getYPosition(x, z){
  var y = 8*noise.simplex2(x/150, z/150);
  y += 4*noise.simplex2(x/50, z/50);
  y += 2*noise.simplex2(x/30, z/30);
  return y;
};

//The ground
var base_geometry = new THREE.PlaneGeometry(width, width, resolution, resolution);
base_geometry.lookAt(new THREE.Vector3(0,1,0));
base_geometry.verticesNeedUpdate = true;

var ground_geometry = new THREE.PlaneGeometry(width, width, resolution, resolution);
ground_geometry.lookAt(new THREE.Vector3(0,1,0));
ground_geometry.verticesNeedUpdate = true;

var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
var texture =  loader.load( 'https://al-ro.github.io/images/lighting/diffuse.jpg' );
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(repeat, repeat);
var ground_material = new THREE.MeshPhongMaterial({color: 0xffffff, map: texture, shading: THREE.FlatShading});
var ground = new THREE.Mesh(ground_geometry, ground_material);

ground.geometry.computeVertexNormals();
scene.add(ground);


function placeOnSphere(v){
  var theta = Math.acos(v.z/radius);
  var phi = Math.acos(v.x/(radius * Math.sin(theta)));
  var s_v = radius * Math.sin(theta) * Math.sin(phi);
  if (s_v != s_v){
    s_v = v.y	
  }
  return s_v;
}

var delta = width/resolution;
var c = 10;
//----------DRAW----------//
var time = 0;
function draw(){
  stats.begin();
  time += 0.01* (width/10);
  c += 0.001;
  var difference = 0;
  var dist = 0;
  for (var i = 0; i < ground.geometry.vertices.length; i++){
    var v = ground.geometry.vertices[i];
    var b = base_geometry.vertices[i];
    v.x = b.x - (delta*c%delta);
    v.z = b.z - (delta*c%delta);
    v.y = Math.max(0, placeOnSphere(v)) - radius;
    v.y += getYPosition(b.x+delta*Math.floor(c), b.z+delta*Math.floor(c)); 
  }
texture.repeat.set(repeat, repeat);
  texture.offset.set((delta*Math.floor(c))/(width/repeat), (-delta*Math.floor(c))/(width/repeat));
  //ground.geometry.computeVertexNormals();
  ground_geometry.verticesNeedUpdate = true;
  renderer.render(scene, camera);
  if(rotate){
    controls.update();
  }
  stats.end();
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
