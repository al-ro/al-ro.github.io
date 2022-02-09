import {download} from "./download.js"
import {gl, enums} from "./canvas.js"
import {Node} from "./node.js"
import {PBRMaterial} from "./materials/pbrMaterial.js"
import {NormalMaterial} from "./materials/normalMaterial.js"
import {TextureMaterial} from "./materials/textureMaterial.js"
import {LambertMaterial} from "./materials/lambertMaterial.js"
import {UVMaterial} from "./materials/uvMaterial.js"
import {Geometry} from "./geometry.js"
import {Mesh} from "./mesh.js"
import {BufferRepository} from "./bufferRepository.js"
import {Attribute, supportedAttributes} from "./attribute.js"
import {Indices} from "./indices.js"
import {loadTexture} from "./texture.js"

// Download and process GLTF file and create scenes of drawable Mesh object with a geometry and PBR material

// TODO:
//  multiple scenes
//  ready status
//  detructor
//  full spec conform (color_0, sampler)
//  sparse accessor
//  image from bufferView
//  animation
//  extensions
//  morph
//  skins

export class GLTF{

  // Description of the GLTF
  json;

  // Binary data for vertices, indices, normals etc.
  buffers = [];

  // WebGL textures for albedo, roughness and emissive maps etc.
  textures = [];

  // Scene graphs of nodes
  nodes = [];

  // Default scene to display
  scene = 0;

  // Drawable mesh objects
  meshes = [];

  // Repository of gl.Buffer objects
  bufferRepository;

  // IBL data for PBR material
  environment;

  // Promise which resolves when all downloads and processing has completed
  ready;

  // Extent of model vertices
  min;
  max;
  centre;

  constructor(path, environment){

    this.environment = environment;

    let workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);
    // Downlod gltf file and construct internal objects
    download(path, "gltf").then(data => this.processGLTF(data, workingDirectory));
  }

  destroy(){
    this.ready.then(() => {
      // Free buffers
      // Free webgl buffers
      // Free bufferRepository
      // Free typed arrays

      // Free textures
      // Free webgl textures
      // Free images

      // Free meshes
      // Free nodes
      // Delete json
    });
  }

  // Parse the json, download images and buffers, construct meshes
  processGLTF(json, workingDirectory, scene){

    this.bufferRepository = new BufferRepository();

    this.json = json;
    console.log("Full GLTF: ", json);

    if(scene != null){
      this.scene = scene;
    }else if(this.json.scene != null){
      this.scene = this.json.scene;
    }

    // Promises which resolve once buffer downloads have completed
    let buffersDownloaded = new Promise((resolve, reject) => {});

    // Promise which resolved when the gltf has been processed
    let gltfLoadingDone = new Promise((resolve, reject) => {});
    
    if(json.buffers){

      // Populate buffer array with promises of each gltf buffer to fetch
      for(const buffer of json.buffers){
        let prefix = "";

        if(buffer.uri.substring(0, 5) != "data:"){
          prefix = workingDirectory;
        }
        
        this.buffers.push(download(prefix.concat(buffer.uri), "arrayBuffer")); 
      }

      // Once all buffers are ready, replace the promises with the data
      buffersDownloaded = Promise.all(this.buffers).then(buffers => {
        this.buffers = buffers;
      }).catch(e => {console.error("Buffer promises unresolved: ", e)});

    }else{
      console.error("GLTF file has no buffers: ", json);
    }

    if(json.images){
      // Create textures and trigger data downloads but don't wait for them to finish.
      // Image files take long to fetch and we can create a single pixel texture,
      // render the geometry and replace the data with the image file when it has loaded.
      for(const image of json.images){
        if(image.hasOwnProperty("uri") && image.uri != null){
          let prefix = "";

          if(image.uri.substring(0, 5) != "data:"){
            prefix = workingDirectory;
          }
          this.textures.push(loadTexture(prefix.concat(image.uri)));
        }else{
          //TODO: image from bufferview. Might not have loaded yet.
          console.error("Image from buffer: ", image);
        }
      }
    }

    // Once we have the buffers, we can process the gltf
    buffersDownloaded.then(p => {
        this.nodes = this.processNodes(this.json.nodes);
        this.setChildren(this.nodes);
        for(const node of this.json.scenes[this.scene].nodes){
          this.nodes[node].updateChildren();
        }
        console.log("Nodes: ", this.nodes); 
        this.scaleAndCentre();
    }).catch(e => {console.error("Download promises unresolved: ", e)});
 
    return gltfLoadingDone;
  }

  // Create array of Mesh objects and nodes from the GLTF
  processNodes(gltfNodes){

    const nodes = [];

    for(const gltfNode of gltfNodes){

      const transform = this.getTransform(gltfNode);
      const indices = gltfNode.children != null ? gltfNode.children : [];

      const params = {localModelMatrix: transform, childIndices: indices};

      // If node describes a mesh, process it
      if(gltfNode.hasOwnProperty("mesh") && gltfNode.mesh != null){

        // Get the primitives of the gltf mesh
        const primitive = this.processMesh(this.json.meshes[gltfNode.mesh]);

        if(primitive.length > 1){
          // When there are multiple primitives, set them as the children of a new empty node
          const node = new Node(params);
          node.setChildren(primitive);
          // Add the node to the scene graph
          nodes.push(node);
        }else{
          // Otherwise set the Mesh object as a node of the scene graph
          primitive[0].setChildIndices(params.childIndices);
          primitive[0].setLocalModelMatrix(params.localModelMatrix);
          nodes.push(primitive[0]);
        }

      }else{
        // If it's not a mesh, add a new empty node in the scene graph
        nodes.push(new Node(params));
      }
    }

    return nodes;
  }

  setChildren(nodes){
    for(const node of nodes){
      if(node.childIndices.length > 0){
        // Add child references to nodes which exist in the scene graph
        for(const childIdx of node.childIndices){
          node.children.push(nodes[childIdx]);
        }
      }
    }
  }

  scaleAndCentre(){
    this.calculateCentre();
    let modelMatrix = m4.create();

    const scale = [1, 1, 1];
    const maxExtent = Math.max(Math.max(this.max[0] - this.min[0], this.max[1] - this.min[1]), this.max[2] - this.min[2]);
    scale[0] /= maxExtent;
    scale[1] /= maxExtent;
    scale[2] /= maxExtent;

    modelMatrix = m4.scale(modelMatrix, scale[0], scale[1], scale[2]);
    modelMatrix = m4.translate(modelMatrix, -this.centre[0], -this.centre[1], -this.centre[2]);

    for(const node of this.json.scenes[this.scene].nodes){
      this.nodes[node].updateMatrix(modelMatrix);
    }

  }

  calculateCentre(){
    this.min = [1e5, 1e5, 1e5];
    this.max = [-1e5, -1e5, -1e5];
    for(const mesh of this.meshes){
      let meshMin = mesh.getMin();
      let meshMax = mesh.getMax();
      for(let i = 0; i < 3; i++){
        this.min[i] = Math.min(this.min[i], meshMin[i]);
        this.max[i] = Math.max(this.max[i], meshMax[i]);
      }
    }
    this.centre = [ this.min[0] + 0.5 * (this.max[0] - this.min[0]),
                    this.min[1] + 0.5 * (this.max[1] - this.min[1]),
                    this.min[2] + 0.5 * (this.max[2] - this.min[2])];
  }

  getTransform(node){

    let modelMatrix = m4.create();

    // When matrix has been given, use it instead of TRS
    if(node.hasOwnProperty("matrix") && node.matrix){

      modelMatrix = node.matrix;

    }else{

      let translation = [0, 0, 0];
      let rotation = [0, 0, 0];
      let scale = [1, 1, 1];

      if(node.hasOwnProperty("rotation") && node.rotation){
        rotation = quaternionToEuler(node.rotation);
      }

      if(node.hasOwnProperty("scale") && node.scale){
        scale = node.scale;
      }

      if(node.hasOwnProperty("translation") && node.translation){
        translation = node.translation;
      }

      modelMatrix = m4.translate(modelMatrix, translation[0], translation[1], translation[2]); 

      modelMatrix = m4.zRotate(modelMatrix, rotation[2]);
      modelMatrix = m4.yRotate(modelMatrix, rotation[1]);
      modelMatrix = m4.xRotate(modelMatrix, rotation[0]); 

      modelMatrix = m4.scale(modelMatrix, scale[0], scale[1], scale[2]);
    }

    return modelMatrix;
  }

  createIndices(accessor){

    const bufferView = this.json.bufferViews[accessor.bufferView];
    const buffer = this.buffers[bufferView.buffer];

    let offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;
    offset += (accessor.byteOffset != null) ? accessor.byteOffset : 0;

    // Get a typed view of the buffer data
    const typedArray = getTypedArray(accessor.componentType);
    // Typed array is created of the underlying buffer. No memory is allocated.
    const data = new typedArray(buffer, offset, accessor.count);

    return new Indices(data, accessor.componentType);
  }

  createAttribute(name, accessor){

    const bufferView = this.json.bufferViews[accessor.bufferView];
    const buffer = this.buffers[bufferView.buffer];

    const offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;
    const target = bufferView.target != null ? bufferView.target : gl.ARRAY_BUFFER;

    // Get a typed view of the buffer data
    const typedArray = getTypedArray(accessor.componentType);
    // Typed array is created of the underlying buffer. No memory is allocated.
    const data = new typedArray(buffer, offset, bufferView.byteLength / typedArray.BYTES_PER_ELEMENT);

    const parameters = {
      index: bufferView.buffer,
      byteOffset: offset,
      byteLength: bufferView.byteLength,
      data: data,
      target: target,
      usage: gl.STATIC_DRAW
    };

    const glBuffer = this.bufferRepository.getBuffer(parameters);

    const descriptor = {
      target: target,
      componentType: accessor.componentType,
      componentCount: getComponentCount(accessor.type),
      normalized: accessor.normalized != null ? accessor.normalized : false,
      byteStride: bufferView.byteStride != null ? bufferView.byteStride : 0,
      offset: accessor.byteOffset != null ? accessor.byteOffset : 0
    };

    // Position min/max must be set in the gltf
    if(name == "POSITION"){
      descriptor.min = accessor.min;
      descriptor.max = accessor.max;
    }

    return new Attribute(name, glBuffer, descriptor);
  }

  getMaterial(index){

    const material = this.json.materials[index];

    let materialParameters = {environment: this.environment};

    let pbrDesc = material.pbrMetallicRoughness;

    if(pbrDesc == null){
      return null;
    }

    if(material.alphaMode != null){
      switch(material.alphaMode){
        case "BLEND":
          materialParameters.alphaMode = enums.BLEND;
          break;
        case "MASK":
          materialParameters.alphaMode = enums.MASK;
          break;
        default:
          materialParameters.alphaMode = enums.OPAQUE; 
      }
    }

    if(material.alphaCutoff != null){
      materialParameters.alphaCutoff = material.alphaCutoff;
    }

    if(material.doubleSided != null){
      materialParameters.doubleSided = material.doubleSided;
    }

    if(pbrDesc.baseColorTexture != null){
      const textureID = pbrDesc.baseColorTexture.index;
      materialParameters.baseColorTexture = this.textures[textureID];
    }

    if(pbrDesc.baseColorFactor != null){
      materialParameters.baseColorFactor = pbrDesc.baseColorFactor;
    }

    if(pbrDesc.metallicFactor != null){
      materialParameters.metallicFactor = pbrDesc.metallicFactor;
    }

    if(pbrDesc.roughnessFactor != null){
      materialParameters.roughnessFactor = pbrDesc.roughnessFactor;
    }

    if(material.emissiveFactor != null){
      materialParameters.emissiveFactor = material.emissiveFactor;
    }

    if(pbrDesc.metallicRoughnessTexture != null){
      const textureID = pbrDesc.metallicRoughnessTexture.index;
      materialParameters.metallicRoughnessTexture = this.textures[textureID];
    }

    if(material.occlusionTexture != null){
      const textureID = material.occlusionTexture.index;
      materialParameters.occlusionTexture = this.textures[textureID];
      if(material.occlusionTexture.strength != null){
        materialParameters.occlusionStrength = material.occlusionTexture.strength;
      }
    }

    if(material.normalTexture != null){
      const textureID = material.normalTexture.index;
      materialParameters.normalTexture = this.textures[textureID];
      if(material.normalTexture.scale != null){
        materialParameters.normalScale = material.normalTexture.scale;
      }
    }

    if(material.emissiveTexture != null){
      const textureID = material.emissiveTexture.index;
      materialParameters.emissiveTexture = this.textures[textureID];
    }

    return new PBRMaterial(materialParameters);

  }

  // Construct Mesh objects described by the gltf mesh
  processMesh(mesh){ 

    const accessors = this.json.accessors;

    // Drawable Mesh objects described by the gltf mesh
    const primitives = [];

    if(mesh.primitives == null){
      console.error("Mesh doesn't specify any primitives: ", mesh);
      return [];
    }

    for(const primitive of mesh.primitives){

      const geometryParams = {
        attributes: new Map(),
        length: 0,
        indices: null,
        primitiveType: primitive.mode != null ? primitive.mode : gl.TRIANGLES
      };

      const attributes = primitive.attributes;
      // ----- Create vertex indices ----- //

      if(primitive.indices != null){

        const accessor = accessors[primitive.indices];
        geometryParams.indices = this.createIndices(accessor);

        // If indices have been provided, geometry length is index count
        geometryParams.length = accessor.count;

      }else{
        // If indices have not been provided, geometry length is vertex count
        // This assumes that a GLTF will have at least POSITION defined which
        // is not required by the specification.
        geometryParams.length = accessors[attributes.POSITION].count;
      }

      // ----- Create vertex attributes ----- //


      for(const name of supportedAttributes){
        if(attributes.hasOwnProperty(name)){
          const accessor = accessors[attributes[name]];
          geometryParams.attributes.set(name, this.createAttribute(name, accessor));
        }
      }

      const geometry = new Geometry(geometryParams);

      let material;
      if(primitive.material != null){
        material = this.getMaterial(primitive.material);
      }else{
        material = new PBRMaterial({environment: this.environment});
      }

      primitives.push(new Mesh(geometry, material));
    }

    for(const primitive of primitives){
      this.meshes.push(primitive);
    }

    return primitives;
  }
}

function getTypedArray(type){

  switch(type){
    case gl.SHORT:
      return Int16Array;
    case gl.FLOAT:
      return Float32Array;
    case gl.UNSIGNED_BYTE:
      return Uint8Array;
    case gl.UNSIGNED_SHORT:
      return Uint16Array;
    case gl.UNSIGNED_INT:
      return Uint32Array;
    default:
      console.error("Unknown accessor.componentType: ", type);
      return null;
  }
}

function getComponentCount(type){

    switch (type){
      case "SCALAR":
        return 1;
      case "VEC2":
        return 2;
      case "VEC3":
        return 3;
      case "VEC4":
      case "MAT2":
        return 4;
      case "MAT3":
        return 9;
      case "MAT4":
        return 16;
      default:
        console.error("Unknown accessor.type: ", type);
        return null;
    }
}
