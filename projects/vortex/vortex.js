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

var flakes = [];

var flakeCount;

if(mobile){
  flakeCount = 2000;
}else{
  flakeCount = 2000;
}

var speed = 5;
//Noise field zoom
var step = 10;
//Camera rotate
var rotate = false;

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setSize(w,h,false);
renderer.setClearColor(0x114457, 1);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 200000);

camera.up.set(0,0,1);
camera.position.set(width/2, -height/2, -depth/2);
camera.lookAt(new THREE.Vector3(centre[0], centre[1], centre[2]));

scene.add(camera);
//Lights
var light_1 = new THREE.AmbientLight( 0xffffff, 1.8); 
//scene.add(light_1);
var light_2;
light_2 = new THREE.DirectionalLight(0xff0000, 2.0);
light_2.position.set(0, -1, 0);
scene.add(light_2);
var light_3;
light_3 = new THREE.DirectionalLight(0x00ff00, 2.0);
light_3.position.set(-1, 1, 0);
scene.add(light_3);
var light_4;
light_4 = new THREE.DirectionalLight(0x3333ff, 2.0);
light_4.position.set(0, 1, -1);
scene.add(light_4);
var light_5;
light_5 = new THREE.DirectionalLight(0xffff00, 2.0);
light_5.position.set(1, -1, 1);
scene.add(light_5);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.maxDistance = 200000-5*width;
controls.minDistance = 100;
controls.autoRotate = rotate;

var material_1 = new THREE.MeshPhongMaterial( { color: 0x00AAFF, shininess: 30, specular: 0x111111  } );

var loader = new THREE.STLLoader();
loader.load( "./ballerina_1.stl", function ( event ) {

    var geometry = event.content;
    geometry.computeTangents();
    var mesh = new THREE.Mesh( geometry, material_1 );

    mesh.position.set( 0, -10, 0 );
    mesh.rotation.set( - Math.PI / 2, 0, 0 );
    mesh.scale.set( 15, 15, 15 );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    objects.push(mesh);
    scene.add( mesh );

} );


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

geom.scale(7,7,7);

var colour = 0xffffff;

var material = new THREE.MeshPhongMaterial( {color: colour, specular: 0xff0000, shininess: 100, side: THREE.DoubleSide, shading: THREE.FlatShading} );


//Generate random flakes
for(i = 0; i < flakeCount; i++){

  var g_ = new THREE.Mesh(geom, material);

  var x = 0.5 - Math.random();
  var y = 0.5 - Math.random();
  var z = 0.5 - Math.random();

  var flake = {
    vel_x: x,
    vel_y: y,
    vel_z: z,
    geo: g_
  };

  flake.geo.position.x = width/2 - Math.random() * width;
  flake.geo.position.y = height/2 - Math.random() * height;
  flake.geo.position.z = depth/2 - Math.random() * depth;

  flakes.push(flake);
}

for(i = 0; i < flakes.length; i++){
  scene.add(flakes[i].geo);
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

  for(i = 0; i < flakeCount; i++){

    var x = 0.5 - Math.random();
    var y = 0.5 - Math.random();
    var z = 0.5 - Math.random();

    flakes[i].vel_x = x;
    flakes[i].vel_y = y;
    flakes[i].vel_z = z;

    flakes[i].geo.position.x = width/2 - Math.random() * width;
    flakes[i].geo.position.y = height/2 - Math.random() * height;
    flakes[i].geo.position.z = depth/2 - Math.random() * depth;
  }

}};


var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'speed').min(0).max(10).step(1).listen();
gui.add(this, 'step').min(10).max(3000).step(10).listen();
if(!mobile){
  gui.addColor(this, 'colour').listen().onChange(function(value) { setColour();} );
}
gui.add(this, 'rotate').listen().onChange(function(value){ controls.autoRotate = rotate;});
gui.add(reset_button, 'reset');
gui.close();

function setColour(){
  material.color.setHex(colour);
}

var A = {
  x: 0,
  y: 0,
  z: 0
};

var B = {
  x: 0,
  y: 0,
  z: 0
}

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

//Find the curl of the noise field based on on the noise value at the location of a flake
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
  n1 = noise.simplex3(x, y+offset, z + eps); 
  n2 = noise.simplex3(x, y+offset, z - eps); 
  //Average to find approximate derivative
  a = (n1 - n2)/(2 * eps);
  n1 = noise.simplex3(x + eps, y+offset, z); 
  n2 = noise.simplex3(x + eps, y+offset, z); 
  //Average to find approximate derivative
  b = (n1 - n2)/(2 * eps);
  curl.y = a - b;

  //Find rate of change in XY plane
  n1 = noise.simplex3(x + eps, y, z+offset); 
  n2 = noise.simplex3(x - eps, y, z+offset); 
  //Average to find approximate derivative
  a = (n1 - n2)/(2 * eps);
  n1 = noise.simplex3(x, y + eps, z+offset); 
  n2 = noise.simplex3(x, y - eps, z+offset); 
  //Average to find approximate derivative
  b = (n1 - n2)/(2 * eps);
  curl.z = a - b;

  return curl;
}

//----------MOVE----------//
function move(){
  for(i = 0; i < flakeCount; i++){
      flakes[i].geo.rotation.x += flakes[i].vel_x/10+flakes[i].vel_z/100;
      flakes[i].geo.rotation.y += flakes[i].vel_y/10+flakes[i].vel_z/100;


      var curl = computeCurl(flakes[i].geo.position.x/step, flakes[i].geo.position.y/step, flakes[i].geo.position.z/step);
      var mag_c = Math.sqrt(curl.x * curl.x + curl.y * curl.y + curl.z * curl.z);

      A.x = flakes[i].geo.position.x;
      A.y = flakes[i].geo.position.y;
      A.z = flakes[i].geo.position.z;

      var distanceFromCentre = Math.sqrt(A.x * A.x + A.y * A.y + A.z * A.z);  
      if(distanceFromCentre > width/2){
        flakes[i].geo.visible = false;
      }else{
        flakes[i].geo.visible = true;
      }

      B.z = 1;

      cross(A, B, n);
      var mag_n = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      flakes[i].vel_x = n.x/mag_n;
      flakes[i].vel_y = n.y/mag_n;

      //Update flake velocity according to curl direction and speed
      flakes[i].vel_x -= (speed/60)*(curl.x/mag_c);
      flakes[i].vel_y -= (speed/60)*(curl.y/mag_c);

      flakes[i].vel_z -= (speed/60);
      flakes[i].vel_z = Math.max(flakes[i].vel_z, -speed);
    

    if(flakes[i].geo.position.z < -(depth/2) || Math.sqrt(A.x * A.x + A.y * A.y) > width){
      flakes[i].geo.position.x = width/2 - Math.random() * width; 
      flakes[i].geo.position.y = height/2 - Math.random() * height; 
      flakes[i].geo.position.z = depth/2; 

    }else{
      //Update flake position based on velocity
      flakes[i].geo.position.x += flakes[i].vel_x ;
      flakes[i].geo.position.y += flakes[i].vel_y ;
      flakes[i].geo.position.z += flakes[i].vel_z ;
    }
  }
}

offset = 0;
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
