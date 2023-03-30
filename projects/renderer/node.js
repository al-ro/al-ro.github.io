/**
 * Single element in a scene. Some Node objects are Mesh objects which are
 * drawable. Others act as intermediate transforms with nothing drawable themselves
 */
export class Node{

  /**
   * Local transform independent of parent nodes.
   * This is the original transform given in a gltf or defined on creation
   */
  localModelMatrix = m4.create();

  /**
   * Animation transforms.
   */
  animationModelMatrix = m4.create();

  /**
   * Accumulated ancestor node transforms.
   */
  parentModelMatrix = m4.create();

  /** 
   * Global transform.
   * Accumulation of all ancestor transforms and the local transform
   */ 
  modelMatrix = m4.create();

  // For animation, the local TRS components of the model matrix are stored explicitly
  // These should be kept in sync with the matrix whenever the node is updated

  /** XYZ translation of the node */
  translation = [0, 0, 0];

  /** Rotation quaternion of the node */
  rotation = [0, 0, 0, 1];

  /** XYZ scale of the node */
  scale = [1, 1, 1];

  /**
   * Nodes further down the scene graph which must be updated if the
   * transform of this node is changed
   */
  children = [];

  /**
   * Indices of other nodes in the scene graph which are children of this node
   */
  childIndices = [];

  /**
   * A map of Animation objects for the translation, rotation and scale properties
   */
  animations = new Map();

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

  animate(time){
    if(this.animations.size > 0){
      this.animationModelMatrix = this.getTransform(time);
      this.updateModelMatrix();
    }
  }

  addAnimation(path, animation){
    this.animations.set(path, animation);
  }

  /**
   * Apply accumulated ancestor transforms and propagate change to children
   * @param {mat4} parentModelMatrix accumulated ancestor transforms
   */
  updateMatrix(parentModelMatrix){
    this.parentModelMatrix = parentModelMatrix;
    this.updateModelMatrix();
  }

  /**
   * Combine ancestor transforms, local matrix and animation matrix
   */
   updateModelMatrix(){
    this.modelMatrix = m4.multiply(this.parentModelMatrix, this.animations.size > 0 ? this.animationModelMatrix : this.localModelMatrix);
    this.updateChildren();
  }

  /**
   * Propagate local transforms down node hierarchy
   */
  updateChildren(){
    for(const child of this.children){
      child.updateMatrix(this.modelMatrix);
    }
  }

  getModelMatrix(){
    return this.modelMatrix;
  }

  getParentModelMatrix(){
    return this.parentModelMatrix;
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
  }

  isMesh(){
    return false;
  }

  /**
   * Get local transform matrix from TRS values
   * @param {number} time
   * @returns local transform matrix of node
   */
  getTransform(time){
    let T = [0, 0, 0];
    let R = [0, 0, 0, 1];
    let S = [1, 1, 1];

    m4.decompose(this.localModelMatrix, T, R, S);

    const translation = this.animations.get("translation");
    const rotation = this.animations.get("rotation");
    const scale = this.animations.get("scale");

    if(translation != null){
      T = translation.getValue(time);
    }

    if(rotation != null){
      R = rotation.getValue(time);
    }

    if(scale != null){
      S = scale.getValue(time);
    }

    let modelMatrix = m4.compose(T, R, S);

    return modelMatrix;
  }
}

