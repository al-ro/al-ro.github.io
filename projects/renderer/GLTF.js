import {download} from "./download.js"
import {gl} from "./canvas.js"
import {Attribute} from "./attribute.js"
import {Node} from "./node.js"
import {Mesh} from "./mesh.js"

// Download and process GLTF file and create a drawable Mesh object with a geometry and PBR material

export class GLTF{
  // Description of the GLTF
  json;
  // Binary data for vertices, indices, normals etc.
  buffers = [];
  // WebGL textures for albedo, roughness and emissive maps etc.
  images = [];
  // Drawable Mesh objects
  meshes = [];

  constructor(path){
    let workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);
    // Downlod gltf file and construct internal objects
    download(path, "gltf").then(data => this.processGLTF(data, workingDirectory));
  }

  // Parse the json, download images and buffers, construct meshes
  processGLTF(json, workingDirectory){

    this.json = json;
    console.log("Full GLTF: ", json);

    if(json.buffers){

      let bufferPromises = [];
    
      for(const buffer of json.buffers){
        bufferPromises.push(download(workingDirectory.concat(buffer.uri), "arrayBuffer"));
      }

      Promise.all(bufferPromises).then(p => {
        for(const promise of bufferPromises){
          promise.then(data => {
            this.buffers.push(data);
            console.log("Buffer data: ", data);
          });
        }
      });
    }else{
      console.error("GLTF file has no buffers: ", json);
    }

    if(json.images){

      let imagePromises = [];
    
      for(const image of json.images){
        imagePromises.push(download(workingDirectory.concat(image.uri), "arrayBuffer"));
      }

      Promise.all(imagePromises).then(p => {
        for(const promise of imagePromises){
          promise.then(data => {
            this.images.push(data);
            console.log("Image data:", data);
          });
        }
      });
    }
  
    // Load all scenes
    // TODO: Would it improve performance to only load scenes which are rendered?
    for(const scene of json.scenes){
      this.traverseScene(scene);
    }  

  }

  // Traverse the hierarchies starting from the root nodes of the scene
  traverseScene(scene){
    for(const nodeIdx of scene.nodes){
      this.traverseNodes(this.json.nodes[nodeIdx]);
    }
  }

  // Travel down the node hierarchy recording parent-child relationships
  // and process all meshes
  traverseNodes(node){
    // If node describes a mesh, process it
    if(node.mesh != null){
      this.processMesh(this.json.meshes[node.mesh]);
    }

    // Process all child nodes
    // An important (and annoying) thing to note is that nodes
    // are governed by the transformations of their ancestors.
    // If node n is the child of node n-1, which is itself a 
    // child of node n-2 etc. until n-x, then we have 
    // to iteratively apply x+1 transformations to get the final
    // model matrix.
    // This means we need to store the child hierarchy of the 
    // scene graph explicitly. We record the children of each
    // node and call update on them if the nodes own transform
    // is updated. This will propagate the update down the node
    // graph while saving on update work on other nodes.
    if(node.children != null){
      for(const childIdx of node.children){
        this.traverseNodes(this.json.nodes[childIdx]);
      }
    }

  }

  // Create a geometry and material object, combine them into a drawable Mesh and
  // store it
  processMesh(mesh){
    console.log("Mesh: ", mesh);

    for(const primitive of mesh.primitives){
      let geometryAttributes = [];
      let attributes = primitive.attributes;
      if(attributes.hasOwnProperty("POSITION")){
        console.log("POSITION", this.json.accessors[attributes.POSITION]);
      }
      if(attributes.hasOwnProperty("NORMAL")){
        console.log("NORMAL", this.json.accessors[attributes.NORMAL]);
      }
      if(attributes.hasOwnProperty("TANGENT")){
        console.log("TANGENT", this.json.accessors[attributes.TANGENT]);
      }
      if(attributes.hasOwnProperty("TEXCOORD_0")){
        console.log("TEXCOORD_0", this.json.accessors[attributes.TEXCOORD_0]);
      }
      if(attributes.hasOwnProperty("TEXCOORD_1")){
        console.log("TEXCOORD_1", this.json.accessors[attributes.TEXCOORD_1]);
      }
      if(attributes.hasOwnProperty("COLOR_0")){
        console.log("COLOR_0", this.json.accessors[attributes.COLOR_0]);
      }
    }
 /*
    let accessorID = mesh.primitives
    let componentType = accessors[accessorID].componentType;
    switch (componentType){
      case gl.BYTE:
        console.log("GL_BYTE");
        //this.typedView = new Int8Array(buffer.buffer, byteOffset, arrayLength);
        break;
      case gl.UNSIGNED_BYTE:
        console.log("GL_UNSIGNED_BYTE");
        //this.typedView = new Uint8Array(buffer.buffer, byteOffset, arrayLength);
        break;
      case gl.SHORT:
        console.log("GL_SHORT");
        //this.typedView = new Int16Array(buffer.buffer, byteOffset, arrayLength);
        break;
      case gl.UNSIGNED_SHORT:
        console.log("GL_UNSIGNED_SHORT");
        //this.typedView = new Uint16Array(buffer.buffer, byteOffset, arrayLength);
        break;
      case gl.UNSIGNED_INT:
        console.log("GL_UNSIGNED_INT");
        //this.typedView = new Uint32Array(buffer.buffer, byteOffset, arrayLength);
        break;
      case gl.FLOAT:
        console.log("GL_FLOAT");
        //this.typedView = new Float32Array(buffer.buffer, byteOffset, arrayLength);
        break;
    }
*/
  }

  getData(accessor){
    
  }

}
