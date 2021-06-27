import {Camera} from "./camera.js"
import {Controls} from "./controls.js"
import {Program} from "./program.js"
import {Geometry} from "./geometry.js"
import {NormalMaterial} from "./normalMaterial.js"
import {PBRMaterial} from "./pbrMaterial.js"
import {LambertMaterial} from "./lambertMaterial.js"
import {UVMaterial} from "./uvMaterial.js"
import {TextureMaterial} from "./textureMaterial.js"
import {loadTexture} from "./texture.js"
import {Mesh} from "./mesh.js";
import {canvas, gl} from "./canvas.js";
import {GLTFLoader} from "./GLTFLoader.js";
import {Downloader} from "./downloader.js";

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

var path;

var model = "flighthelmet";

switch(model){
  case "boombox":
    path  = "./gltf/boombox/BoomBox.gltf";
    break;
  case "sponza":
    path  = "./gltf/sponza/Sponza.gltf";
    break;
  case "damagedhelmet":
    path  = "./gltf/helmet/DamagedHelmet.gltf";
    break;
  case "flighthelmet":
    path  = "./gltf/flighthelmet/FlightHelmet.gltf";
    break;
  case "car":
    path  = "./gltf/toycar/ToyCar.gltf";
    break;
  case "fox":
    path  = "./gltf/fox/Fox.gltf";
    break;
  default:
    path = "./gltf/duck/Duck.gltf";
}
var workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);

var p = Downloader.start([
    {name:"Test",type:"gltf", file: path} //RiggedSimple Pirate Girl_upload vive_controller
]).then(function(){
  console.log("Downloader Complete");
  setTimeout(loadGLTF, 50); //Push it out into own thread, else errors in onInit will show up in the promise catch.
  }).catch(function(error){
    console.error("error",error);
    });

var yaw = Math.PI/4.0;
var pitch = 0.0;
var dist = 1.0;
var up = [0, 1, 0];

var fov = 45 * Math.PI / 180;
var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
var zNear = 0.001;
var zFar = 100.0;

var camera = new Camera(pitch, yaw, dist, [0, 0, 0], up, fov, aspect, zNear, zFar);
var controls = new Controls(camera);

var numCubes = 1;

var instances = 1000;

var positions = [];

var  scale = 50;
for(let i = 0; i < numCubes; i++){
  let x_ = 2*Math.random()-1.0;
  let y_ = 2*Math.random()-1.0;
  let z_ = 2*Math.random()-1.0;
  positions.push({x: scale*x_, y: scale*y_, z: scale*z_});
}

var rotations = [];

for(let i = 0; i < numCubes; i++){
  let x_ = 2*Math.random()-1.0;
  let y_ = 2*Math.random()-1.0;
  let z_ = 2*Math.random()-1.0;
  rotations.push({x: scale*x_, y: scale*y_, z: scale*z_});
}

//4 vertices per face
const vertices = new Float32Array([
    // Front face
    -1.0, -1.0,  1.0,
    1.0, -1.0,  1.0,
    1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
    1.0,  1.0,  1.0,
    1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0,  1.0,  1.0,
    1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
    ]);

const vertexNormals =  new Float32Array([
    // Front
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,

    // Back
    0.0,  0.0, -1.0,
    0.0,  0.0, -1.0,
    0.0,  0.0, -1.0,
    0.0,  0.0, -1.0,

    // Top
    0.0,  1.0,  0.0,
    0.0,  1.0,  0.0,
    0.0,  1.0,  0.0,
    0.0,  1.0,  0.0,

    // Bottom
    0.0, -1.0,  0.0,
    0.0, -1.0,  0.0,
    0.0, -1.0,  0.0,
    0.0, -1.0,  0.0,

    // Right
    1.0,  0.0,  0.0,
    1.0,  0.0,  0.0,
    1.0,  0.0,  0.0,
    1.0,  0.0,  0.0,

    // Left
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0
    ]);

    const vertexUVs =  new Float32Array([
        // Front
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,

        // Back
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,

        // Top
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,

        // Bottom
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,

        // Right
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,

        // Left
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0
        ]);


        const indices = new Uint16Array([
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ]);


//Time
var time = 0.0;

var offsets = [];
for(let i = 0; i < instances; i++){
  let x_ = 2*Math.random()-1.0;
  let y_ = 2*Math.random()-1.0;
  let z_ = 2*Math.random()-1.0;
  offsets.push(scale * x_, scale * y_, scale * z_);
}
offsets = new Float32Array(offsets);
var scales = [];
scale = 1.0;
for(let i = 0; i < instances; i++){
  let x_ = Math.random();
  let y_ = Math.random();
  let z_ = Math.random();
  scales.push(0.1+x_, 0.1+x_, 0.1+x_);
}
scales = new Float32Array(scales);

var axesAndAngles = [];

for(let i = 0; i < instances; i++){
  let x_ = 2*Math.random()-1.0;
  let y_ = 2*Math.random()-1.0;
  let z_ = 2*Math.random()-1.0;
  let angle = Math.random()-1.0;

  let axis = [x_, y_, z_];
  axis = normalize(axis); 

  axesAndAngles.push(axis[0],axis[1],axis[2],angle);
}


var orientations_ = [];
for(let i = 0; i < instances; i++){
  let angle = axesAndAngles[i*4+3];
  let axis = [axesAndAngles[i*4], axesAndAngles[i*4+1], axesAndAngles[i*4+2]]; 

  let sinAngle = Math.sin(Math.PI * angle);
  let x = axis[0] * sinAngle;
  let y = axis[1] * sinAngle;
  let z = axis[2] * sinAngle;
  let w = Math.cos(Math.PI* angle);

  orientations_.push(x,y,z,w);
}
var orientations = new Float32Array(orientations_);

//var geometry = new Geometry({vertices: vertices, length: 36, indices: indices, normals: vertexNormals, uvs: vertexUVs, instances: instances, offsets: offsets, scales: scales, orientations: orientations});

var gltfNormals;
var gltfVertices;
var gltfIndices; 
var gltfUVs; 
var gltfTangents; 
var gltfCount; 
var gltfMaterialID;

var readyToRender = false;

var geometries = [];
var meshes = [];

var images = [];
var materials = [];
var textures = [];

var minExtent = [10000, 10000, 10000];
var maxExtent = [-10000, -10000, -10000];

function loadGLTF(){

  var loader = new GLTFLoader();

  console.log(Downloader.Complete[0].dl);
  let gltf = loader.load(Downloader.Complete[0].dl, true);
  console.log(gltf);

  images = Downloader.Complete[0].dl.images;
  materials = Downloader.Complete[0].dl.materials;

  for(let i = 0; i < images.length; i++){ 
    let texture = loadTexture(workingDirectory.concat(images[i].uri));
    textures.push(texture);
  }  

  for(let i = 0; i < gltf.nodes.length; i++){
    let node = gltf.nodes[i];
    let gltfMeshes = node.meshes;

    for(let m = 0; m < gltfMeshes.length; m++){
      let gltfMesh = gltf.meshes[gltfMeshes[m]];
      gltfVertices = gltfMesh.vertices.data;
      if(gltfMesh.normals){
        gltfNormals = gltfMesh.normals.data;
      }
      if(gltfMesh.indices){
        gltfIndices = gltfMesh.indices.data;
        gltfCount = gltfMesh.indices.count;
      }
      gltfUVs = gltfMesh.texcoord.data;
      if(gltfMesh.tangent){
        gltfTangents = gltfMesh.tangent.data;
      }
      gltfMaterialID = gltfMesh.material;

      let g = new Geometry({vertices: gltfVertices, length: gltfCount, indices: gltfIndices,  normals: gltfNormals, uvs: gltfUVs, tangents: gltfTangents});


      let translate = [0 ,0, 0];
      let rotate = [0, 0, 0];
      let scale = [1, 1, 1];

      if(node.hasOwnProperty("rotate") && node.rotate){
        rotate = quaternionToEuler(node.rotate);
      }
      if(node.hasOwnProperty("scale") && node.scale){
        scale = node.scale;
      }
      if(node.hasOwnProperty("translate") && node.translate){
        translate = node.translate;
      }

      let modelMatrix = m4.create();
      modelMatrix = m4.translate(modelMatrix, translate[0], translate[1], translate[2]); 

      modelMatrix = m4.zRotate(modelMatrix, rotate[2]);
      modelMatrix = m4.yRotate(modelMatrix, rotate[1]);
      modelMatrix = m4.xRotate(modelMatrix, rotate[0]); 
      modelMatrix = m4.scale(modelMatrix, scale[0], scale[1], scale[2]);

      g.setModelMatrix(modelMatrix);

      let min = m4.transformVector(modelMatrix, gltfMesh.vertices.min);
      let max = m4.transformVector(modelMatrix, gltfMesh.vertices.max);
      minExtent = [Math.min(minExtent[0], min[0]), Math.min(minExtent[1], min[1]), Math.min(minExtent[2], min[2])];
      maxExtent = [Math.max(maxExtent[0], max[0]), Math.max(maxExtent[1], max[1]), Math.max(maxExtent[2], max[2])];

      var normalMatrix = m4.create();
      m4.invert(normalMatrix, modelMatrix);
      m4.transpose(normalMatrix, normalMatrix);

      g.setNormalMatrix(normalMatrix);

      geometries.push(g);

      var textureID = 0;
      var normalTextureID = 0;
      var emissiveTextureID = 0;
      var occlusionRoughMetalTextureID = 0;

      var albedoTexture = null;
      var normalTexture = null;
      var emissiveTexture = null;
      var occlusionRoughMetalTexture = null;

      if(materials[gltfMaterialID].pbrMetallicRoughness.baseColorTexture){
        textureID = materials[gltfMaterialID].pbrMetallicRoughness.baseColorTexture.index;
        albedoTexture = textures[textureID];
      }
      if(materials[gltfMaterialID].pbrMetallicRoughness.metallicRoughnessTexture){
        occlusionRoughMetalTextureID = materials[gltfMaterialID].pbrMetallicRoughness.metallicRoughnessTexture.index;
        occlusionRoughMetalTexture = textures[occlusionRoughMetalTextureID];
      }
      if(materials[gltfMaterialID].normalTexture){
        normalTextureID = materials[gltfMaterialID].normalTexture.index;
        normalTexture = textures[normalTextureID];
      }
      if(materials[gltfMaterialID].emissiveTexture){
        emissiveTextureID = materials[gltfMaterialID].emissiveTexture.index;
        emissiveTexture = textures[emissiveTextureID];
      }

      let material = new PBRMaterial({albedoTexture: albedoTexture, normalTexture: normalTexture, emissiveTexture: emissiveTexture, propertiesTexture: occlusionRoughMetalTexture});
      let mesh = new Mesh(g, material);

      meshes.push(mesh);
    }
  }

  console.log(minExtent);
  console.log(maxExtent);
  
  let centre = [(maxExtent[0] + minExtent[0])/2.0, (maxExtent[1] + minExtent[1])/2.0, (maxExtent[2] + minExtent[2])/2.0,]

  console.log(centre);
  camera.setTarget(centre);

  readyToRender = true;
}



var geometry = new Geometry({vertices: vertices, length: 36, indices: indices, normals: vertexNormals, uvs: vertexUVs});

var modelMatrix = m4.create();
//modelMatrix = m4.translate(modelMatrix, 24, -178, -52); 

//modelMatrix = m4.zRotate(modelMatrix, rotations[0].z+time); 
//modelMatrix = m4.xRotate(modelMatrix, rotations[0].x+time);
//modelMatrix = m4.yRotate(modelMatrix, rotations[0].y+time);
modelMatrix = m4.scale(modelMatrix, 2.0, 1.0, 1.0);

geometry.setModelMatrix(modelMatrix);

var normalMatrix = m4.create();
m4.invert(normalMatrix, modelMatrix);
m4.transpose(normalMatrix, normalMatrix);

geometry.setNormalMatrix(normalMatrix);

var cube;// = new Mesh(geometry, material);

var mesh;

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

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  /* 
     for(let i = 0; i < geometries.length; i++){ 
     var modelMatrix = m4.create();
  //modelMatrix = m4.translate(modelMatrix, 0, -200.0, 0.0); 

  //modelMatrix = m4.zRotate(modelMatrix, rotations[0].z+time); 
  //modelMatrix = m4.xRotate(modelMatrix, Math.PI/2.0);
  //modelMatrix = m4.yRotate(modelMatrix, rotations[0].y+time);
  modelMatrix = m4.scale(modelMatrix, 1.0, 1.0, 1.0);

  geometries[i].setModelMatrix(modelMatrix);

  var normalMatrix = m4.create();
  m4.invert(normalMatrix, modelMatrix);
  m4.transpose(normalMatrix, normalMatrix);

  geometries[i].setNormalMatrix(normalMatrix);
  }
   */

  for(let i = 0; i < meshes.length; i++){
    if(meshes[i] != null){
      meshes[i].render(camera, time);  
    }
  }
  //cube.render(camera);  

  stats.end();
  requestAnimationFrame(draw);
}

draw();
