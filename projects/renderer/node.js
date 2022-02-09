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

  // Indices of other nodes in the scene graph which are children of this node
  childIndices = [];

  constructor(params){

    if(params != null){

      if(params.children != null){
        this.children = params.children;
      }

      if(params.childIndices != null){
        this.childIndices = params.childIndices;
      }

      if(params.localModelMatrix != null){
        this.localModelMatrix = params.localModelMatrix;
      }

      this.modelMatrix = this.localModelMatrix;
    }

  }

  // Apply accumulated ancestor transforms and propagate change to children
  updateMatrix(parentModelMatrix){
    this.modelMatrix = m4.multiply(parentModelMatrix, this.localModelMatrix);
    this.updateChildren();
  }

  updateChildren(){
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

  setChildIndices(childIndices){
    this.childIndices = childIndices;
  }

  setLocalModelMatrix(localModelMatrix){
    this.localModelMatrix = localModelMatrix;
    this.modelMatrix = this.localModelMatrix;
  }
}

