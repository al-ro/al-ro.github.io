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

var alive = true;

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
  var cameraStartPosition = new THREE.Vector3(-20, 20, -20);
  camera.position.copy(cameraStartPosition);
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
var directionalLightStartPosition = new THREE.Vector3(-10, 10, 10);
directionalLight.position.copy(directionalLightStartPosition);
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
var globalWidth = 8;
var globalHeight = 8;
var globalMap = new Map();
function setGlobalMap(tileMap){
  globalMap.clear();
  for(var i = 0; i < tileMap.length; i++){
    var index = tileMap[i][1] * globalWidth + tileMap[i][0];
    globalMap.set(index, i);
  }
//console.log(globalMap);
}
var obstacleMap = new Map();
function setObstacleMap(obsMap){
  obstacleMap.clear();
  for(var i = 0; i < obsMap.length; i++){
    var index = obsMap[i][1] * globalWidth + obsMap[i][0];
    obstacleMap.set(index, [i]);
  }
console.log(obstacleMap);
}

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

//Currently held gifts
var inventory = [];

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
       [3, 2]
],
giftMap: [
       [0, 0],
       [3, 3]
]
};

setGlobalMap(lvl1.map);
setObstacleMap(lvl1.obstacleMap);

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
  constructor (type, pos, meshCore, meshGlow, color, movement, axis){
    this._type = type;
    this._pos = pos;
    this._meshCore = meshCore;
    this._meshGlow = meshGlow;
    this._colour;
    this._movement = movement;
    this._axis = axis;
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
  get axis(){
    return this._axis;
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
  
  if((i % 2) == 0){
    var translation = new THREE.Vector3(0.1, 0, 0);
    var rotation = new THREE.Vector3(0.0, 0.05, 0);
  }else{
    var translation = new THREE.Vector3(-0.1, 0, 0);
    var rotation = new THREE.Vector3(0.0, -0.05, 0);
  }
  var movement = new Movement(translation, rotation);
  //constructor (type, pos, meshCore, meshGlow, color, movement)
  var obstacle = new Obstacle(ObstacleType.LASER, pos, obstacleMesh, glowMesh, glowMaterial, movement);
  obstacles.push(obstacle);
}

for(var i = 0; i < obstacles.length; i++){
  scene.add(obstacles[i].meshGlow);
  scene.add(obstacles[i].meshCore);
}


class Gift {
  constructor(type, pos, mesh, material) {
    this._type = type;
    this._pos = pos;
    this._mesh = mesh;
    this._material = material;
  }
  get type(){
    return this._type;
  }
  get position(){
    return this._pos;
  }  
  get material(){
    return this._material;
  }
  get mesh(){
    return this._mesh;
  }

}

const GiftType = {
  ONE: 1
};
var giftMaterial = new THREE.MeshBasicMaterial( {color: 0x44ffaa} );
var giftGeometry = new THREE.SphereGeometry( 1.0, 6, 2 );
giftGeometry.translate(0, 0.7, 0);

for(var i = 0; i < lvl1.giftMap.length; i++){
  let posX = lvl1.giftMap[i][0];
  let posY = 0;
  let posZ = lvl1.giftMap[i][1];
  var pos = new THREE.Vector3(posX, posY, posZ);
  pos.multiplyScalar(posDelta);

  pos.set(pos.x + posDelta * 0.8 * (Math.random() - 0.5), 0.0 , pos.z + posDelta * 0.8 * (Math.random() - 0.5));  

  var giftMesh = new THREE.Mesh( giftGeometry, giftMaterial );
  giftMesh.position.copy(pos);
  var gift = new Gift(GiftType.ONE, pos, giftMesh, giftMaterial);
  giftMesh.layers.enable(BLOOM);
  gifts.push(gift);
}
for(var i = 0; i < gifts.length; i++){
  scene.add(gifts[i].mesh);
}

function initialiseLevel(lvl){
  
  //Set NPCc, gifts and obstacles for this level.
}

//************** Objects **************

var playerGeometry = new THREE.BoxGeometry(1,1,1);
playerGeometry.translate(0,0.5,0);
var playerMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.,  roughness: 1});

var player = new THREE.Mesh( playerGeometry, playerMaterial );
var playerStartPosition = new THREE.Vector3(0,0,0);
player.position.copy(playerStartPosition);
player.castShadow = true;
player.receiveShadow = true;
//player.layers.enable( BLOOM);
scene.add(player);

var planeGeometry = new THREE.PlaneGeometry( 100, 100 );
planeGeometry.rotateX(-Math.PI*0.5);
planeGeometry.translate(0,0,0);
var planeMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide, visible: false} );
var plane = new THREE.Mesh( planeGeometry, planeMaterial );
plane.position.copy(playerStartPosition);
scene.add( plane );

//************** Collision **************
//https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
//x, y is your target point and x1, y1 to x2, y2 is your line segment
function distanceToLine(x, y, x1, y1, x2, y2) {

  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

//************** Functions **************

function setShadowCamera(light){
  var width = 25;
  light.shadow.camera.top = width;
  light.shadow.camera.bottom = -width;
  light.shadow.camera.left = -width;
  light.shadow.camera.right = width;
  light.shadow.camera.updateProjectionMatrix();
}

var oldPos = new THREE.Vector3(0,0,0);
var newPos = new THREE.Vector3(0,0,0);
var dir = new THREE.Vector3(0,0,0);
function move(t, dt){

//Move obstacles
  for(var i = 0; i < obstacles.length; i++){
    obstacles[i].move(dt);
  }

  //Move player, light and camera
  oldPos.copy(player.position);
  dir.set(t.x - oldPos.x, 0, t.z - oldPos.z);

  if(dir.length() > 0.02){
    dir.normalize();
    var speed;
    if(slow){
      speed = 1.0;
    }else{
      speed = 10.0;
    }
    dir.multiplyScalar(dt * speed);

    newPos.set(oldPos.x + dir.x, 0, oldPos.z + dir.z);
    player.lookAt(newPos);
    player.position.copy(newPos);

    oldPos.copy(directionalLight.position);
    newPos.set(oldPos.x + dir.x, oldPos.y, oldPos.z + dir.z);
    directionalLight.position.copy(newPos);
    directionalLight.target = player;

    oldPos.copy(camera.position);
    newPos.set(oldPos.x + dir.x, oldPos.y, oldPos.z + dir.z);
    camera.position.copy(newPos); 

    oldPos.copy(plane.position);
    newPos.set(oldPos.x + dir.x, oldPos.y, oldPos.z + dir.z);
    plane.position.copy(newPos);
  }
}

var playerLocation = new THREE.Vector3(0,0,0);
function checkBounds(){
  //Position Y will be invalid and will not be used
  playerLocation.copy(player.position);
  playerLocation.addScalar(posDelta*0.5);
  var iX = Math.floor(playerLocation.x / posDelta);
  var iZ = Math.floor(playerLocation.z / posDelta);
  var index = iZ * globalWidth + iX;
  return globalMap.has(index); 
}

var direction = new THREE.Vector2(0,0);
var anchor = new THREE.Vector2(0,0);
function checkCollision(){
  //Position Y will be invalid and will not be used
  playerLocation.copy(player.position);
  playerLocation.addScalar(posDelta*0.5);
  var iX = Math.floor(playerLocation.x / posDelta);
  var iZ = Math.floor(playerLocation.z / posDelta);
  var index = iZ * globalWidth + iX;
  if(obstacleMap.has(index)){
    var _obstacles = obstacleMap.get(index);
    for(var i = 0; i < _obstacles.length; i++){
      direction.set(1,0);
      var vertices = obstacles[_obstacles[i]].meshCore.vertices;
      console.log(vertices);
    } 
  }
}

//Actually the exact opposite of falling
function fall(dt){
  player.position.set(player.position.x, player.position.y + dt, player.position.z);
}

//************** Draw **************
var time = 0;
var targetDir = new THREE.Vector3(0,0,0);
var lastFrame = Date.now();
var thisFrame;
var bounds = true;
var collision = false;
var deathFrames = 0;

function draw(){
  stats.begin();
  if(deathFrames == 100){
    deathFrames = 0;
    alive = true;
    player.position.copy(playerStartPosition);
    plane.position.copy(playerStartPosition);
    camera.position.copy(cameraStartPosition);
    directionalLight.position.copy(directionalLightStartPosition);
    directionalLight.target = player;
  }
  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera( mouse, camera );

  // calculate objects intersecting the picking ray
  var intersect = raycaster.intersectObject( plane );

  //Update time
  thisFrame = Date.now();
  var dt = (thisFrame - lastFrame)/500;
  time += dt;	
  lastFrame = thisFrame;
  bounds = checkBounds();
  collision = checkCollision();
  if(!bounds || collision){
    fall(dt);
    alive = false;
  }else{
    if(intersect[0] && mouse_down){
      targetDir = intersect[0].point;
    }else{
      targetDir = player.position;
    }
    move(targetDir, dt);
  }
  if(!alive){
    deathFrames++;
    glitchPass.goWild = true;

  }else{
    glitchPass.goWild = false;
  }
  // render scene with bloom
  renderBloom();

  // render the entire scene, then render bloom scene on top
  finalComposer.render();
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
