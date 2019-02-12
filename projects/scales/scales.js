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

var origin = new THREE.Vector3(0,0,0);
var x_axis = new THREE.Vector3(1,0,0);
var y_axis = new THREE.Vector3(0,1,0);
var z_axis = new THREE.Vector3(0,0,1);

var scales = [];

var scaleCount;

if(mobile){
  scaleCount = 20;
}else{
  scaleCount = 40;
}

var radius = 10
var rings = 10
var density = 100

//Speed of falling
var fall = 0;
//Rotation around z axis
var swirl = 0;
//Noise field zoom
var step = 100;
//Camera rotate
var rotate = false;

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setSize(w,h,false);
renderer.setClearColor(0x114457, 0.5);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 200000);

camera.up.set(0,0,1);
camera.position.set(2*radius, -radius, radius/4);
camera.lookAt(new THREE.Vector3(centre[0], centre[1], centre[2]));

scene.add(camera);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );
//controls.maxDistance = 2*width;
//controls.minDistance = width/2;
controls.autoRotate = rotate;

//Lights
var light_1;
light_1 = new THREE.HemisphereLight( 0x114417, 0xffffff, 0.3);
light_1.position.set(0, 0, -depth);
light_1.lookAt(0, 0, -1);
scene.add(light_1);

light_2 = new THREE.DirectionalLight(0xff0000, 1.0);
light_2.position.set(-1, 1, 1);
scene.add(light_2);
var light_3;
light_3 = new THREE.DirectionalLight(0x00ff00, 1.0);
light_3.position.set(-1, -1, 1);
scene.add(light_3);
var light_4;
light_4 = new THREE.DirectionalLight(0x3333ff, 1.0);
light_4.position.set(1, -1, 1);
scene.add(light_4);

//Define hexagon shape for scales
var geom = new THREE.Geometry();

//Brackets for purely aesthetic considerations
{
  geom.vertices.push(
      new THREE.Vector3(   -0.5,  0.86, 0 ),
      new THREE.Vector3(    0.5,  0.86, 0 ),
      new THREE.Vector3(    0.93, 0.0,  0 ),
      new THREE.Vector3(    0.5, -0.86, 0 ),
      new THREE.Vector3(   -0.5, -0.86, 0 ),
      new THREE.Vector3(   -0.93, 0.0, 0 )
      );
}

geom.faces.push( new THREE.Face3( 0, 1, 2 ) );
geom.faces.push( new THREE.Face3( 0, 2, 3 ) );
geom.faces.push( new THREE.Face3( 0, 3, 4 ) );
geom.faces.push( new THREE.Face3( 0, 4, 5 ) );

geom.scale(1,1,1);
geom.up = [0,0,1];

var colour = 0x939393;

var material = new THREE.MeshPhongMaterial( {color: colour, emissive: colour, emissiveIntensity: 0.2, specular: 0xffffff, shininess: 100, side: THREE.DoubleSide, shading: THREE.FlatShading} );

//Set location on sphere given a polar angle, an azimuthal angle and a radius 
function setLocationOnSphere(theta, phi, radius, scale){

  scale.geo.position.x = radius * Math.sin(theta) * Math.cos(phi);
  scale.geo.position.y = radius * Math.sin(theta) * Math.sin(phi);
  scale.geo.position.z = radius * Math.cos(theta);

}

//Generate scales on a sphere
var a = (4 * Math.PI * (radius * radius)) / scaleCount;
var d = Math.sqrt(a);
var M_theta = 40;//Math.round(Math.PI/d);
var d_theta = Math.PI/M_theta;
var d_phi = a / d_theta;
var theta;
var phi;
var M_phi;

for(i = 0; i < M_theta; i++){

  theta = Math.PI * (i + 0.5) / M_theta;
  M_phi = 40;//Math.round(2 * Math.PI * Math.sin(theta) / d_phi);
  for(j = 0; j < M_phi; j++){
    phi = 2 * Math.PI * j / M_phi;

    var g_ = new THREE.Mesh(geom, material);
    var scale = {
      vel_x: 0,
      vel_y: 0,
      vel_z: 0,
      geo: g_
    };

    setLocationOnSphere(theta, phi, radius, scale);
    rx = scale.geo.position.x / radius;
    ry = scale.geo.position.y / radius;
    rz = scale.geo.position.z / radius;

    scale.geo.lookAt(origin);

    scales.push(scale);
  } 
}

for(i = 0; i < scales.length; i++){
  scene.add(scales[i].geo);
}


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

  for(i = 0; i < scales.length; i++){

    var x = 0.5 - Math.random();
    var y = 0.5 - Math.random();
    var z = 0.5 - Math.random();

    scales[i].vel_x = x;
    scales[i].vel_y = y;
    scales[i].vel_z = z;

    scales[i].geo.position.x = width/2 - Math.random() * width;
    scales[i].geo.position.y = height/2 - Math.random() * height;
    scales[i].geo.position.z = depth/2 - Math.random() * depth;

  }

}};


var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'fall').min(0).max(10).step(1).listen();
gui.add(this, 'swirl').min(0).max(10).step(1).listen();
if(!mobile){
  gui.addColor(this, 'colour').listen().onChange(function(value) { setColour();} );
}
gui.add(this, 'rotate').listen().onChange(function(value){ controls.autoRotate = rotate;});
gui.add(reset_button, 'reset');
gui.close();

function setColour(){
  material.color.setHex(colour);
}

//USed for scale position
var A = {
  x: 0,
  y: 0,
  z: 0
};

//Vector pointing up
var B = {
  x: 0,
  y: 0,
  z: 1
}

//Vector tangent to A and B to define movement around B
var n = {
  x: 0,
  y: 0,
  z: 0
};;

//cross product
function cross(A, B, n){
  n.x = A.y * B.z - B.y * A.z;
  n.y = A.z * B.x - B.z * A.x;
  n.z = A.x * B.y - B.x * A.y;
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

//Find the curl of the noise field based on on the noise value at the location of a scale
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
  curl.z = a - b;

  return curl;
}

//----------MOVE----------//
function move(){
  for(i = 0; i < scales.length; i++){
    //scales[i].geo.lookAt(origin);
    
    x_ = scales[i].geo.rotation.x;
    y_ = scales[i].geo.rotation.y;
    z_ = scales[i].geo.rotation.z;


    scales[i].geo.rotation.x = 0;
    scales[i].geo.rotation.y = 0;
    scales[i].geo.rotation.z = 0;
    scales[i].geo.translateOnAxis(x_axis, 10);
    scales[i].geo.rotation.x += 0.01;
    scales[i].geo.translateOnAxis(x_axis, -10);
    scales[i].geo.rotation.x += x_;
    scales[i].geo.rotation.y += y_;
    scales[i].geo.rotation.z += z_;


    A.x = scales[i].geo.position.x;
    A.y = scales[i].geo.position.y;
    A.z = scales[i].geo.position.z;

    cross(A, B, n);
    var mag_n = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    scales[i].vel_x = swirl * (n.x/mag_n);
    scales[i].vel_y = swirl * (n.y/mag_n);

    var curl = computeCurl(scales[i].geo.position.x/step, scales[i].geo.position.y/step, scales[i].geo.position.z/step);
    var mag_c = Math.sqrt(curl.x * curl.x + curl.y * curl.y + curl.z * curl.z);

    //Update scale velocity according to curl direction and fall
    scales[i].vel_x -= (fall/4)*(curl.x/mag_c);
    scales[i].vel_y -= (fall/4)*(curl.y/mag_c);

    if(fall > 0){
      scales[i].vel_z -= (fall/60);
      scales[i].vel_z = Math.max(scales[i].vel_z, -fall);
    }else{
      scales[i].vel_z = 0;
    }

    //scales[i].geo.rotation.x += scales[i].vel_x/10+scales[i].vel_z/60;
    //scales[i].geo.rotation.y += scales[i].vel_y/10+scales[i].vel_z/60;
/*

    if(scales[i].geo.position.z < -(depth/2) || Math.sqrt(A.x * A.x + A.y * A.y) > width){
      //If outside bounding volume, reset to top
      scales[i].geo.position.x = width/2 - Math.random() * width; 
      scales[i].geo.position.y = height/2 - Math.random() * height; 
      scales[i].geo.position.z = depth/2; 
      scales[i].vel_x = 0;
      scales[i].vel_y = 0;

    }else{
      //Update scale position based on velocity
      scales[i].geo.position.x += scales[i].vel_x ;
      scales[i].geo.position.y += scales[i].vel_y ;
      scales[i].geo.position.z += scales[i].vel_z ;
    }*/
  }
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
