//Based on:
//https://aerotwist.com/tutorials/creating-particles-with-three-js/
//http://petewerner.blogspot.co.uk/2015/02/intro-to-curl-noise.html

var canvas = document.getElementById("canvas_1");
var cont = document.getElementById("cc_1");

var TWO_PI = Math.PI*2;
  const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      //|| navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
      );

//Spatial variables
var width = 2000;
var height = 2000;
var depth = 2000;
var centre = [width/2,height/2, depth/2];

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

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w,h,false);
renderer.setClearColor(0x111b44);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 200000);

camera.position.set(-2*width, -2*height, -2*width);
camera.lookAt(new THREE.Vector3(centre[0], centre[1], centre[2]));

scene.add(camera);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.maxDistance = 200000-5*width;
controls.minDistance = 100;
controls.autoRotate = rotate;

//Particles
var particles = new THREE.Geometry();
//Initial ember colour
var colour = 0xff6800;

//Add texture to particles
//https://stackoverflow.com/questions/24087757/three-js-and-loading-a-cross-domain-image
THREE.ImageUtils.crossOrigin = '';
var texture = THREE.ImageUtils.loadTexture("http://res.cloudinary.com/al-ro/image/upload/c_scale,h_512/v1518264821/ember_ihk6rp.png");

//Variable size for particle material
var size = 50;

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
  var particle = {
    x: width/2 - Math.random() * width,
    y: height/2 - Math.random() * height,
    z: depth/2 - Math.random() * depth,
    vel_x: 0.5 - Math.random(),
    vel_y: 0.5 - Math.random(),
    vel_z: 0.5 - Math.random()
  };
  particles.vertices.push(particle);
}

var particleSystem = new THREE.Points(particles, material);
scene.add(particleSystem);

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

  for(i = 0; i < particleCount; i++){

    var x = 0.5 - Math.random();
    var y = 0.5 - Math.random();
    var z = 0.5 - Math.random();

    particles.vertices[i].vel_x = x;
    particles.vertices[i].vel_y = y;
    particles.vertices[i].vel_z = z;

    particles.vertices[i].x = width/2 - Math.random() * width;
    particles.vertices[i].y = height/2 - Math.random() * height;
    particles.vertices[i].z = depth/2 - Math.random() * depth;
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
var noise_ = [];

//Use noise.js library to generate a grid of 3D simplex noise values
try {
  noise.seed(Math.random());
}
catch(err) {
  console.log(err.message);
}

//Find the curl of the noise field based on on the noise value at the location of a particle
function computeCurl(x, y, z){
  var eps = 0.0001;

  var curl = new THREE.Vector3();

  //Find rate of change in YZ plane
  var n1 = noise.simplex3(x, y + eps, z); 
  var n2 = noise.simplex3(x, y - eps, z); 
  //Average to find approximate derivative
  var a = (n1 - n2)/(2 * eps);
  var n1 = noise.simplex3(x, y, z + eps); 
  var n2 = noise.simplex3(x, y, z - eps); 
  //Average to find approximate derivative
  var b = (n1 - n2)/(2 * eps);
  curl.x = a - b;

  //Find rate of change in XZ plane
  n1 = noise.simplex3(x, y, z + eps); 
  n2 = noise.simplex3(x, y, z - eps); 
  //Average to find approximate derivative
  a = (n1 - n2)/(2 * eps);
  n1 = noise.simplex3(x + eps, y, z); 
  n2 = noise.simplex3(x + eps, y, z); 
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
  curl.z=a-b;

  return curl;
}

//----------MOVE----------//
function move(){
  for(i = 0; i < particleCount; i++){

    //Find curl value at partile location
    var curl = computeCurl(particles.vertices[i].x/step, particles.vertices[i].y/step, particles.vertices[i].z/step);

    //Update particle velocity according to curl value and speed
    particles.vertices[i].vel_x = speed*curl.x;
    particles.vertices[i].vel_y = speed*curl.y;
    particles.vertices[i].vel_z = speed*curl.z;

    //Update particle position based on velocity
    particles.vertices[i].x += particles.vertices[i].vel_x ;
    particles.vertices[i].y += particles.vertices[i].vel_y ;
    particles.vertices[i].z += particles.vertices[i].vel_z ;

    //Boudnary conditions
    //If a particle gets too far away from (0,0,0), reset it to a random location
    var dist = Math.sqrt(particles.vertices[i].x * particles.vertices[i].x + particles.vertices[i].y * particles.vertices[i].y + particles.vertices[i].z * particles.vertices[i].z);
    if(dist > 5*width){
      particles.vertices[i].x = width/2 - Math.random() * width;
      particles.vertices[i].y = height/2 - Math.random() * height;
      particles.vertices[i].z = depth/2 - Math.random() * depth; 
    }
  }
}

//----------DRAW----------//
function draw(){
  if(rotate){
    controls.update();
  }
  move();
  //Redraws partciles
  particles.verticesNeedUpdate = true;
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
