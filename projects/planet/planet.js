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
var radius = 128;
var repeat = 8;
var dt = 0.03;
var tree_height = 35;
var treeCount = 128;
var trees = [];
var bend = 2.5;
var branch_count = 20;

//The global coordinates
//The geometry never leaves a box of width*width around (0, 0)
//But we track where in space the camera would be globally
//The current tile
var id_x;
var id_z;
var delta = width/resolution;
var pos = {x:0, z:0};
var del = {x:dt, z:0};

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h, false);
renderer.setClearColor( 0x87cefa, 1);

var distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);
camera.position.set(-50, 10, 50);
scene.add(camera);

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

//Dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'radius').min(10).max(400).step(5);
gui.add(this, 'repeat').min(1).max(400).step(1).onChange(function(val){ground_texture.repeat.set(val, val);});
gui.add(this, 'dt').min(0).max(1).step(0.01);

//Use noise.js library to generate a grid of 2D simplex noise values
noise.seed(Math.random());

function getYPosition(x, z){
  var y = 8*noise.simplex2(x/150, z/150);
  y += 4*noise.simplex2(x/50, z/50);
  y += 2*noise.simplex2(x/30, z/30);
  return y*0.5;
};

function placeOnSphere(v){
  var theta = Math.acos(v.z/radius);
  var phi = Math.acos(v.x/(radius * Math.sin(theta)));
  var s_v = radius * Math.sin(theta) * Math.sin(phi);
  if (s_v != s_v){
    s_v = v.y	
  }
  return s_v;
}

//************** Ground **************
//The ground
var base_geometry = new THREE.PlaneBufferGeometry(width, width, resolution, resolution);
base_geometry.lookAt(new THREE.Vector3(0,1,0));
base_geometry.verticesNeedUpdate = true;

var ground_geometry = new THREE.PlaneBufferGeometry(width, width, resolution, resolution);
ground_geometry.lookAt(new THREE.Vector3(0,1,0));
ground_geometry.verticesNeedUpdate = true;

var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
//Ground texture by Ulrick Wery
var ground_texture =  loader.load( 'https://al-ro.github.io/images/planet/ulrick-wery-grassflower.jpg' );
ground_texture.wrapS = THREE.RepeatWrapping;
ground_texture.wrapT = THREE.RepeatWrapping;
ground_texture.repeat.set(repeat, repeat);
ground_texture.offset.set(0,0);
var ground_material = new THREE.MeshLambertMaterial({color: 0xffffff, map: ground_texture, wireframe: false});
var ground = new THREE.Mesh(ground_geometry, ground_material);

ground.geometry.computeVertexNormals();
scene.add(ground);


//************** Trees **************
var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
var bark_texture =  loader.load( 'https://al-ro.github.io/images/planet/ulrick-wery-soil.jpg' );
bark_texture.wrapS = THREE.RepeatWrapping;
bark_texture.wrapT = THREE.RepeatWrapping;
bark_texture.offset.set(Math.random(), Math.random());
bark_texture.repeat.set(4, 4);
var tree_material = new THREE.MeshLambertMaterial( {color: 0xdddddd, map: bark_texture} );

//Foliage texture is an edited version of work by Kuko Cai
var foliage_texture =  loader.load( 'https://al-ro.github.io/images/planet/foliage_diffuse.jpg' );
var foliage_alpha =  loader.load( 'https://al-ro.github.io/images/planet/foliage_alpha.jpg' );
var foliage_material = new THREE.MeshLambertMaterial( {color: 0xdddddd, map: foliage_texture, alphaMap: foliage_alpha, alphaTest: 0.5, side: THREE.DoubleSide, wireframe: false});

var tree_geometry = new THREE.ConeBufferGeometry(1, tree_height, 8);
tree_geometry.translate(0, tree_height/2, 0);

var branch_geometry = new THREE.PlaneBufferGeometry(10,12,2,4);
branch_geometry.lookAt(new THREE.Vector3(0,1,0));
branch_geometry.translate(0,0,4);
for(v = 3; v < 45; v+=9){
  branch_geometry.getAttribute("position").array[v+1] += bend;	
}
branch_geometry.verticesNeedUpdate = true;
branch_geometry.computeVertexNormals();

for(i = 0; i < treeCount; i++){
  var tree = new THREE.Group();

  var trunk = new THREE.Mesh(tree_geometry, tree_material);
  var scale = 1.0 - Math.random() * 0.8;

  trunk.scale.set(scale,scale,scale);
  trunk.position.x = width/2-Math.random() * width;
  trunk.position.z = width/2-Math.random() * width;

  tree.add(trunk);

  var branches = new THREE.Group(); 
 
  for(j = 0; j < branch_count; j++){
    var branch = new THREE.Mesh(branch_geometry, foliage_material);

    var sc = scale*(branch_count-Math.max(j, 1))/branch_count;
    branch.scale.set(sc,sc,sc);
    branch.rotateY(Math.random() + (j/branch_count)*6.28*6);

    var step = (scale*tree_height-scale*8)/branch_count;
    branch.translateY(scale*8 + j * step);
    if(scale > 0.5){
      branch.rotateX(1-sc+0.4);
    }else{
      branch.rotateX(scale);
    }
    branches.add(branch);
  }
  branches.rotateY(Math.random() * 6.28);
  branches.position.x = trunk.position.x;
  branches.position.z = trunk.position.z;
  tree.add(branches);
  scene.add(tree);
  trees.push(tree);
}

//************** Update **************
var yAxis = new THREE.Vector3(0,1,0);
var targetAxis = new THREE.Vector3(0,0,0);
var v = new THREE.Vector3(0,0,0);
var b = new THREE.Vector3(0,0,0);
var dx;
var dz;

function update(pos, del){

  for (i = 0; i < ground.geometry.getAttribute("position").array.length; i+=3){

    v.x = ground.geometry.getAttribute("position").array[i];
    v.y = ground.geometry.getAttribute("position").array[i+1];
    v.z = ground.geometry.getAttribute("position").array[i+2];
    b.x = base_geometry.getAttribute("position").array[i];
    b.y = base_geometry.getAttribute("position").array[i+1];
    b.z = base_geometry.getAttribute("position").array[i+2];

    //https://dev.to/maurobringolf/a-neat-trick-to-compute-modulo-of-negative-numbers-111e
    v.x = b.x - ((delta*pos.x)%delta + delta)%delta;
    v.z = b.z - ((delta*pos.z)%delta + delta)%delta;
    v.y = Math.max(0, placeOnSphere(v)) - radius;
    v.y += getYPosition(b.x+delta*Math.floor(pos.x), b.z+delta*Math.floor(pos.z));
    
    ground.geometry.getAttribute("position").array[i] = v.x;
    ground.geometry.getAttribute("position").array[i+1] = v.y;
    ground.geometry.getAttribute("position").array[i+2] = v.z;
  }

  ground_texture.offset.set((delta*Math.floor(pos.x))/(width/repeat), (-delta*Math.floor(pos.z))/(width/repeat));
  ground.geometry.attributes.position.needsUpdate = true
  ground.geometry.computeVertexNormals();

  for(i = 0; i < trees.length; i++){
    var tree = trees[i];

    for(j = 0; j < tree.children.length; j++){
      var child = tree.children[j];

      if(j < 1){
	if(child.position.x > width/2){
	  child.position.x = -width/2+10;
	}
	if(child.position.z > width/2){
	  child.position.z = -width/2+10;
	}

	if(child.position.x < -width/2){
	  child.position.x = width/2-10;
	}
	if(child.position.z < -width/2){
	  child.position.z = width/2-10;
	}

	child.position.x -= del.x*delta;
	child.position.z -= del.z*delta;

	child.position.y = Math.max(0, placeOnSphere(child.position)) - radius;
	child.position.y += getYPosition(child.position.x+delta*pos.x, child.position.z+delta*pos.z)-1;

	targetAxis.x = child.position.x/radius;
	targetAxis.y = Math.max(0, placeOnSphere(child.position))/radius;
	targetAxis.z = child.position.z/radius;

	child.quaternion.setFromUnitVectors(yAxis, targetAxis.normalize());

      }else{
	child.position.copy(tree.children[0].position);
	child.quaternion.copy(tree.children[0].quaternion);
      }
    }
  }
}

//************** Draw **************
var vector = new THREE.Vector3();
var length;
function draw(){
  stats.begin();
  camera.getWorldDirection(vector);
  length = Math.sqrt(vector.x*vector.x + vector.z*vector.z);
  vector.x /= length;
  vector.z /= length;
  del.x = vector.x * dt;
  del.z = vector.z * dt;
  pos.x += del.x;
  pos.z += del.z;
  update(pos, del);
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(draw);
}

draw();
