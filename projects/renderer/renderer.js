import {Camera} from "./camera.js"
import {Controls} from "./controls.js"
import {Program} from "./program.js"
import {Geometry} from "./geometry.js"
import {NormalMaterial} from "./materials/normalMaterial.js"
import {PBRMaterial} from "./materials/pbrMaterial.js"
import {LambertMaterial} from "./materials/lambertMaterial.js"
import {UVMaterial} from "./materials/uvMaterial.js"
import {TextureMaterial} from "./materials/textureMaterial.js"
import {Environment} from "./environment.js"
import {loadTexture, createAndSetupCubemap} from "./texture.js"
import {Mesh} from "./mesh.js";
import {canvas, gl} from "./canvas.js";
import {GLTFLoader} from "./GLTFLoader.js";
import {Downloader} from "./downloader.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {getSphericalHarmonicsMatrices} from "./iblUtils.js";

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
  case "corridor":
    path  = "./gltf/corridor/scene.gltf";
    break;
  case "jedifighter":
    path  = "./gltf/jedifighter/scene.gltf";
    break;
  case "spheres":
    path  = "./gltf/spheres/MetalRoughSpheres.gltf";
    break;
  default:
    path = "./gltf/duck/Duck.gltf";
}
var workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);

var p = Downloader.start([{name:"Test",type:"gltf", file: path}]).then(function(){
    console.log("Downloader Complete");
    setTimeout(loadGLTF, 50);
    }).catch(function(error){
      console.error("error",error);
      });

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

//let cubeMap = createAndSetupCubemap();
//let environmentMaterial = new EnvironmentMaterial(cubeMap);
//let environmentMesh = new Mesh(getScreenspaceQuad(), environmentMaterial);  

//var path = './environmentMaps/dikhololo_night_1k.hdr';
//var path = './environmentMaps/venice_sunset_1k.hdr';
//var path = './environmentMaps/venice_sunrise_1k.hdr';
//var path = './environmentMaps/san_giuseppe_bridge_1k.hdr';
//var path = './environmentMaps/spruit_sunrise_1k.hdr';
//var path = './environmentMaps/studio_small_03_1k.hdr';
//var path = './environmentMaps/cape_hill_1k.hdr';
var path = './environmentMaps/1k.hdr';

/*
var myHDR = new HDRImage();
myHDR.src = path;
myHDR.onload = function() {
  console.log(">>>>> loading done");
}*/
//let environment = new Environment({path: "./defaultResources/uv_grid.jpg", type: "cubemap"});
let environment = new Environment({path: path, type: "hdr", camera: camera});

//let shMatrices = getSphericalHarmonicsMatrices(cubeMap);

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

      let modelMatrix = node.matrix;

      if(model == "boombox"){
        modelMatrix = m4.scale(modelMatrix, 100, 100, 100);
      }

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
      var occlusionTextureID = 0;

      var albedoTexture = null;
      var normalTexture = null;
      var emissiveTexture = null;
      var occlusionRoughMetalTexture = null;
      var occlusionTexture = null;

      let gltfMaterial = materials[gltfMaterialID];
      let pbrDesc = gltfMaterial.pbrMetallicRoughness;

      if(pbrDesc.baseColorTexture){
        textureID = pbrDesc.baseColorTexture.index;
        albedoTexture = textures[textureID];
      }
      if(pbrDesc.metallicRoughnessTexture){
        occlusionRoughMetalTextureID = pbrDesc.metallicRoughnessTexture.index;
        occlusionRoughMetalTexture = textures[occlusionRoughMetalTextureID];
      }
      if(gltfMaterial.occlusionTexture){
        occlusionTextureID = gltfMaterial.occlusionTexture.index;
        occlusionTexture = textures[occlusionTextureID];
      }
      if(gltfMaterial.normalTexture){
        normalTextureID = gltfMaterial.normalTexture.index;
        normalTexture = textures[normalTextureID];
      }
      if(gltfMaterial.emissiveTexture){
        emissiveTextureID = gltfMaterial.emissiveTexture.index;
        emissiveTexture = textures[emissiveTextureID];
      }

      //let material = new TextureMaterial(albedoTexture);
      let material = new PBRMaterial({albedoTexture: albedoTexture, normalTexture: normalTexture, emissiveTexture: emissiveTexture, propertiesTexture: occlusionRoughMetalTexture, aoTexture: occlusionTexture, environment: environment});
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
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  if(environment.needsUpdate()){
    environment.generateIBLData();
  }

  camera.exposure = 2.0*(0.5+0.5*Math.sin(time));

  environment.render(camera, time);

  gl.depthMask(true);

  for(let i = 0; i < meshes.length; i++){
    if(meshes[i] != null){
      meshes[i].render(camera, time);  
    }
  }

  stats.end();
  requestAnimationFrame(draw);
}

draw();
