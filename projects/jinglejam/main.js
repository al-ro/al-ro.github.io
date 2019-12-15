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
var menu = true;
var victory = false;
var score = 0;
var objectives = 1;
var lives = 3;

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
  //renderer.shadowMap.enabled = true;

  var distance = 400;

  var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

  //Camera
  var camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 20000);
  var cameraStartPosition = new THREE.Vector3(-20, 30, -20);
  camera.position.copy(cameraStartPosition);
  camera.lookAt(0,0,0);
  scene.add(camera);

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
    bloomComposer.setSize( 0.5*window.innerWidth, 0.5*window.innerHeight );
    finalComposer.setSize( 0.75*window.innerWidth, 0.75*window.innerHeight );
  }

//document.getElementById('success').style.visibility = 'visible';
function showSuccess() {
  document.getElementById('success').style.visibility = 'visible';
  document.getElementById('reset_button').style.visibility = 'visible';
  document.getElementById('menu_button').style.visibility = 'visible';
}
function hideSuccess() {
  document.getElementById('success').style.visibility = 'hidden';
  document.getElementById('reset_button').style.visibility = 'hidden';
  document.getElementById('menu_button').style.visibility = 'hidden';
}

function showGameOver() {
  document.getElementById('gameover').style.visibility = 'visible';
  document.getElementById('reset_button').style.visibility = 'visible';
  document.getElementById('menu_button').style.visibility = 'visible';
}
function hideGameOver() {
  document.getElementById('gameover').style.visibility = 'hidden';
  document.getElementById('reset_button').style.visibility = 'hidden';
  document.getElementById('menu_button').style.visibility = 'hidden';
}

function showMenu() {
  menu = true;
  playMenuTheme();
  document.getElementById('gameover').style.visibility = 'hidden';
  document.getElementById('success').style.visibility = 'hidden';
  document.getElementById('reset_button').style.visibility = 'visible';
  document.getElementById('menu').style.visibility = 'visible';
  document.getElementById('menu_button').style.visibility = 'hidden';
}

function hideMenu() {
  menu = false;
  playMainTheme();
  document.getElementById('reset_button').style.visibility = 'hidden';
  document.getElementById('menu').style.visibility = 'hidden';
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

var userInteraction = false;
function onMouseMove( event ) {
  if(mouse_down){
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
  }
}

function onMouseUp( event ) {
  mouse_down = false;
}

var validMovement = true;
function onMouseEnter( event ) {
  validMovement = false;
}
function onMouseLeave( event ) {
  validMovement = true;
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
var bloomPass = new UnrealBloomPass( new THREE.Vector2( 0.5*canvas.width, 0.5*canvas.height ), 1.0, 0.01, 0.1 );

var bloomComposer = new EffectComposer( renderer );
bloomComposer.setSize( 0.5*window.innerWidth, 0.5*window.innerHeight );
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
} ), "baseTexture");

finalPass.needsSwap = true;

var finalComposer = new EffectComposer( renderer );
finalComposer.setSize( 0.75*window.innerWidth, 0.75*window.innerHeight );
var glitchPass = new GlitchPass2();
finalComposer.addPass( renderScene );
finalComposer.addPass( finalPass );
finalComposer.addPass( glitchPass);

//*************** Entities ***************

//Floor
var tiles = [];
//Targets to deliver gifts to
var npcs = [];
//Gifts to pick up and deliver
var gifts = [];
//Damaging or blocking geometries
var obstacles = [];

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
    obstacleMap.set(index, [[i, obsMap[i][2]]]);
    if(obsMap[i][2] == ObstacleType.SPINNER){
      tiles[globalMap.get(index)].mesh.geometry = roundTileGeometry;
    }
  }
  //console.log(obstacleMap);
}

var giftMap = new Map();
function setGiftMap(objMap){
  giftMap.clear();
  for(var i = 0; i < objMap.length; i++){
    var index = objMap[i][1] * globalWidth + objMap[i][0];
    giftMap.set(index, [[i, objMap[i][2]]]);
  }
  //console.log(giftMap);
}

var npcMap = new Map();
function setNPCMap(objMap){
  npcMap.clear();
  for(var i = 0; i < objMap.length; i++){
    var index = objMap[i][1] * globalWidth + objMap[i][0];
    npcMap.set(index, [[i, objMap[i][2]]]);
  }
  //console.log(npcMap);
}

const ObstacleType = {
  SPINNER: 1,
  TIMER: 2,
  SLIDER: 3,
  TRAVELLER: 4 
};

const GiftType = {
  NONE: 1,
  ALPHA: 2,
  BETA: 3,
  GAMMA: 4
};

//Currently held gift
var inventory = {holding: false, gift: null};

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
       [1, 0, ObstacleType.SPINNER],
       [1, 1, ObstacleType.TRAVELLER],
       [1, 2, ObstacleType.SPINNER],
       [2, 2, ObstacleType.TRAVELLER],
       [3, 2, ObstacleType.SPINNER]
],
giftMap: [
       [0, 0, GiftType.ALPHA],
       [1, 0, GiftType.BETA],
       [1, 1, GiftType.GAMMA]
],
npcMap: [
       [0, 0, GiftType.ALPHA],
       [1, 0, GiftType.BETA],
       [1, 1, GiftType.GAMMA]
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

var tileGeometry = new THREE.BoxGeometry(20,100,20);
var roundTileGeometry = new THREE.CylinderGeometry(10, 10, 100, 32);
tileGeometry.translate(0,-50,0);
roundTileGeometry.translate(0,-50,0);
var tileMaterial = new THREE.MeshStandardMaterial({color: 0x999999, metalness: 0.5,  roughness: 0.5});

var posDelta = 20.5;

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

var cylinderLength = 20;
var cylinderGeometry = new THREE.CylinderGeometry( 0.5, 0.5, cylinderLength, 7 );
cylinderGeometry.rotateZ(Math.PI/2.0);

var sphereRadius = 1.2;
var sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
var whiteMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff} );

class Obstacle {
  constructor (type, pos, mesh, color, movement, rotation){
    this._type = type;
    this._pos = pos;
    this._originalPos = pos;
    this._mesh = mesh;
    this._colour;
    this._movement = movement;
    this._rotation = rotation;
    this._time = Math.random() * 6.283;
  }
  get type(){
    return this._type;
  }
  get position(){
    return this._pos;
  }
  get mesh(){
    return this._mesh;
  }
  get color(){
    return this._color;
  }
  get movement(){
    return this._movement;
  }
  get rotation(){
    return this._rotation;
  }
  move(speed){
    switch(this._type) {
      case ObstacleType.SPINNER:
	this._rotation.x = (this._rotation.x + this._movement.rX) % 6.283;
	this._rotation.y = (this._rotation.y + this._movement.rY) % 6.283;
	this._rotation.z = (this._rotation.z + this._movement.rZ) % 6.283;
	this._mesh.rotateX(this._movement.rX);
	this._mesh.rotateY(this._movement.rY);
	this._mesh.rotateZ(this._movement.rZ);
	break;
      case ObstacleType.TRAVELLER:
	this._time = (this._time + speed * 0.5) % 6.283;
	var x = this._originalPos.x + Math.sin(4*this._time) * 8;
	var z = this._originalPos.z + Math.cos(3*this._time) * 8;
	this._mesh.position.set(x, 0, z);
	break;
    }
  }
}

var glowMaterial = new THREE.MeshBasicMaterial( {color: 0xff3322} );

class Gift {
  constructor(type, pos, mesh, material) {
    this._type = type;
    this._pos = pos;
    this._mesh = mesh;
    this._material = material;
    this._active = true;
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
  get active(){
    return this._active;
  }
  set active(value){
    this._active = value;
  }
  move(dt){
    this._mesh.rotateY(dt);
  }
}

var giftAlphaMaterial = new THREE.MeshBasicMaterial( {color: 0x44ffaa, side: THREE.DoubleSide} );
var giftBetaMaterial = new THREE.MeshBasicMaterial( {color: 0xaa44ff, side: THREE.DoubleSide} );
var giftGammaMaterial = new THREE.MeshBasicMaterial( {color: 0xffaa44, side: THREE.DoubleSide} );
var giftAlphaGeometry = new THREE.CylinderGeometry( 1, 1, 0.2, 6 );
var giftBetaGeometry = new THREE.CylinderGeometry( 1, 1, 0.2, 3 );
var giftGammaGeometry = new THREE.CylinderGeometry( 1, 1, 0.2, 4 );
giftAlphaGeometry.rotateZ(Math.PI/2.0);
giftAlphaGeometry.translate(0, 1.0, 0);
giftBetaGeometry.rotateZ(Math.PI/2.0);
giftBetaGeometry.translate(0, 1.0, 0);
giftGammaGeometry.rotateZ(Math.PI/2.0);
giftGammaGeometry.translate(0, 1.0, 0);

var giftGeometry;
var giftMaterial;

class NPC {
  constructor(type, pos, mesh, material) {
    this._pos = pos;
    this._mesh = mesh;
    this._material = material;
    this._happy = false;
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
  get happy(){
    return this._happy;
  }
  giveGift(gift){
    this._happy = true;
    gift.mesh.position.copy(this._pos);
    gift.mesh.position.y = 2.0;
    this._mesh.material = gift.material;
    this._mesh.layers.enable(BLOOM);
    objectives--;
    score++;
    updateScore();
    if(objectives == 0){
      victory = true;
      playEnd();
      showSuccess();
    }
  }
  move(dt){
    this._mesh.rotateY(-dt);
  }

}

var npcAlphaMaterial = new THREE.MeshBasicMaterial( {color: 0x22dd88, side: THREE.DoubleSide } );
var npcBetaMaterial = new THREE.MeshBasicMaterial( {color: 0x8822dd, side: THREE.DoubleSide } );
var npcGammaMaterial = new THREE.MeshBasicMaterial( {color: 0xdd8822, side: THREE.DoubleSide } );
var npcAlphaGeometry = new THREE.RingGeometry( 1.5, 2, 6, 2);
var npcBetaGeometry = new THREE.RingGeometry( 1.5, 2.2, 3, 2);
var npcGammaGeometry = new THREE.RingGeometry( 1.5, 2, 4, 2);
npcAlphaGeometry.rotateZ(Math.PI/2.0);
npcAlphaGeometry.translate(0, 3.0, 0);
npcBetaGeometry.rotateZ(Math.PI/2.0);
npcBetaGeometry.translate(0, 3.0, 0);
npcGammaGeometry.rotateZ(Math.PI/2.0);
npcGammaGeometry.translate(0, 3.0, 0);

var npcGeometry;
var npcMaterial;

function populateWorld(level){

for(var i = 0; i < tiles.length; i++){
  scene.remove(tiles[i].mesh);
}
for(var i = 0; i < obstacles.length; i++){
  scene.remove(obstacles[i].mesh);
}
for(var i = 0; i < gifts.length; i++){
  scene.remove(gifts[i].mesh);
}
for(var i = 0; i < npcs.length; i++){
  scene.remove(npcs[i].mesh);
}

//Floor
tiles = [];
//Targets to deliver gifts to
npcs = [];
//Gifts to pick up and deliver
gifts = [];
//Damaging or blocking geometries
obstacles = [];

  for(var i = 0; i < level.map.length; i++){
    let posX = level.map[i][0];
    let posY = 0;
    let posZ = level.map[i][1];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);
    var tileMesh = new THREE.Mesh( tileGeometry, tileMaterial );
    tileMesh.receiveShadow = true;
    tileMesh.position.set(pos.x, pos.y, pos.z);
    var tile = new Tile(pos, tileMesh);
    tiles.push(tile);
  }

  for(var i = 0; i < tiles.length; i++){
    scene.add(tiles[i].mesh);
  }

  setGlobalMap(level.map);
  setObstacleMap(level.obstacleMap);

  for(var i = 0; i < level.obstacleMap.length; i++){
    let posX = level.obstacleMap[i][0];
    let posY = 0;
    let posZ = level.obstacleMap[i][1];
    var type = level.obstacleMap[i][2];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);

    switch(type) {
      case ObstacleType.SPINNER:
	var glowMesh = new THREE.Mesh( cylinderGeometry, glowMaterial );
	break;
      case ObstacleType.TRAVELLER:
	var glowMesh = new THREE.Mesh( sphereGeometry, glowMaterial );
	break;
    }



    glowMesh.layers.enable(BLOOM);
    glowMesh.position.set(pos.x, 1.0, pos.z);

    var translation = new THREE.Vector3(0.1, 0, 0);
    var rotation = new THREE.Vector3(0.0, 0.05, 0);

    var movement = new Movement(translation, rotation);
    //constructor (type, pos, mesh, color, movement)
    var rotation = new THREE.Vector3(0,0,0);
    var obstacle = new Obstacle(type, pos, glowMesh, glowMaterial, movement, rotation);
    obstacles.push(obstacle);
  }

  for(var i = 0; i < obstacles.length; i++){
    scene.add(obstacles[i].mesh);
  }

  for(var i = 0; i < level.giftMap.length; i++){
    let posX = level.giftMap[i][0];
    let posY = 0;
    let posZ = level.giftMap[i][1];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);

    pos.set(pos.x + posDelta * 0.8 * (Math.random() - 0.5), 0.0 , pos.z + posDelta * 0.8 * (Math.random() - 0.5));  

    let type = level.giftMap[i][2];

    switch(type){
      case GiftType.ALPHA:
	giftGeometry = giftAlphaGeometry;
	giftMaterial = giftAlphaMaterial;
	break;
      case GiftType.BETA:
	giftGeometry = giftBetaGeometry;
	giftMaterial = giftBetaMaterial;
	break;
      case GiftType.GAMMA:
	giftGeometry = giftGammaGeometry;
	giftMaterial = giftGammaMaterial;
	break;
    }

    var giftMesh = new THREE.Mesh( giftGeometry, giftMaterial );
    giftMesh.position.copy(pos);
    var gift = new Gift( type, pos, giftMesh, giftMaterial );
    giftMesh.layers.enable(BLOOM);
    gifts.push(gift);
  }
  for(var i = 0; i < gifts.length; i++){
    scene.add(gifts[i].mesh);
  }

  for(var i = 0; i < level.npcMap.length; i++){
    let posX = level.npcMap[i][0];
    let posY = 0;
    let posZ = level.npcMap[i][1];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);

    pos.set(pos.x + posDelta * 0.8 * (Math.random() - 0.5), 0.0 , pos.z + posDelta * 0.8 * (Math.random() - 0.5));  

    let type = level.npcMap[i][2];

    switch(type){
      case GiftType.ALPHA:
	npcGeometry = npcAlphaGeometry;
	npcMaterial = npcAlphaMaterial;
	break;
      case GiftType.BETA:
	npcGeometry = npcBetaGeometry;
	npcMaterial = npcBetaMaterial;
	break;
      case GiftType.GAMMA:
	npcGeometry = npcGammaGeometry;
	npcMaterial = npcGammaMaterial;
	break;
    }

    var npcMesh = new THREE.Mesh( npcGeometry, npcMaterial );
    npcMesh.position.copy(pos);
    var npc = new NPC( type, pos, npcMesh, npcMaterial );
    //npcMesh.layers.enable(BLOOM);
    npcs.push(npc);
  }

  for(var i = 0; i < npcs.length; i++){
    scene.add(npcs[i].mesh);
  }

  setGiftMap(level.giftMap);
  setNPCMap(level.npcMap);
}

populateWorld(lvl1);
objectives = npcs.length;

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

var endPoint1 = new THREE.Vector2(0,0);
var endPoint2 = new THREE.Vector2(0,0);
var anchor = new THREE.Vector2(0,0);
var rotation = new THREE.Vector3(0,0,0);

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
      var index = _obstacles[i][0];
      var type = _obstacles[i][1];
      switch(type) {
	case ObstacleType.SPINNER:
	  endPoint1.set(obstacles[index].position.x - cylinderLength/2.0, obstacles[index].position.z);
	  anchor.set(obstacles[index].position.x, obstacles[index].position.z);
	  rotation.copy(obstacles[index].rotation);
	  endPoint1.rotateAround(anchor, -rotation.y);
	  endPoint2.copy(endPoint1);
	  endPoint2.rotateAround(anchor, -Math.PI);

	  if(distanceToLine(player.position.x, player.position.z, endPoint1.x, endPoint1.y, endPoint2.x, endPoint2.y) < 1){
	    return true;
	  }
	  
	  var dx = player.position.x - obstacles[index].mesh.position.x;
	  var dz = player.position.z - obstacles[index].mesh.position.z;
	  if(Math.sqrt((dx*dx)+(dz*dz)) > 11){
	    return true;
	  }
	  break;
	case ObstacleType.TIMER:
	  // code block
	  break;
	case ObstacleType.SLIDER:
	  // code block
	  break;
	case ObstacleType.TRAVELLER:
	  var dx = player.position.x - obstacles[index].mesh.position.x;
	  var dz = player.position.z - obstacles[index].mesh.position.z;
	  if(Math.sqrt((dx*dx)+(dz*dz)) < (sphereRadius + 0.5)){
	    return true;
	  }
	  // code block
	  break;
	default:
	  console.log("ERROR: Unknown obstacle type at collision");
	  // code block
      }
    } 
  }
  return false;
}

function checkPickUp(){
  //Position Y will be invalid and will not be used
  playerLocation.copy(player.position);
  playerLocation.addScalar(posDelta*0.5);
  var iX = Math.floor(playerLocation.x / posDelta);
  var iZ = Math.floor(playerLocation.z / posDelta);
  var index = iZ * globalWidth + iX;

  if(giftMap.has(index)){
    var _gifts = giftMap.get(index);

    for(var i = 0; i < _gifts.length; i++){
      var index = _gifts[i][0];
      var type = _gifts[i][1];

      var dx = player.position.x - gifts[index].mesh.position.x;
      var dz = player.position.z - gifts[index].mesh.position.z;
      if(gifts[index].active){
	if(Math.sqrt((dx*dx)+(dz*dz)) < (2.0)){
	  inventory.holding = true;
	  inventory.gift = gifts[index];
	  inventory.gift.active = false;
	  return true;
	}
      }
    }
  }
  return false;
}

function checkDropOff(){
  //Position Y will be invalid and will not be used
  playerLocation.copy(player.position);
  playerLocation.addScalar(posDelta*0.5);
  var iX = Math.floor(playerLocation.x / posDelta);
  var iZ = Math.floor(playerLocation.z / posDelta);
  var index = iZ * globalWidth + iX;

  if(npcMap.has(index)){
    var _npcs = npcMap.get(index);

    for(var i = 0; i < _npcs.length; i++){
      var index = _npcs[i][0];
      var type = _npcs[i][1];

      var dx = player.position.x - npcs[index].mesh.position.x;
      var dz = player.position.z - npcs[index].mesh.position.z;
      if(!npcs[index].happy){
	if(type == inventory.gift.type){
	  if(Math.sqrt((dx*dx)+(dz*dz)) < (2.0)){
	    inventory.holding = false;
	    npcs[index].giveGift(inventory.gift);
	    return true;
	  }
	}
      }
    }
  }
  return false;
}

//************** Move ******************
var oldPos = new THREE.Vector3(0,0,0);
var newPos = new THREE.Vector3(0,0,0);
var dir = new THREE.Vector3(0,0,0);
function move(t, dt){

//Move obstacles
  for(var i = 0; i < obstacles.length; i++){
    obstacles[i].move(dt);
  }
  for(var i = 0; i < gifts.length; i++){
    gifts[i].move(dt);
  }

  for(var i = 0; i < npcs.length; i++){
    npcs[i].move(dt);
  }
  if(validMovement){
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
      if(inventory.holding){
	inventory.gift.mesh.position.copy(newPos);
	inventory.gift.mesh.position.y = 1.5;
      }

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
}

//Actually the exact opposite of falling
function fall(dt){
  player.position.set(player.position.x, player.position.y + dt, player.position.z);
}

function updateScore(){
  document.getElementById("score").innerHTML = "GIFTS GIVEN " + score + "/" + npcs.length;
}

updateScore();

function toggleAudio(){
  if(sound){
    pauseAudio();
  }else{
    playTheme();
  }
}

function resetWorld(){
  deducted = false;
  lives = 3;
  menu = false;
  objectives = 1;
  score = 0;
  populateWorld(lvl1);
  objectives = npcs.length;
  updateScore();
  alive = true;
  victory = false;
  inventory.holding = false;
  hideGameOver();
  hideSuccess();
  player.position.copy(playerStartPosition);
  plane.position.copy(playerStartPosition);
  camera.position.copy(cameraStartPosition);
  directionalLight.position.copy(directionalLightStartPosition);
  directionalLight.target = player;
  hideMenu();
}

function startGame(){
  document.getElementById('start_button').style.visibility = 'hidden';
  document.getElementById('audio_button').style.visibility = 'visible';
  initAudio();
  showMenu();
};

var startButton = document.getElementById("start_button");
startButton.addEventListener('click', startGame);

var audioButton = document.getElementById("audio_button");
audioButton.addEventListener('click', toggleAudio);
audioButton.addEventListener( 'mouseenter', onMouseEnter, false );
audioButton.addEventListener( 'mouseleave', onMouseLeave, false );

var resetButton = document.getElementById("reset_button");
resetButton.addEventListener('click', resetWorld);

var menuButton = document.getElementById("menu_button");
menuButton.addEventListener('click', showMenu);

//************** Draw **************
var time = 0;
var targetDir = new THREE.Vector3(0,0,0);
var lastFrame = Date.now();
var thisFrame;
var bounds = true;
var collision = false;
var deathFrames = 0;

var deducted = false;

function draw(){
  stats.begin();
  if(!menu){
    if(!victory){
      if(deathFrames == 100 && (lives > 0)){
	deducted = false;
	deathFrames = 0;
	if(inventory.holding){
	  inventory.gift.active = true;
	  inventory.gift.mesh.position.copy(inventory.gift.position);
	  inventory.holding = false;
	}
	alive = true;
	hideGameOver();
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
      if(!bounds){
	if(!deducted){
	  lives = Math.max(0, lives-1);
	  deducted = true;
	}
	alive = false;
	if(lives == 0){
	  showGameOver();
	}
      }
      if(alive){
	  playDamage();
	if(intersect[0] && mouse_down){
	  targetDir = intersect[0].point;
	}else{
	  targetDir = player.position;
	}
	move(targetDir, dt);
	if(!inventory.holding){
	  checkPickUp();
	}else{
	  checkDropOff();
	}  
	collision = checkCollision();
	if(collision){
	  alive = false;
	  if(!deducted){
	    lives = Math.max(0, lives-1);
	    deducted = true;
	  }
	  if(lives == 0){
	    showGameOver();
	  }
	}
      }

      if(!alive){
	fall(dt);
	deathFrames++;
	glitchPass.goWild = true;

      }else{
	glitchPass.goWild = false;
      }
    }
    // render scene with bloom
    renderBloom();

    // render the entire scene, then render bloom scene on top
    finalComposer.render();
  }
  stats.end();
  requestAnimationFrame(draw);
}

draw();

function renderBloom() {
  scene.traverse( darkenNonBloomed );
  renderer.setClearColor( 0x000000, 1);
  bloomComposer.render();
  renderer.setClearColor( 0x272738, 1);
  scene.traverse( restoreMaterial );
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
