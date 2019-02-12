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

var p_mesh;
if(mobile){
  flakeCount = 0;
}else{
  flakeCount = 0;
}

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
renderer.setClearColor(0x9999ff, 0.5);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 200000);

camera.up.set(0,0,1);
camera.position.set(width/2, -height/2, depth);
camera.lookAt(new THREE.Vector3(centre[0], centre[1], centre[2]));

scene.add(camera);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.maxDistance = 2*width;
controls.minDistance = width/2;
controls.autoRotate = rotate;

//Lights
var light_1;
light_1 = new THREE.HemisphereLight( 0x114417, 0xffffff, 0.3);
light_1.position.set(0, 0, -depth);
light_1.lookAt(0, 0, -1);
scene.add(light_1);

light_2 = new THREE.DirectionalLight(0xff0000, 0.2);
light_2.position.set(-1, 1, 1);
scene.add(light_2);
var light_3;
light_3 = new THREE.DirectionalLight(0x00ff00, 0.2);
light_3.position.set(-1, -1, 1);
scene.add(light_3);
var light_4;
light_4 = new THREE.DirectionalLight(0x3333ff, 0.2);
light_4.position.set(1, -1, 1);
scene.add(light_4);

//Material for dancer and base
var material = new THREE.MeshPhongMaterial( {color: 0xff3300, specular: 0xffffff, shininess: 100, side: THREE.DoubleSide, morphTargets: true} );

var m_vertices = [];
var m_normals = [];
var loader = new THREE.STLLoader();
//Load dancer
loader.load( "https://res.cloudinary.com/al-ro/raw/upload/v1537037873/open_hjehmc.stl", function (object) {

  var attrib = object.getAttribute('position');
  if(attrib === undefined) {
    throw new Error('a given BufferGeometry object must have a position attribute.');
  }
  var positions = attrib.array;
  var vertices = [];
  for(var i = 0, n = positions.length; i < n; i += 3) {
    var x = positions[i];
    var y = positions[i + 1];
    var z = positions[i + 2];
    vertices.push(new THREE.Vector3(x, y, z));
    m_vertices.push(new THREE.Vector3(x, y, z));
  }
  var faces = [];
  for(var i = 0, n = vertices.length; i < n; i += 3) {
    faces.push(new THREE.Face3(i, i + 1, i + 2));
  }

  var geometry = new THREE.Geometry();
  geometry.vertices = vertices;
  geometry.faces = faces;
  geometry.computeFaceNormals();              

  geometry.mergeVertices()
  geometry.computeVertexNormals();

  var mesh = new THREE.Mesh( geometry, material);

  mesh.scale.set( depth/2, depth/2, depth/2 );
  mesh.position.set(0, 0, 0);

  scene.add(mesh);

} );
var geometry;
//Load base
loader.load( "https://res.cloudinary.com/al-ro/raw/upload/v1537037856/closed_tskwbb.stl", function (object) {

  var attrib = object.getAttribute('position');
  if(attrib === undefined) {
    throw new Error('a given BufferGeometry object must have a position attribute.');
  }
  var positions = attrib.array;
  var vertices = [];
  for(var i = 0, n = positions.length; i < n; i += 3) {
    var x = positions[i];
    var y = positions[i + 1];
    var z = positions[i + 2];
    vertices.push(new THREE.Vector3(x, y, z));
  }
  var faces = [];
  for(var i = 0, n = vertices.length; i < n; i += 3) {
    faces.push(new THREE.Face3(i, i + 1, i + 2));
  }


  geometry = new THREE.Geometry();
  geometry.vertices = vertices;
  geometry.faces = faces;
  geometry.computeFaceNormals();              
  geometry.mergeVertices()
  geometry.computeVertexNormals();

  p_mesh = new THREE.Mesh( geometry, material);
  p_mesh.scale.set( depth/2, depth/2, depth/2 );
  p_mesh.position.set(0, 0, 0);

  scene.add(p_mesh);
  console.log(p_mesh);

} );

//Define hexagon shape for flakes
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

var colour = 0xff3300;



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
  
  flake.geo.rotation.x = 2 * (Math.random() - 1.0);
  flake.geo.rotation.y = 2 * (Math.random() - 1.0);
  flake.geo.rotation.z = 2 * (Math.random() - 1.0);

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

//Used for flake position
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
};

//Vector tangent to A and B to define movement around B
var n = {
  x: 0,
  y: 0,
  z: 0
};

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
  for(i = 0; i < flakeCount; i++){

    A.x = flakes[i].geo.position.x;
    A.y = flakes[i].geo.position.y;
    A.z = flakes[i].geo.position.z;

    cross(A, B, n);
    var mag_n = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    flakes[i].vel_x = swirl * (n.x/mag_n);
    flakes[i].vel_y = swirl * (n.y/mag_n);

    var curl = computeCurl(flakes[i].geo.position.x/step, flakes[i].geo.position.y/step, flakes[i].geo.position.z/step);
    var mag_c = Math.sqrt(curl.x * curl.x + curl.y * curl.y + curl.z * curl.z);

    //Update flake velocity according to curl direction and fall
    flakes[i].vel_x -= (fall/4)*(curl.x/mag_c);
    flakes[i].vel_y -= (fall/4)*(curl.y/mag_c);

    if(fall > 0){
      flakes[i].vel_z -= (fall/60);
      flakes[i].vel_z = Math.max(flakes[i].vel_z, -fall);
    }else{
      flakes[i].vel_z = 0;
    }

    flakes[i].geo.rotation.x += flakes[i].vel_x/10+flakes[i].vel_z/60;
    flakes[i].geo.rotation.y += flakes[i].vel_y/10+flakes[i].vel_z/60;

    var distanceFromCentre = Math.sqrt(A.x * A.x + A.y * A.y + A.z * A.z);  
    if(distanceFromCentre > width/2){
      flakes[i].geo.visible = false;
    }else{
      flakes[i].geo.visible = true;
    }


    if(flakes[i].geo.position.z < -(depth/2) || Math.sqrt(A.x * A.x + A.y * A.y) > width){
      //If outside bounding volume, reset to top
      flakes[i].geo.position.x = width/2 - Math.random() * width; 
      flakes[i].geo.position.y = height/2 - Math.random() * height; 
      flakes[i].geo.position.z = depth/2; 
      flakes[i].vel_x = 0;
      flakes[i].vel_y = 0;

    }else{
      //Update flake position based on velocity
      flakes[i].geo.position.x += flakes[i].vel_x ;
      flakes[i].geo.position.y += flakes[i].vel_y ;
      flakes[i].geo.position.z += flakes[i].vel_z ;
    }
  }
}

//----------DRAW----------//
function draw(){
  //p_mesh.faces;
  if(rotate){
    controls.update();
  }
  move();
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
