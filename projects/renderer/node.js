// Single element in a scene. Some Node objects are Mesh objects which are
// drawable. Others act as intermediate transforms with nothing drawable themselves,

export class Node{

  // Local transform independent of parent nodes
  // This is the original transform given in a gltf or defined on creation
  localModelMatrix = m4.create();

  // Global transform
  // Accumulation of all ancestor transform and the local transform
  modelMatrix = m4.create();

  // Nodes further down the scene graph which must be updated if the
  // transform of this node is changed
  children = [];

  constructor(params){
    if(params != null){
      if(params.children != null){
        this.children = params.children;
      }

      if(params.localModelMatrix != null){
        this.localModelMatrix = params.localModelMatrix;
      }

      if(params.modelMatrix != null){
        this.modelMatrix = params.modelMatrix;
      }
    }
  }

  // Apply accumulated ancestor transforms and propagate change to children
  updateMatrix(parentModelMatrix){
    this.modelMatrix = parentModelMatrix * this.localModelMatrix;
    for(const child of this.children){
      child.updateMatrix(this.modelMatrix);
    }
  }

  getModelMatrix(){
    return this.modelMatrix;
  }

  addChild(node){
    this.children.push(node);
  }

  setChildren(children){
    this.children = children;
  }
}
