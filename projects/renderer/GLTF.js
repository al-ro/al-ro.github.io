import {download} from "./download.js"
import {gl} from "./canvas.js"
import {Node} from "./node.js"
import {PBRMaterial} from "./materials/pbrMaterial.js"
import {Geometry} from "./geometry.js"
import {Mesh} from "./mesh.js"
import {BufferRepository} from "./bufferRepository.js"
import {Attribute} from "./attribute.js"
import {Descriptor} from "./descriptor.js"

// Download and process GLTF file and create scenes of drawable Mesh object with a geometry and PBR material

export class GLTF{
  // Description of the GLTF
  json;
  // Binary data for vertices, indices, normals etc.
  buffers = [];
  // WebGL textures for albedo, roughness and emissive maps etc.
  images = [];
  // Scene graphs of nodes
  scenes = [];

  // Repository of gl buffers
  bufferRepository;

  constructor(path){
    let workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);
    // Downlod gltf file and construct internal objects
    download(path, "gltf").then(data => this.processGLTF(data, workingDirectory));
  }

  // Parse the json, download images and buffers, construct meshes
  processGLTF(json, workingDirectory){

    this.bufferRepository = new BufferRepository();

    this.json = json;
    console.log("Full GLTF: ", json);

    // Promises of individual binary data to download
    let bufferPromises = [];
    let imagePromises = [];

    // Promises which resolve once all downloads have completed
    let buffersDownloaded = new Promise((resolve, reject) => {});
    let imagesDownloaded = new Promise((resolve, reject) => {});
    
    if(json.buffers){

      for(const buffer of json.buffers){
        bufferPromises.push(download(workingDirectory.concat(buffer.uri), "arrayBuffer"));
      }

      buffersDownloaded = Promise.all(bufferPromises).then(buffers => {
        for(const buffer of buffers){
          this.buffers.push(buffer);
          console.log("Buffer data: ", buffer);
        }
      }).catch(e => {console.error("Buffer promises unresolved")});

    }else{
      console.error("GLTF file has no buffers: ", json);
    }

    if(json.images){

      for(const image of json.images){
        imagePromises.push(download(workingDirectory.concat(image.uri), "arrayBuffer"));
      }

      imagesDownloaded = Promise.all(imagePromises).then(images => {
        for(const image of images){
            this.images.push(image);
            console.log("Image data: ", image);
        }
      }).catch(e => {console.error("Image promises unresolved")});

    }else{
      // If there are no images to fetch, resolve the promise
      imagesDownloaded = Promise.resolve();
    }

    // Once we have the buffer and image data, we can process the gltf
    Promise.all([buffersDownloaded, imagesDownloaded]).then(p => {
        let nodes = this.processNodes(this.json.nodes);
        nodes = this.setChildren(nodes);
        console.log("Nodes: ", nodes); 
    }).catch(e => {console.error("Download promises unresolved")});
 
  }

  // Create array of Mesh objects and nodes from the GLTF
  processNodes(gltfNodes){
    let nodes = [];

    for(const gltfNode of gltfNodes){

      let params = {localMatrix: this.getTransform(gltfNode), children: gltfNode.children};

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
        let childNodes = [];
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

    // When matrix has been given, use it over TRS
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

  createAttribute(name, accessor){
    let bufferView = this.json.bufferViews[accessor.bufferView];
    let buffer = this.buffers[bufferView.buffer];
    let offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;

    let typedArray;

    switch(accessor.componentType){
      case gl.FLOAT:
        typedArray = Float32Array;
        break;
      case gl.SHORT:
        typedArray = Int16Array;
        break;
      case gl.UNSIGNED_SHORT:
        typedArray = Uint16Array;
        break;
      case gl.UNSIGNED_INT:
        typedArray = Uint32Array;
        break;
      case gl.UNSIGNED_BYTE:
        typedArray = Uint8Array;
        break;
      default:
        console.error("Unknown componentType: ", accessor.componentType);
        break;
    }

    let data = new typedArray(buffer, offset, bufferView.byteLength / typedArray.BYTES_PER_ELEMENT);
    //console.log(data);

    let target = bufferView.target != null ? bufferView.target : gl.ELEMENT_ARRAY_BUFFER;

    let parameters = {
      index: bufferView.buffer,
      byteOffset: offset,
      byteLength: bufferView.byteLength,
      data: data,
      target: target,
      usage: gl.STATIC_DRAW
    };

    let glBuffer = this.bufferRepository.getBuffer(parameters);

    let componentCount;

    switch (accessor.type){
      case "SCALAR":
        componentCount = 1;
        break;
      case "VEC2":
        componentCount = 2;
        break;
      case "VEC3":
        componentCount = 3;
        break;
      case "VEC4":
      case "MAT2":
        componentCount = 4;
        break;
      case "MAT3":
        componentCount = 9;
        break;
      case "MAT4":
        componentCount = 16;
        break;
      default:
        console.error("Unknown type accessor type: ", accessor.type);
    }

    let descriptor = {
      target: target,
      componentType: accessor.componentType,
      componentCount: componentCount,
      normalized: accessor.normalized != null ? accessor.normalized : false,
      byteStride: bufferView.byteStride != null ? bufferView.byteStride : 0,
      offset: accessor.byteOffset != null ? accessor.byteOffset : 0
    };

    return new Attribute(name, glBuffer, descriptor);
  }

  // Create a geometry and material object, combine them into a drawable Mesh
  processMesh(mesh, params){ 

    const accessors = this.json.accessors;
    const materials = this.json.materials;

    for(const primitive of mesh.primitives){
      const indicesAttribute = this.createAttribute("INDICES", accessors[primitive.indices]);

      let attributes = primitive.attributes;

      let geometryAttributes = [];
      if(attributes.hasOwnProperty("POSITION")){
        geometryAttributes.push(this.createAttribute("POSITION", accessors[attributes.POSITION]));
      }
      if(attributes.hasOwnProperty("NORMAL")){
        geometryAttributes.push(this.createAttribute("NORMAL", accessors[attributes.NORMAL]));
      }
      if(attributes.hasOwnProperty("TANGENT")){
        geometryAttributes.push(this.createAttribute("TANGENT", accessors[attributes.TANGENT]));
      }
      if(attributes.hasOwnProperty("TEXCOORD_0")){
        geometryAttributes.push(this.createAttribute("TEXCOORD_0", accessors[attributes.TEXCOORD_0]));
      }
      if(attributes.hasOwnProperty("TEXCOORD_1")){
        geometryAttributes.push(this.createAttribute("TEXCOORD_1", accessors[attributes.TEXCOORD_1]));
      }
      if(attributes.hasOwnProperty("COLOR_0")){
        geometryAttributes.push(this.createAttribute("COLOR_0", accessors[attributes.COLOR_0]));
      }

      console.log(geometryAttributes);

      // Create geometry
      // Create material
      //console.log(materials[primitive.material]);
      // Create Mesh
    }
    return mesh;
  }
}
