import {download} from "./download.js"

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
    console.log(json);

    if(json.buffers){

      let bufferPromises = [];
    
      for(let i = 0; i < json.buffers.length; i++){
        bufferPromises.push(download(workingDirectory.concat(json.buffers[i].uri), "arrayBuffer"));
      }

      Promise.all(bufferPromises).then(p => {
        for(let i = 0; i < bufferPromises.length; i++){
          bufferPromises[i].then(data => {
            this.buffers.push(data);
            console.log(data);
          });
        }
      });
    }else{
      console.error("GLTF file has no buffers: ", json);
    }
  
    for(let i = 0; i < json.scenes.length; i++){
      this.traverseScene(json.scenes[i]);
    }  

  }

  traverseScene(scene){
    // Traverse the hierarchies starting from the root nodes of the scene
    for(const nodeIdx of scene.nodes){
      this.traverseNodes(this.json.nodes[nodeIdx]);
    }

  }

  traverseNodes(node){
    // If node describes a mesh, process it
    if(node.mesh){
      this.processMesh(this.json.meshes[node.mesh]);
    }

    // Process all child nodes
    if(node.children){
      for(const childIdx of node.children){
        this.traverseNodes(this.json.nodes[childIdx]);
      }
    }

  }

  // Create a geometry and material object, combine them into a drawable Mesh and
  // store it
  processMesh(mesh){
    console.log(mesh);
  }

}
