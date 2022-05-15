import {Camera} from "./camera.js"
import {Controls} from "./controls.js"
import {Program} from "./program.js"
import {Geometry} from "./geometry.js"
import {SnowMaterial} from "./materials/snowMaterial.js"
import {Mesh} from "./mesh.js";
import {canvas, gl, enums} from "./canvas.js";
import {programRepository} from "./programRepository.js"

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('canvas_container').appendChild(stats.domElement);

var yaw = Math.PI/4.0;
var pitch = 0.0;
var dist = 1.0;
var up = [0, 1, 0];

var fov = 45 * Math.PI / 180;
var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
var zNear = 0.1;
var zFar = 1000.0;

var camera = new Camera(pitch, yaw, dist, [0, 0, 0], up, fov, aspect, zNear, zFar);
var controls = new Controls(camera);

//Time
var time = 0.0;

var params = {speed: 0.06};

//************* GUI ***************
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(params, 'speed').min(0.0).max(0.2).step(0.001);
gui.close();

var readyToRender = false;

var geometries = [];
var transparentMeshes = [];

let count = 100000.0;
let vertices = [];

for(let i = 0; i < count; i++){
  let x = 2.0 * Math.random() - 1.0;
  let y = 2.0 * Math.random() - 1.0;
  let z = 2.0 * Math.random() - 1.0;
  vertices.push(x, y, z);
}

let g = new Geometry({vertices: new Float32Array(vertices), length: count, primitiveType: gl.POINTS});
let material = new SnowMaterial();

//g.setModelMatrix(modelMatrix);

geometries.push(g);

let mesh = new Mesh(g, material);
transparentMeshes.push(mesh);

console.log(programRepository);


camera.setTarget([0,0,0]);

readyToRender = true;

var lastFrame = Date.now();
var thisFrame;

function setCameraMatrices(){
  camera.setProjectionMatrix(); 
  camera.setCameraMatrix(); 
  camera.setViewMatrix();
}


function draw(){

  stats.begin();
  //Update time
  thisFrame = Date.now();
  let dT = (thisFrame - lastFrame)/1000;	
  time += dT;
  lastFrame = thisFrame;

  controls.move(dT);

  setCameraMatrices(); 

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  //gl.cullFace(gl.BACK);
  gl.depthMask(false);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  
  material.setSpeed(params.speed);

  for(let i = 0; i < transparentMeshes.length; i++){
    if(transparentMeshes[i] != null){
      transparentMeshes[i].render(camera, time);  
    }
  }

  gl.disable(gl.BLEND);

  stats.end();
  requestAnimationFrame(draw);
}

draw();
