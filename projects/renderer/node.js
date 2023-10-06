import { AnimationType } from "./enums.js";

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
   * Local transform independent of parent nodes when no animation is applied
   */
  idleMatrix = m4.create();

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
   * Nodes in children which were created from a multi-primitive GLTF node
   */
  splitChildren = [];

  /**
   * Indices of other nodes in the scene graph which are children of this node
   */
  childIndices = [];

  /**
   * An map of maps of PropertyAnimation objects for translation, rotation, scale and weights properties
   */
  animations = new Map();

  skinIndex;
  skin;

  /**
   * The position of the node for skin AABB creation
   */
  position = [0, 0, 0];

  constructor(parameters) {

    if (parameters != null) {

      if (parameters.children != null) {
        this.children = parameters.children;
      }

      if (parameters.splitChildren != null) {
        this.splitChildren = parameters.splitChildren;
      }

      if (parameters.childIndices != null) {
        this.childIndices = parameters.childIndices;
      }

      if (parameters.localMatrix != null) {
        this.localMatrix = parameters.localMatrix;
      }

      if (parameters.skinIndex != null) {
        this.skinIndex = parameters.skinIndex;
      }

      this.idleMatrix = this.localMatrix;

      this.worldMatrix = this.localMatrix;
    }

  }

  animate(time, name) {
    if (this.animations.get(name) != null) {
      if (this.animations.get(name).size > 0) {
        this.localMatrix = this.getAnimatedTransform(time, name);
        this.updateWorldMatrix();
      }
    }
    for (const child of this.children) {
      child.animate(time, name);
    }
  }

  setAnimation(path, animation) {
    if (this.animations.get(animation.name) != null) {
      this.animations.get(animation.name).set(path, animation);
    } else {
      let newAnimation = new Map();
      newAnimation.set(path, animation);
      this.animations.set(animation.name, newAnimation);
    }
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
    this.updatePosition();
  }

  /**
   * Propagate local transforms down node hierarchy
   */
  updateChildren() {
    for (const child of this.children) {
      child.updateMatrix(this.worldMatrix);
    }
  }

  updatePosition() {
    this.position = m4.transformPoint(this.worldMatrix, [0, 0, 0]);
  }

  setIdle() {
    this.setIdleTransform();
    for (const child of this.children) {
      child.setIdle();
    }
  }

  setIdleTransform() {
    this.localMatrix = this.idleMatrix;
    this.updateWorldMatrix();
  }

  addChild(node) {
    this.children.push(node);
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
  getAnimatedTransform(time, name) {
    let T = [0, 0, 0];
    let R = [0, 0, 0, 1];
    let S = [1, 1, 1];

    m4.decompose(this.localMatrix, T, R, S);

    // Animation overwrites TRS values instead of manipulating them
    const translation = this.animations.get(name).get(AnimationType.TRANSLATON);
    const rotation = this.animations.get(name).get(AnimationType.ROTATION);
    const scale = this.animations.get(name).get(AnimationType.SCALE);

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

