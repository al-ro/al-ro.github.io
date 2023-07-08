/**
 * Single element in a scene. Some Node objects are Mesh objects which are
 * drawable. Others act as intermediate transforms with nothing drawable themselves
 */
export class Node {

  /**
   * Local transform independent of parent nodes.
   * This is the original transform given in a gltf or defined on creation
   */
  localMatrix = m4.create();

  /**
   * Accumulated ancestor node transforms.
   */
  parentMatrix = m4.create();

  /** 
   * Global transform.
   * Accumulation of all ancestor transforms and the local transform
   */
  worldMatrix = m4.create();

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

  constructor(params) {

    if (params != null) {

      if (params.children != null) {
        this.children = params.children;
      }

      if (params.childIndices != null) {
        this.childIndices = params.childIndices;
      }

      if (params.localMatrix != null) {
        this.localMatrix = params.localMatrix;
      }

      this.worldMatrix = this.localMatrix;
    }

  }

  animate(time) {
    if (this.animations.size > 0) {
      this.localMatrix = this.getAnimatedTransform(time);
      this.updateWorldMatrix();
    }
    for (const child of this.children) {
      child.animate(time);
    }
  }

  setAnimation(path, animation) {
    this.animations.set(path, animation);
  }

  /**
   * Apply accumulated ancestor transforms and propagate change to children
   * @param {mat4} parentMatrix accumulated ancestor transforms
   */
  updateMatrix(parentMatrix) {
    this.parentMatrix = parentMatrix;
    this.updateWorldMatrix();
  }

  /**
   * Combine ancestor transforms, local matrix and animation matrix
   */
  updateWorldMatrix() {
    this.worldMatrix = m4.multiply(this.parentMatrix, this.localMatrix);
    this.updateChildren();
  }

  /**
   * Propagate local transforms down node hierarchy
   */
  updateChildren() {
    for (const child of this.children) {
      child.updateMatrix(this.worldMatrix);
    }
  }

  getWorldMatrix() {
    return this.worldMatrix;
  }

  getLocalMatrix() {
    return this.localMatrix;
  }

  getParentMatrix() {
    return this.parentMatrix;
  }

  addChild(node) {
    this.children.push(node);
  }

  setChildren(children) {
    this.children = children;
  }

  getChildren() {
    return this.children;
  }

  setChildIndices(childIndices) {
    this.childIndices = childIndices;
  }

  setLocalMatrix(localMatrix) {
    this.localMatrix = localMatrix;
  }

  isMesh() {
    return false;
  }

  destroy() {
    for (const child of this.children) {
      child.destroy();
    }
  }

  /**
   * Get local transform matrix from animated values
   * @param {number} time
   * @returns local transform matrix of node
   */
  getAnimatedTransform(time) {
    let T = [0, 0, 0];
    let R = [0, 0, 0, 1];
    let S = [1, 1, 1];

    m4.decompose(this.localMatrix, T, R, S);

    // Animation overwrites TRS values instead of manipulating them
    const translation = this.animations.get("translation");
    const rotation = this.animations.get("rotation");
    const scale = this.animations.get("scale");

    if (translation != null) {
      T = translation.getValue(time);
    }

    if (rotation != null) {
      R = rotation.getValue(time);
    }

    if (scale != null) {
      S = scale.getValue(time);
    }

    return m4.compose(T, R, S);
  }
}

