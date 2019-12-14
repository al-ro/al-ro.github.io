import * as THREE from 'https://threejs.org/build/three.module.js';

import { GUI } from 'https://threejs.org/examples/jsm/libs/dat.gui.module.js';

import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://threejs.org/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://threejs.org/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://threejs.org/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://threejs.org/examples/jsm/postprocessing/UnrealBloomPass.js';

import { GlitchPass2 } from 'https://al-ro.github.io/projects/jinglejam/Postprocessing.js';

var canvas = document.getElementById("canvas");

  const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
      );

//**************** Audio *****************
var songs = [];

//**************** Scene *****************
  //Initialise three.js
  var scene = new THREE.Scene();
  var BLOOM = 1;

  var bloomLayer = new THREE.Layers();
  bloomLayer.set( BLOOM );

  var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
  renderer.toneMapping = THREE.Uncharted2ToneMapping;
  //renderer.toneMapping = THREE.ReinhardToneMapping;
  //renderer.toneMappingExposure = 2.0;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( 0x443344, 1);
  //renderer.setClearColor( 0x000000, 1);
  renderer.shadowMap.enabled = true;

  var distance = 400;

  var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

  //Camera
  var camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(-20, 20, -20);
  camera.lookAt(0,0,0);
  scene.add(camera);
  /*
     var controls = new OrbitControls( camera, renderer.domElement );
     controls.maxPolarAngle = Math.PI * 0.5;
     controls.minDistance = 1;
     controls.maxDistance = 100;
   */

  const stats = new Stats();
  stats.showPanel(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.right = '0px';
  stats.domElement.style.bottom = '0px';
  document.body.appendChild(stats.domElement);
  window.addEventListener( 'resize', onWindowResize, false );
  function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    bloomComposer.setSize( window.innerWidth, window.innerHeight );
    finalComposer.setSize( window.innerWidth, window.innerHeight );
  }

var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

var hemisphereLight = new THREE.HemisphereLight(0x0000bb, 0xff0000, 0.2);
scene.add(hemisphereLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(-10,10,10);
directionalLight.lookAt(0,0,0);
directionalLight.castShadow = true;
scene.add(directionalLight);

directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
setShadowCamera(directionalLight);

var helper = new THREE.CameraHelper(directionalLight.shadow.camera);
//scene.add(helper);

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(-100, -100);

var mouse_down = false;

function onMouseDown( event ) {
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
  mouse_down = true;
}

function onMouseMove( event ) {
  if(mouse_down){
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
  }
}

function onMouseUp( event ) {
  mouse_down = false;
}

window.addEventListener( 'mousedown', onMouseDown, false );
window.addEventListener( 'mouseup', onMouseUp, false );
window.addEventListener( 'mousemove', onMouseMove, false );

var slow = false;

document.body.onkeydown = function(e){
  if(e.keyCode == 32){
    slow = true;
  }
}

document.body.onkeyup = function(e){
  if(e.keyCode == 32){
    slow = false;;
  }
}

//*************** Post ****************
var darkMaterial = new THREE.MeshBasicMaterial( { color: "black" } );
var materials = {};

var renderScene = new RenderPass( scene, camera );
//resolution, strength, radius, threshold
var bloomPass = new UnrealBloomPass( new THREE.Vector2( canvas.width, canvas.height ), 1.5, 0.01, 0.1 );
/*
   bloomPass.threshold = params.bloomThreshold;
   bloomPass.strength = params.bloomStrength;
   bloomPass.radius = params.bloomRadius;
 */
var bloomComposer = new EffectComposer( renderer );
bloomComposer.renderToScreen = false;
bloomComposer.addPass( renderScene );
bloomComposer.addPass( bloomPass );

var finalPass = new ShaderPass(
    new THREE.ShaderMaterial( {
uniforms: {
baseTexture: { value: null },
bloomTexture: { value: bloomComposer.renderTarget2.texture }
},
vertexShader: vertexSource,
fragmentShader: fragmentSource,
defines: {}
} ), "baseTexture"
    );
finalPass.needsSwap = true;

var finalComposer = new EffectComposer( renderer );
var glitchPass = new GlitchPass2();
finalComposer.addPass( renderScene );
finalComposer.addPass( finalPass );
finalComposer.addPass( glitchPass);

//*************** Entities ***************

const ObstacleType = {
  LASER: 1,
  SPHERE: 2,
  BLOCK: 3 
};

//Floor
var tiles = [];
//Targets to deliver gifts to
var npcs = [];
//Gifts to pick up and deliver
var gifts = [];
//Damaging or blocking geometries
var obstacles = [];

var level1 = [];

var lvl1 = {
map: [
       [0, 0],
       [1, 0],
       [1, 1],
       [1, 2],
       [2, 2],
       [3, 2],
       [3, 3]
],
obstacleMap: [
       [1, 0],
       [1, 1],
       [1, 2],
       [2, 2],
       [3, 3]
]
};

class Tile {
  constructor (pos, mesh){
    this._pos = pos;
    this._mesh = mesh;
  }
  get position(){
    return this._pos;
  }
  get mesh(){
    return this._mesh;
  }
}

var tileGeometry = new THREE.BoxGeometry(20,2,20);
tileGeometry.translate(0,-1,0);
var tileMaterial = new THREE.MeshStandardMaterial({color: 0xbbbbbb, metalness: 0.,  roughness: 1});

var posDelta = 20.5;
for(var i = 0; i < lvl1.map.length; i++){
  let posX = lvl1.map[i][0];
  let posY = 0;
  let posZ = lvl1.map[i][1];
  var pos = new THREE.Vector3(posX, posY, posZ);
  pos.multiplyScalar(posDelta);
  var tileMesh = new THREE.Mesh( tileGeometry, tileMaterial );
  tileMesh.receiveShadow = true;
  tileMesh.position.set(pos.x, pos.y, pos.z);
  var tile = new Tile(pos, tileMesh);
  tiles.push(tile);
}

//tile.layers.enable( BLOOM);
for(var i = 0; i < tiles.length; i++){
  scene.add(tiles[i].mesh);
}

class Movement {
  constructor (translate, rotate){
    this._translate = translate;
    this._rotate = rotate;
  }
  get dX(){
    return this._translate.x;
  }
  get dY(){
    return this._translate.y;
  }
  get dZ(){
    return this._translate.z;
  }
  get rX(){
    return this._rotate.x;
  }
  get rY(){
    return this._rotate.y;
  }
  get rZ(){
    return this._rotate.z;
  }
}

var cylinderGeometry = new THREE.CylinderGeometry( 0.5, 0.5, 20, 7 );
cylinderGeometry.rotateZ(Math.PI/2.0);
var whiteMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff} );

class Obstacle {
  constructor (type, pos, meshCore, meshGlow, color, movement){
    this._type = type;
    this._pos = pos;
    this._meshCore = meshCore;
    this._meshGlow = meshGlow;
    this._colour;
    this._movement = movement;
  }
  get type(){
    return this._type;
  }
  get position(){
    return this._pos;
  }
  get meshCore(){
    return this._meshCore;
  }
  get meshGlow(){
    return this._meshGlow;
  }
  get color(){
    return this._color;
  }
  get movement(){
    return this._movement;
  }
  move(speed){
    this._meshCore.rotateX(this._movement.rX);
    this._meshCore.rotateY(this._movement.rY);
    this._meshCore.rotateZ(this._movement.rZ);
    this._meshGlow.rotateX(this._movement.rX);
    this._meshGlow.rotateY(this._movement.rY);
    this._meshGlow.rotateZ(this._movement.rZ);
  }
}

for(var i = 0; i < lvl1.obstacleMap.length; i++){
  let posX = lvl1.obstacleMap[i][0];
  let posY = 0;
  let posZ = lvl1.obstacleMap[i][1];
  var pos = new THREE.Vector3(posX, posY, posZ);
  pos.multiplyScalar(posDelta);

  var obstacleMesh = new THREE.Mesh( cylinderGeometry, whiteMaterial );
  obstacleMesh.scale.set(1.01, 1.01, 1.01);
  obstacleMesh.position.set(pos.x, 1.0, pos.z);

  var glowMaterial = new THREE.MeshBasicMaterial( {color: 0xff5522} );
  var glowMesh = new THREE.Mesh( cylinderGeometry, glowMaterial );
  glowMesh.layers.enable(BLOOM);
  glowMesh.position.set(pos.x, 1.0, pos.z);

  var translation = new THREE.Vector3(0.1, 0, 0);
  var rotation = new THREE.Vector3(0.0, 0.05, 0);
  var movement = new Movement(translation, rotation);
  //constructor (type, pos, meshCore, meshGlow, color, movement)
  var obstacle = new Obstacle(ObstacleType.LASER, pos, obstacleMesh, glowMesh, glowMaterial, movement);
  obstacles.push(obstacle);
}

for(var i = 0; i < obstacles.length; i++){
  scene.add(obstacles[i].meshGlow);
  scene.add(obstacles[i].meshCore);
}
/*
var material = new THREE.MeshBasicMaterial( {color: 0xff5522} );
var cylinder = new THREE.Mesh( cylinderGeometry, material );

cylinder.position.set(0,1,-5);
cylinder.layers.enable(BLOOM);
scene.add( cylinder );

var cylinder2 = new THREE.Mesh( cylinderGeometry, whiteMaterial );
//cylinder2.layers.enable(BLOOM);

cylinder2.position.set(0,1,-5);
scene.add( cylinder2 );
*/
//Clear all arrays and populate them according to level
function initialiseLevel(lvl){
  
  //Set NPCc, gifts and obstacles for this level.
}

//************** Objects **************
var playerGeometry = new THREE.BoxGeometry(1,1,1);
playerGeometry.translate(0,0.5,0);
var playerMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.,  roughness: 1});

var player = new THREE.Mesh( playerGeometry, playerMaterial );
player.castShadow = true;
player.receiveShadow = true;
//player.layers.enable( BLOOM);
scene.add(player);

var pickUpMaterial = new THREE.MeshBasicMaterial( {color: 0x44ffaa} );

var pickUp = new THREE.Mesh( playerGeometry, pickUpMaterial );
//player2.castShadow = true;
//player2.receiveShadow = true;
pickUp.position.set(5, 0, 5);
pickUp.layers.enable( BLOOM);
scene.add(pickUp);

//************** Functions **************

function setShadowCamera(light){
  var width = 25;
  light.shadow.camera.top = width;
  light.shadow.camera.bottom = -width;
  light.shadow.camera.left = -width;
  light.shadow.camera.right = width;
  light.shadow.camera.updateProjectionMatrix();
}
function move(t, dt){
  //cylinder.rotateY(0.05);
  //cylinder2.rotateY(0.05);
  for(var i = 0; i < obstacles.length; i++){
    obstacles[i].move(dt);
  }
  var oldPos = new THREE.Vector3(player.position.x,
      player.position.y, 
      player.position.z);

  var dir = new THREE.Vector3(t.x, 0, t.z);
  if(dir.length() > 0.2){
    dir.normalize();
    var speed;
    if(slow){
      speed = 1.0;
    }else{
      speed = 10.0;
    }
    dir.multiplyScalar(dt * speed);

    var newPos = new THREE.Vector3(oldPos.x + dir.x, 0, oldPos.z + dir.z);
    player.lookAt(newPos);

    var x = newPos.x;
    var z = newPos.z;
    var dx = new THREE.Vector3(x,0,z);
    oldPos.x -= dx.x;
    oldPos.y -= dx.y;
    oldPos.z -= dx.z;
    player.position.set(dx.x, dx.y, dx.z);
    // camera.position.set(20 + x, 20, 20 + z);
    var _oldPos = new THREE.Vector3(directionalLight.position.x,
	directionalLight.position.y, 
	directionalLight.position.z);
    _oldPos.x -= oldPos.x;
    _oldPos.y -= oldPos.y;
    _oldPos.z -= oldPos.z;
    directionalLight.position.set(_oldPos.x, _oldPos.y, _oldPos.z);
    directionalLight.target = player;
    var c_oldPos = new THREE.Vector3(camera.position.x,
	camera.position.y, 
	camera.position.z);
    c_oldPos.x -= oldPos.x;
    c_oldPos.y -= oldPos.y;
    c_oldPos.z -= oldPos.z;
    camera.position.set(c_oldPos.x, c_oldPos.y, c_oldPos.z);
  }
}

var old = new THREE.Vector3(0,0,0);
//************** Draw **************
var time = 0;
var target = new THREE.Vector3(0,0,0);
var lastFrame = Date.now();
var thisFrame;
var vec = new THREE.Vector3(0,0,0);
var pos = new THREE.Vector3(0,0,0);
function draw(){

  stats.begin();
  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera( mouse, camera );

  vec.set(mouse.x, 0.5, mouse.y);

  vec.unproject( camera );
  vec.sub( camera.position ).normalize();

  var distance = - camera.position.y / vec.y;

  pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );

  // calculate objects intersecting the picking ray
  var intersects = raycaster.intersectObjects( scene.children );

  //Update time
  thisFrame = Date.now();
  var dt = (thisFrame - lastFrame)/500;
  time += dt;	
  lastFrame = thisFrame;
  if(intersects[0] && mouse_down){
    //if(intersects[0].object == tile){
      target = pos;
   // }
  }
  move(target, dt);
  if(player.position.z < -4.5){
    glitchPass.goWild = true;

  }else{
    glitchPass.goWild = false;
  }
  // render scene with bloom
  renderBloom();

  // render the entire scene, then render bloom scene on top
  finalComposer.render();
  //glitchPass.randX = 5.0;
  stats.end();
  requestAnimationFrame(draw);
}

draw();

function renderBloom() {
  for(var i = 0; i < obstacles.length; i++){
    obstacles[i].meshCore.visible = false;
  }
  scene.traverse( darkenNonBloomed );
  renderer.setClearColor( 0x000000, 1);
  bloomComposer.render();
  renderer.setClearColor( 0x272738, 1);
  scene.traverse( restoreMaterial );
  for(var i = 0; i < obstacles.length; i++){
    obstacles[i].meshCore.visible = true;
  }
}

function darkenNonBloomed( obj ) {

  if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
    materials[ obj.uuid ] = obj.material;
    obj.material = darkMaterial;
  }

}

function restoreMaterial( obj ) {
  if ( materials[ obj.uuid ] ) {
    obj.material = materials[ obj.uuid ];
    delete materials[ obj.uuid ];
  }
}
