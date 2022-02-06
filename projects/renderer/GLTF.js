import {download} from "./download.js"
import {gl, enums} from "./canvas.js"
import {Node} from "./node.js"
import {PBRMaterial} from "./materials/pbrMaterial.js"
import {Geometry} from "./geometry.js"
import {Mesh} from "./mesh.js"
import {BufferRepository} from "./bufferRepository.js"
import {Attribute, supportedAttributes} from "./attribute.js"
import {Indices} from "./indices.js"
import {loadTexture} from "./texture.js"

// Download and process GLTF file and create scenes of drawable Mesh object with a geometry and PBR material

export class GLTF{

  // Description of the GLTF
  json;

  // Binary data for vertices, indices, normals etc.
  buffers = [];

  // Image data
  images = [];

  // WebGL textures for albedo, roughness and emissive maps etc.
  textures = [];

  // Scene graphs of nodes
  scenes = [];

  // Drawable mesh objects
  meshes = [];

  // Repository of gl.Buffer object
  bufferRepository;

  environment;

  constructor(path, environment){

    this.environment = environment;

    let workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);
    // Downlod gltf file and construct internal objects
    download(path, "gltf").then(data => this.processGLTF(data, workingDirectory));
  }

  // Parse the json, download images and buffers, construct meshes
  processGLTF(json, workingDirectory){

    this.bufferRepository = new BufferRepository();

    this.json = json;
    console.log("Full GLTF: ", json);

    // Promises which resolve once all downloads have completed
    let buffersDownloaded = new Promise((resolve, reject) => {});
    let imagesDownloaded = new Promise((resolve, reject) => {});

    // Promise which resolved when the gltf has been processed
    let gltfLoadingDone = new Promise((resolve, reject) => {});
    
    if(json.buffers){

      // Populate buffer array with promises of each gltf buffer to fetch
      for(const buffer of json.buffers){
        this.buffers.push(download(workingDirectory.concat(buffer.uri), "arrayBuffer"));
      }

      // Once all buffers are ready, replace the promises with the data
      buffersDownloaded = Promise.all(this.buffers).then(buffers => {
        this.buffers = buffers;
      }).catch(e => {console.error("Buffer promises unresolved: ", e)});

    }else{
      console.error("GLTF file has no buffers: ", json);
    }

    if(json.images){

      // Populate image array with promises of each image to fetch
      for(const image of json.images){
        this.images.push(download(workingDirectory.concat(image.uri), "blob"));
      }

      // Once all images are ready, replace the promises with the data
      imagesDownloaded = Promise.all(this.images).then(images => {
        this.images = images;
      }).catch(e => {console.error("Image promises unresolved: ", e)});

    }else{
      // If there are no images to fetch, resolve the promise
      imagesDownloaded = Promise.resolve();
    }

    // Once we have the buffer and image data, we can process the gltf
    Promise.all([buffersDownloaded, imagesDownloaded]).then(p => {
        this.createTextures();
        let nodes = this.processNodes(this.json.nodes);
        nodes = this.setChildren(nodes);
        console.log("Nodes: ", nodes); 
    }).catch(e => {console.error("Download promises unresolved: ", e)});
 
    return gltfLoadingDone;
  }

  createTextures(){
    for(const image of this.images){
      const url = URL.createObjectURL(image);
      this.textures.push(loadTexture(url));
    }
  }

  // Create array of Mesh objects and nodes from the GLTF
  processNodes(gltfNodes){

    const nodes = [];

    for(const gltfNode of gltfNodes){

      const params = {localMatrix: this.getTransform(gltfNode), children: gltfNode.children};

      // If node describes a mesh, process it
      if(gltfNode.hasOwnProperty("mesh") && gltfNode.mesh != null){
        nodes.push(this.processMesh(this.json.meshes[gltfNode.mesh], params));
      }else{
        nodes.push(new Node(params));
      }
    }

    return nodes;
  }

  setChildren(nodes){

    for(const node of nodes){
      if(node.children != null){

        const childNodes = [];

        for(const childIdx of node.children){
          childNodes.push(nodes[childIdx]);
        }

        node.setChildren(childNodes);
      }
    }
    return nodes;
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

    return new Attribute(name, glBuffer, descriptor);
  }

  getMaterial(idx){

    const material = this.json.materials[idx];

    var baseColorTexture = null;
    var normalTexture = null;
    var emissiveTexture = null;
    var occlusionRoughMetalTexture = null;
    var occlusionTexture = null;

    let pbrDesc = material.pbrMetallicRoughness;

    if(pbrDesc == null){
      return null;
    }

    var alphaMode = enums.OPAQUE;
    var alphaCutoff = 0.5;
    var doubleSided = false;

    if(material.alphaMode != null){
      switch(material.alphaMode){
        case "BLEND":
          alphaMode = enums.BLEND;
          break;
        case "MASK":
          alphaMode = enums.MASK;
          break;
        default:
          alphaMode = enums.OPAQUE; 
      }
    }

    if(material.alphaCutoff != null){
      alphaCutoff = material.alphaCutoff;
    }

    if(material.doubleSided != null){
      doubleSided = material.doubleSided;
    }

    if(pbrDesc.baseColorTexture != null){
      const textureID = pbrDesc.baseColorTexture.index;
      baseColorTexture = this.textures[textureID];
    }

    if(pbrDesc.metallicRoughnessTexture != null){
      const textureID = pbrDesc.metallicRoughnessTexture.index;
      occlusionRoughMetalTexture = this.textures[textureID];
    }

    if(material.occlusionTexture != null){
      const textureID = material.occlusionTexture.index;
      occlusionTexture = this.textures[textureID];
    }

    if(material.normalTexture != null){
      const textureID = material.normalTexture.index;
      normalTexture = this.textures[textureID];
    }

    if(material.emissiveTexture != null){
      const textureID = material.emissiveTexture.index;
      emissiveTexture = this.textures[textureID];
    }

    return new PBRMaterial({
      baseColorTexture: baseColorTexture, 
      normalTexture: normalTexture, 
      emissiveTexture: emissiveTexture,
      propertiesTexture: occlusionRoughMetalTexture, 
      aoTexture: occlusionTexture, 
      environment: this.environment, 
      alphaMode: alphaMode, 
      alphaCutoff: alphaCutoff, 
      doubleSided: doubleSided
    });

  }

  // Construct Mesh objects described by the gltf mesh
  processMesh(mesh, params){ 

    const accessors = this.json.accessors;

    // Drawable Mesh objects described by the gltf mesh
    const primitives = [];

    if(mesh.primitives == null){
      console.error("Mesh doesn't specify any primitives");
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
        material = new PBRMaterial({environment: environment});
      }

      this.meshes.push(new Mesh(geometry, material));
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
