//Based on:
//https://aerotwist.com/tutorials/creating-particles-with-three-js/
//http://petewerner.blogspot.co.uk/2015/02/intro-to-curl-noise.html

var canvas = document.getElementById("canvas_1");

var TWO_PI = Math.PI*2;
  const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
      );

//Spatial variables
var width = 2000;
var height = 2000;
var depth = 2000;

var particleCount;

if(mobile){
  particleCount = 2000;
}else{
  particleCount = 25000;
}

var speed = 5;
//Noise field zoom
var step = 2000;
//Camera rotate
var rotate = true;
//Offset to counteract noise flattening when sampling on three planes
var offset = 0.0;

var w = canvas.clientWidth;
var h = canvas.clientHeight;
var ratio = w/h;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w,h,false);
renderer.setClearColor(0x111b44);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 200000);

camera.position.set(-2*width, -2*height, -2*width);

scene.add(camera);

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  if(!isInFullscreen()){
    h = w/1.6;
  }
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.maxDistance = 200000-5*width;
controls.minDistance = 100;
controls.autoRotate = rotate;

//Particles
var particles = [];
var velocities = [];
var geometry = new THREE.BufferGeometry();
//Initial ember colour
var colour = 0xff6800;

//Add texture to particles
var loader = new THREE.TextureLoader();
//https://stackoverflow.com/questions/24087757/three-js-and-loading-a-cross-domain-image
THREE.ImageUtils.crossOrigin = '';
var texture =  loader.load('https://al-ro.github.io/images/embers/ember_texture.png');

//Variable size for particle material
var size = 70;

if(mobile){
  size = 150;
}

var material = new THREE.PointsMaterial({
  color: 0xff6800,
    size: size,
    transparent: true,
    opacity: 1.0,
    map: texture,
    //Other particles show through transparent sections of texture
    depthTest: false,
    //For glow effect
    blending: THREE.AdditiveBlending
});

//Generate random particles
for(i = 0; i < particleCount; i++){

    let x = width/2 - Math.random() * width;
    let y = height/2 - Math.random() * height;
    let z = depth/2 - Math.random() * depth;
    let vel_x = 0.5 - Math.random();
    let vel_y = 0.5 - Math.random();
    let vel_z = 0.5 - Math.random();
  
  particles.push(x,y,z);
	velocities.push(vel_x,vel_y,vel_z);
}

geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( particles, 3 ) );

const points = new THREE.Points( geometry, material );

scene.add( points );
//-----------GUI-----------//
//dat.gui library controls

var reset_button = { reset:function(){ 
  //Use noise.js library to generate a grid of 3D simplex noise values
  try {
    noise.seed(Math.random());
  }
  catch(err) {
    console.log(err.message);
  }

  for(i = 0; i < particleCount * 3.0; i+=3){

    var x = 0.5 - Math.random();
    var y = 0.5 - Math.random();
    var z = 0.5 - Math.random();

    velocities[i] = x;
    velocities[i+1] = y;
    velocities[i+2] = z;

    particles[i] = width/2 - Math.random() * width;
    particles[i+1] = height/2 - Math.random() * height;
    particles[i+2] = depth/2 - Math.random() * depth;

  }

}};

var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'speed').min(0).max(10).step(1).listen();
gui.add(this, 'step').min(10).max(3000).step(10).listen();
gui.add(this, 'size').min(1).max(300).step(1).listen().onChange(function(value) { setSize();} );;
if(!mobile){
  gui.addColor(this, 'colour').listen().onChange(function(value) { setColour();} );
}
gui.add(this, 'offset').min(0.0).max(1.0).step(0.1).listen();
gui.add(this, 'rotate').listen().onChange(function(value){ controls.autoRotate = rotate;});
gui.add(reset_button, 'reset');
gui.close();

function setSize(){
  material.size = size;
}

function setColour(){
  material.color.setHex(colour);
}

//----------NOISE---------//

//Use noise.js library to generate a grid of 3D simplex noise values
try {
  noise.seed(Math.random());
}
catch(err) {
  console.log(err.message);
}

function fbm(x, y, z){
  let n = 0;
  let l = 1.0;
  let totalWeight = 0.0;
  let amplitude = 1.0;
  for(let i = 0; i < 1; i++){
    n += amplitude * noise.simplex3(x*l, y*l, z*l);
    totalWeight += amplitude;
    amplitude *= 0.5;
    l *= 2.0;
  }
  n /= totalWeight;
  return n;
}


//Find the curl of the noise field based on on the noise value at the location of a particle
function computeCurl(x, y, z){
  var eps = 0.0001;

  x += 1000.0*offset;
  y -= 1000.0*offset;

  var curl = new THREE.Vector3();

  //Find rate of change in YZ plane
  var n1 = fbm(x, y + eps, z); 
  var n2 = fbm(x, y - eps, z); 
  //Average to find approximate derivative
  var a = (n1 - n2)/(2 * eps);
  var n1 = fbm(x, y, z + eps); 
  var n2 = fbm(x, y, z - eps); 
  //Average to find approximate derivative
  var b = (n1 - n2)/(2 * eps);
  curl.x = a - b;

  //Find rate of change in ZX plane
  n1 = fbm(x, y, z + eps); 
  n2 = fbm(x, y, z - eps); 
  //Average to find approximate derivative
  a = (n1 - n2)/(2 * eps);
  n1 = fbm(x + eps, y, z); 
  n2 = fbm(x - eps, y, z); 
  //Average to find approximate derivative
  b = (n1 - n2)/(2 * eps);
  curl.y = a - b;

  //Find rate of change in XY plane
  n1 = noise.simplex3(x + eps, y, z); 
  n2 = noise.simplex3(x - eps, y, z); 
  //Average to find approximate derivative
  a = (n1 - n2)/(2 * eps);
  n1 = noise.simplex3(x, y + eps, z); 
  n2 = noise.simplex3(x, y - eps, z); 
  //Average to find approximate derivative
  b = (n1 - n2)/(2 * eps);
  curl.z = a - b;

  return curl;
}

//----------MOVE----------//
function move(){
  for(i = 0; i < particleCount * 3.0; i+=3){

    //Find curl value at partile location
    var curl = computeCurl(particles[i]/step, particles[i+1]/step, particles[i+2]/step);

    //Update particle velocity according to curl value and speed
    velocities[i] = speed*curl.x;
    velocities[i+1] = speed*curl.y;
    velocities[i+2] = speed*curl.z;

    //Update particle position based on velocity
    particles[i] += velocities[i];
    particles[i+1] += velocities[i+1];
    particles[i+2] += velocities[i+2];

    //Boudnary conditions
    //If a particle gets too far away from (0,0,0), reset it to a random location
    var dist = Math.sqrt(particles[i] * particles[i] + particles[i+1] * particles[i+1] + particles[i+2] * particles[i+2]);
    if(dist > 5.0*width){
      particles[i] = width/2 - Math.random() * width;
      particles[i+1] = height/2 - Math.random() * height;
      particles[i+2] = depth/2 - Math.random() * depth; 
    }
  }
	
	geometry.getAttribute('position').copyArray(particles);
	geometry.getAttribute('position').needsUpdate = true;
	
}
//----------DRAW----------//
function draw(){
	if(rotate){
    controls.update();
  }
  move();
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
