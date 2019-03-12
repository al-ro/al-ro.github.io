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

  //Spatial variables
  var width = 2000;
  var height = 2000;
  var depth = 2000;
  var centre = [width/2,height/2, depth/2];

  //All nodes
  var nodes = [];
  //Links between nodes
  var links = [];
  //Groups of nodes and their links
  var strands = [];

  var x = 0.5-Math.random();
  var y = 0.5-Math.random();
  var z = 0.5-Math.random();

  var region = 300;
  var dampen = 0.8;

  var x_ = (0.5-Math.random())*region;
  var y_ = (0.5-Math.random())*region;
  var z_ = (0.5-Math.random())*region;

  var dx = x_-x;
  var dy = y_-y;
  var dz = z_-z;

  var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

  var speed = 1;
  var jellyfish = {
    x: 0, 
    y: 0,
    z: 0,
    x_vel: speed*(dx/dist),
    y_vel: speed*(dy/dist),
    z_vel: speed*(dz/dist),
    target_x: x_,
    target_y: y_,
    target_z: z_
  };

  var strandCount = 12;
  var strandLength = 22;
  //Are all strands equal length
  var uniformstrands = true;
  //Maximum deviation from strandLength for unequal strands
  var strandVariation = 1;
  var radius = 4;

  var iterations = 1;

  var diameter = 0.1;

  var minDist = 4;
  var maxDist = 4;

  var DIRECTION = new THREE.Vector3();
  var toNext = new THREE.Vector3();
  var dummy = new THREE.Object3D();
  dummy.rotateX( Math.PI / 2 );
  //dummy.lookAt( new THREE.Vector3(0, 0, -1));

  //Camera rotate
  var rotate = true;

  var ratio =  canvas.width / canvas.height;
  var w = cont.offsetWidth;
  var h = w/ratio;

  //Initialise three.js
  var scene = new THREE.Scene();

  var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
  renderer.setSize(w,h,false);
  renderer.setClearColor(0x223344, 0.8);

  distance = 400;
  var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;
  var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);

  camera.up.set(0,0,1);
  camera.position.set(200, -200, 200);
  camera.lookAt(new THREE.Vector3(centre[0], centre[1], centre[2]));

  scene.add(camera);
/*
  window.addEventListener( 'resize', onWindowResize, false );

  function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }
*/
//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );
//controls.maxDistance = 2*width;
//controls.minDistance = width/2;
//controls.autoRotate = true;

//Lights
var light_1;
light_1 = new THREE.HemisphereLight( 0x00000, 0xffffff, 0.9);
light_1.position.set(0, 0, -depth);
scene.add(light_1);
var light_2;
light_2 = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(light_2);

var material = new THREE.MeshPhongMaterial( {color: 0xffffff, skinning: true, wireframe: false});
var material_ = new THREE.MeshPhongMaterial( {color: 0xffffff} );
var geometry = new THREE.SphereGeometry( diameter, 32, 32 );

//Create strands
for(s = 0; s < strandCount; s++){
  var len;

  if(uniformstrands){
    len = strandLength;
  }

  var seg_ = [];

  var dir = new THREE.Vector3(0, 0, -1);
  var strand = {
    length: len,
    root: nodes.length,
    direction: dir,
    segments: seg_
  };

  strands.push(strand);

  //Create nodes
  for(i = 0; i < len; i++){

    var g_ = new THREE.Mesh(geometry, material_);

    var stat = (i == 0);

    var x_ = Math.random()-0.5;
    var y_ = Math.random()-0.5;
    var z_ = Math.random()-0.5;

    var norm = 1/Math.sqrt(x_*x_ + y_*y_ + z_*z_);		
    x_ *= norm * radius;
    y_ *= norm * radius;
    z_ *= norm * radius;

    var node = {
      x: x_,
      y: y_,
      z: z_,
      last_x: x_,
      last_y: y_,
      last_z: z_,
      angle_x: 0,
      angle_y: 0,
      angle_z: 0,
      geo: g_, 
      static: stat
    };

    node.geo.position.x = node.x;
    node.geo.position.y = node.y;
    node.geo.position.z = node.z;
    nodes.push(node);
  }

  for(l = 0; l < (len-1); l++){
    var link = {
      first: strand.root + l,
      second: strand.root + l + 1,
      min: minDist,
      max: maxDist
    };
    links.push(link);
  }

}

for(i = 0; i < nodes.length; i++){
  scene.add(nodes[i].geo);
}

var disc_geometry = new THREE.RingBufferGeometry( 10, 10.1, strandCount, 1);
var disc_material = new THREE.MeshPhongMaterial( { color: 0xffffff, side: THREE.DoubleSide } );
var disc_mesh = new THREE.Mesh(disc_geometry, disc_material );
scene.add( disc_mesh );

var plane = new THREE.GridHelper(100, 10);
scene.add(plane);
var axes = new THREE.AxisHelper( 1000);
scene.add(axes);

//From the example at https://threejs.org/docs/#api/en/objects/SkinnedMesh
//The strands will be cylinder geometry which are controlled using the bones defined by nodes
function createStrandGeometry ( sizing ) {

  var geometry = new THREE.CylinderGeometry(
      sizing.radiusTop,		// radiusTop
      sizing.radiusBottom,	// radiusBottom
      sizing.height,		// height
      sizing.radiusSegments,	// radiusSegments
      sizing.segmentCount*4,	// heightSegments
      true                    	// openEnded
      );

  geometry.translate( 0, sizing.height/2, 0 ); 
  //For all the vertices of the cylinder geometry
  for (i = 0; i < geometry.vertices.length; i++){
    var vertex = geometry.vertices[i];
    //Each vertex is affected by 2 bones based on its location
    //The effect of each bone is determined by the distance to the vertex
    //Default cylinder is oriented along the y axis and the y index can be used
    //to find how far along the cylinder a vertex is
    var y = vertex.y;

    //Find which 2 bones are nearest to the vertex
    var skinIndex = (Math.floor( y / sizing.segmentHeight ));
    //Find the distance ratios to the two bones
    //skinWeight runs from 0 to 1
    var skinWeight = ( y % sizing.segmentHeight ) / sizing.segmentHeight;

    var firstBone = skinIndex;
    var secondBone = skinIndex+1;

    var firstInfluence = 1-skinWeight;
    var secondInfluence = skinWeight;

    if(secondBone > sizing.segmentCount){
      secondBone = sizing.segmentCount;
      secondInfluence = 1;
      firstBone = secondBone-1;
      firstInfluence = 0;
    }

    geometry.skinIndices.push( new THREE.Vector4(firstBone, secondBone, 0, 0 ) );
    geometry.skinWeights.push( new THREE.Vector4(firstInfluence, secondInfluence, 0, 0 ) );
  }

  //Have the up vector of the geometry point along the cylinder
  geometry.rotateX(Math.PI / 2 );
  return geometry;
}

var body_material = new THREE.MeshPhongMaterial( { color: 0xffffff, side: THREE.DoubleSide } );
//var body_mesh = new THREE.Mesh( body_geometry, body_material );
//body_mesh.rotateX(Math.PI/2);
//scene.add( body_mesh );
var bodyRadius = 5;
//The body will be a hemisphere with two bones to control pulsating
function createBodyGeometry ( sizing ) {

  var geometry = new THREE.SphereGeometry( bodyRadius, 32, 32, 0, TWO_PI, 0, 1.8 );

  geometry.translate( 0, 2*bodyRadius, 0 ); 
  //For all the vertices of the sphere geometry
  for (i = 0; i < geometry.vertices.length; i++){
    var vertex = geometry.vertices[i];
    //Each vertex is affected by 2 bones based on its location
    //The effect of each bone is determined by the distance to the vertex
    //Default cylinder is oriented along the y axis and the y index can be used
    //to find how far along the cylinder a vertex is
    var y = vertex.y;

    //Find which 2 bones are nearest to the vertex
    var skinIndex = (Math.floor( y / 2*bodyRadius ));
    //Find the distance ratios to the two bones
    //skinWeight runs from 0 to 1
    var skinWeight = ( y % sizing.segmentHeight ) / sizing.segmentHeight;

    var firstBone = skinIndex;
    var secondBone = skinIndex+1;

    var firstInfluence = 1-skinWeight;
    var secondInfluence = skinWeight;

    if(secondBone > sizing.segmentCount){
      secondBone = sizing.segmentCount;
      secondInfluence = 1;
      firstBone = secondBone-1;
      firstInfluence = 0;
    }

    geometry.skinIndices.push( new THREE.Vector4(firstBone, secondBone, 0, 0 ) );
    geometry.skinWeights.push( new THREE.Vector4(firstInfluence, secondInfluence, 0, 0 ) );
  }

  //Have the up vector of the geometry point along the cylinder
  geometry.rotateX(Math.PI / 2 );
  return geometry;
}

//From the example at https://threejs.org/docs/#api/en/objects/SkinnedMesh
function createBones ( sizing ) {

  bones = [];

  var prevBone = new THREE.Bone();
  prevBone.position.z = 0;
  bones.push( prevBone );

  for ( var b = 0; b < sizing.segmentCount; b++ ) {
    var bone = new THREE.Bone();
    bone.position.z = 0;
    bones.push( bone );
    prevBone.add( bone );
    prevBone = bone;
  }

  return bones;
}

//From the example at https://threejs.org/docs/#api/en/objects/SkinnedMesh
function createMesh ( geometry, bones ) {

  var mesh = new THREE.SkinnedMesh( geometry, material);
  var skeleton = new THREE.Skeleton( bones );

  mesh.add( bones[ 0 ] );
  mesh.bind( skeleton );

  return mesh;
}

//From the example at https://threejs.org/docs/#api/en/objects/SkinnedMesh
//Create bones, geometry and add mesh to scene
function initBones () {

    //Top is start of cylinder
    var radiusTop = diameter;
    //Bottom is end of cylinder
    var radiusBottom = diameter;
    //Distance between bones
    var segmentHeight = 0.1;
    //Number of bones
    var segmentCount = 1;
    var height = segmentHeight * segmentCount;
    var radiusSegments = 32;
    var heightSegments = 1;

    var sizing = {
      radiusTop: radiusTop,
      radiusBottom: radiusBottom,
      height: height,
      radiusSegments: radiusSegments,
      heightSegments: heightSegments,
      segmentHeight: segmentHeight,
      segmentCount: segmentCount
    };

  for(s = 0; s < strandCount; s++){
    for(seg = 0; seg < strandLength-1; seg++){
      var geometry = createStrandGeometry( sizing );
      var bones = createBones( sizing );
      var mesh = createMesh( geometry, bones );
      strands[s].segments.push(mesh);
      mesh.frustumCulled = false;
      scene.add(strands[s].segments[seg]);
    }
  }
}

function resolve_constraints() {
  var first;
  var second;
  var dx;
  var dy;
  var dz;
  var d;
  var diff;
  var translateX;
  var translateY;
  var translateZ;

  for (i = 0; i < iterations; i++) {

    for (l = 0; l < links.length; l++) {
      first = nodes[links[l].first];
      second = nodes[links[l].second];
      dx = first.x - second.x;
      dy = first.y - second.y;
      dz = first.z - second.z;
      d = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if ((d > links[l].max)||(d < links[l].min)) {
	diff = (links[l].min - d) / d;
	translateX = dx * 0.5 * diff;
	translateY = dy * 0.5 * diff;
	translateZ = dz * 0.5 * diff;
	if (!first.static) {
	  first.x += translateX;
	  first.y += translateY;
	  first.z += translateZ;
	}
	if (!second.static) {
	  second.x -= translateX;
	  second.y -= translateY;
	  second.z -= translateZ;
	}
      }
    }
  }
}


function move(dt) {
  var x_vel;
  var y_vel;
  var z_vel;
  var next_x;
  var next_y;
  var next_z;

  jellyfish.x += jellyfish.x_vel;
  jellyfish.y += jellyfish.y_vel;
  jellyfish.z += jellyfish.z_vel;

  dx = jellyfish.target_x-jellyfish.x;
  dy = jellyfish.target_y-jellyfish.y;
  dz = jellyfish.target_z-jellyfish.z;

  dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

  if(dist < 10){
    counter++;
    jellyfish.target_x = (0.5-Math.random())*region;
    jellyfish.target_y = (0.5-Math.random())*region;
    jellyfish.target_z = (0.5-Math.random())*region;
    dx = jellyfish.target_x-jellyfish.x;
    dy = jellyfish.target_y-jellyfish.y;
    dz = jellyfish.target_z-jellyfish.z;

    dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    jellyfish.x_vel = speed*(dx/dist);
    jellyfish.y_vel = speed*(dy/dist);
    jellyfish.z_vel = speed*(dz/dist);
  }
  
  disc_mesh.position.x = jellyfish.x;
  disc_mesh.position.y = jellyfish.y;
  disc_mesh.position.z = jellyfish.z;
  
  disc_mesh.lookAt(new THREE.Vector3(jellyfish.target_x, jellyfish.target_y, jellyfish.target_z));

  for (i = 0; i < nodes.length; i++) {
    if (!nodes[i].static) {
      x_vel = nodes[i].x - nodes[i].last_x;
      y_vel = nodes[i].y - nodes[i].last_y;
      z_vel = nodes[i].z - nodes[i].last_z;

      next_x = nodes[i].x + x_vel*dampen;
      next_y = nodes[i].y + y_vel*dampen;
      next_z = nodes[i].z + z_vel*dampen;

      nodes[i].last_x = nodes[i].x;
      nodes[i].last_y = nodes[i].y;
      nodes[i].last_z = nodes[i].z;

      nodes[i].x = next_x;
      nodes[i].y = next_y;
      nodes[i].z = next_z;
    }else{
      nodes[i].x += jellyfish.x_vel;
      nodes[i].y += jellyfish.y_vel;
      nodes[i].z += jellyfish.z_vel;
    }
    nodes[i].geo.position.x = nodes[i].x;
    nodes[i].geo.position.y = nodes[i].y;
    nodes[i].geo.position.z = nodes[i].z;
  
  }

  for(var i = 0; i < strands.length; i++){

    for(var j = 0; j < strandLength-1; j++){

      strands[i].segments[j].position.x = nodes[strands[i].root + j].x;  
      strands[i].segments[j].position.y = nodes[strands[i].root + j].y;  
      strands[i].segments[j].position.z = nodes[strands[i].root + j].z;  
      toNext.x = nodes[strands[i].root+j+1].x;
      toNext.y = nodes[strands[i].root+j+1].y;
      toNext.z = nodes[strands[i].root+j+1].z;
      strands[i].segments[j].lookAt(toNext);

      toNext.x = nodes[strands[i].root+j+1].x - nodes[strands[i].root+j].x;
      toNext.y = nodes[strands[i].root+j+1].y - nodes[strands[i].root+j].y;
      toNext.z = nodes[strands[i].root+j+1].z - nodes[strands[i].root+j].z;
      strands[i].segments[j].skeleton.bones[1].position.z = 0.99*(toNext.length());  

    }
  }

}

initBones();

for (i = 0; i < nodes.length; i++) {
  nodes[i].geo.position.x = nodes[i].x;
  nodes[i].geo.position.y = nodes[i].y;
  nodes[i].geo.position.z = nodes[i].z;
}
var counter = 0;
//----------DRAW----------//
var f = 0;
function draw(){
  f+=0.01;

  disc_mesh.scale.x = 1+f%1;
  disc_mesh.scale.y = 1+f%1;
  disc_mesh.scale.z = 1+f%1;

  resolve_constraints();
  
    if(counter < 3){
      move(1/60);
    }
 
  renderer.render(scene, camera);
  if(rotate){
    controls.update();
  }
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
