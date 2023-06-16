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
  particleCount = 15000;
}

var speed = 20;
//Noise field zoom
var step = 1500;
//Camera rotate
var rotate = true;

var oldMethod = false;

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

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('canvas_container').appendChild(stats.domElement);

//Particles
var particles = [];
var velocities = [];
var times = [];
var lifetimes = [];
var positions = [];
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

  var x = width/2 - Math.random() * width;
  var y = height/2 - Math.random() * height;
  var z = depth/2 - Math.random() * depth;
  
  particles.push(x,y,z);
  positions.push(x,y,z);
  velocities.push( 0.5 - Math.random(), 0.5 - Math.random(), 0.5 - Math.random());

  times.push(0);
  lifetimes.push(3.0 * Math.random());
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
  }catch(err) {
    console.log(err.message);
  }

  for(i = 0; i < particleCount * 3.0; i += 3){

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
gui.add(this, 'speed').min(0).max(100).step(1).listen();
gui.add(this, 'step').min(10).max(3000).step(10).listen();
gui.add(this, 'size').min(1).max(300).step(1).listen().onChange(() => setSize() );
gui.add(this, 'rotate').listen().onChange(() => {controls.autoRotate = rotate});
gui.add(this, 'oldMethod');
gui.add(reset_button, 'reset');
if(!mobile){
  gui.addColor(this, 'colour').listen().onChange(function(value) { setColour();} );
}
gui.close();

function setSize(){
  material.size = size;
}

function setColour(){
  material.color.setHex(colour);
}

function normalize(v){
  var length = Math.hypot(v[0], v[1], v[2]);
  return [v[0]/length, v[1]/length, v[2]/length];
}

function cross(a, b){
  return [ a[1] * b[2] - a[2] * b[1],
	   a[2] * b[0] - a[0] * b[2],
	   a[0] * b[1] - a[1] * b[0]
	 ]; 
}

//Use noise.js library to generate a grid of 3D simplex noise values
try {
  noise.seed(Math.random());
}
catch(err) {
  console.log(err.message);
}

function noise3D(x, y, z){
  return[noise.simplex3(x, y, z), noise.simplex3(x, y, z+1000.0), noise.simplex3(x+1000.0, y, z)];
}

//Find the curl of the noise field based on on the noise value at the location of a particle
function computeCurl(x, y, z){
  var eps = 1e-4;
  var curl = [0, 0, 0];

  if(!oldMethod){

    //Find rate of change in X plane
    var n1 = noise.simplex3(x + eps, y, z); 
    var n2 = noise.simplex3(x - eps, y, z); 
    //Average to find approximate derivative
    var a = (n1 - n2)/(2 * eps);
  
    //Find rate of change in Y plane
    n1 = noise.simplex3(x, y + eps, z); 
    n2 = noise.simplex3(x, y - eps, z); 
    //Average to find approximate derivative
    var b = (n1 - n2)/(2 * eps);
  
    //Find rate of change in Z plane
    n1 = noise.simplex3(x, y, z + eps); 
    n2 = noise.simplex3(x, y, z - eps); 
    //Average to find approximate derivative
    var c = (n1 - n2)/(2 * eps);
  
    var noiseGrad0 = [a, b, c];
  
    // Offset position for second noise read
    x += 10.5;
    y += 10.5;
    z += 10.5;
  
    //Find rate of change in X
    n1 = noise.simplex3(x + eps, y, z); 
    n2 = noise.simplex3(x - eps, y, z); 
    //Average to find approximate derivative
    a = (n1 - n2)/(2 * eps);
  
    //Find rate of change in Y
    n1 = noise.simplex3(x, y + eps, z); 
    n2 = noise.simplex3(x, y - eps, z); 
    //Average to find approximate derivative
    b = (n1 - n2)/(2 * eps);
  
    //Find rate of change in Z
    n1 = noise.simplex3(x, y, z + eps); 
    n2 = noise.simplex3(x, y, z - eps); 
    //Average to find approximate derivative
    c = (n1 - n2)/(2 * eps);
  
    var noiseGrad1 = [a, b, c];
  
    noiseGrad1 = normalize(noiseGrad1);
    noiseGrad1 = normalize(noiseGrad1);
    curl = cross(noiseGrad0, noiseGrad1);

  }else{

    //Find rate of change in X
    var n1 = noise3D(x + eps, y, z); 
    var n2 = noise3D(x - eps, y, z);
    var dx = [n1[0] - n2[0], n1[1] - n2[1], n1[2] - n2[2]];

    //Find rate of change in Y
    n1 = noise3D(x, y + eps, z); 
    n2 = noise3D(x, y - eps, z);
    var dy = [n1[0] - n2[0], n1[1] - n2[1], n1[2] - n2[2]];

    //Find rate of change in Z
    n1 = noise3D(x, y, z + eps); 
    n2 = noise3D(x, y, z - eps);
    var dz = [n1[0] - n2[0], n1[1] - n2[1], n1[2] - n2[2]];

    curl[0] = (dy[2] - dz[1]) / (2.0*eps);
    curl[1] = (dz[0] - dx[2]) / (2.0*eps);
    curl[2] = (dx[1] - dy[0]) / (2.0*eps);

  }
  return normalize(curl);
}

//----------MOVE----------//
function move(dT){
  for(i = 0; i < particleCount * 3.0; i += 3){

    //Find curl value at partile location
    var curl = computeCurl(particles[i]/step, particles[i+1]/step, particles[i+2]/step);

    if(curl[0] != curl[0] || curl[1] != curl[1] || curl[2] != curl[2]){
      curl = [1,0,0];
    }
    //Update particle velocity according to curl value and speed
    velocities[i] = speed*curl[0]
    velocities[i+1] = speed*curl[1];
    velocities[i+2] = speed*curl[2];

    //Update particle position based on velocity
    particles[i] += velocities[i];
    particles[i+1] += velocities[i+1];
    particles[i+2] += velocities[i+2];

    times[Math.floor(i/3)] += dT;

    //Boundary conditions
    //If a particle gets too far away from the origin or has existed for a set time, reset it to a random location
    var dist = particles[i] * particles[i] + particles[i+1] * particles[i+1] + particles[i+2] * particles[i+2];
    if(dist > (25.0 * width * width) || times[Math.floor(i/3)] > lifetimes[Math.floor(i/3)]){
      particles[i] = positions[i] + times[Math.floor(i/3)];
      particles[i+1] = positions[i+1] + times[Math.floor(i/3)];
      particles[i+2] = positions[i+2] +times[Math.floor(i/3)];
      times[Math.floor(i/3)] = 0.0;
    }
  }
	
	geometry.getAttribute('position').copyArray(particles);
	geometry.getAttribute('position').needsUpdate = true;
	
}

var lastFrame = Date.now();
var thisFrame;
var time = 0;

//----------DRAW----------//
function draw(){

  stats.begin();

	if(rotate){
    controls.update();
  }

  thisFrame = Date.now();

  var dT = (thisFrame - lastFrame)/1000;
  time += dT;
  lastFrame = thisFrame;

  move(dT);
  renderer.render(scene, camera);

  stats.end();

  requestAnimationFrame(draw);
}

draw();
