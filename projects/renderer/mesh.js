
/**
 * Mesh is a basic drawable which combines a Geometry and a Material.
 * Upon construction, the Mesh will complete the Geometry and Material objects
 * by creating a VAO, matching the geometry data to shader location and 
 * creating the appropriate WebGL program.
 */

import { gl } from "./canvas.js"
import { Node } from "./node.js"

export class Mesh extends Node {

  vao;
  geometry;
  material;

  // Meshes can display an override material while retaining their original one
  originalMaterial;
  overrideMaterial;

  cull = true;

  instanced = false;
  activeAttributes = [];

  normalMatrix = m4.create();

  // The 8 corners of the AABB of the untransformed mesh
  aabb = [];

  // The extent of the transformed mesh. Must be kept updated when transforming
  min;
  max;

  //Optional morph target weights
  weights = [];
  hasWeights = false;

  constructor(parameters) {

    super(parameters);

    if (parameters.weights != null) {
      this.weights = parameters.weights;
      this.hasWeights = true;
    }

    this.geometry = parameters.geometry;
    this.aabb = getAABBFromExtent(this.geometry.min, this.geometry.max);

    this.originalMaterial = parameters.material;
    this.overrideMaterial = parameters.material;

    this.instanced = this.geometry.instanced;

    this.setMaterial(parameters.material);
  }

  setMaterial(material) {

    this.material = material;

    this.activeAttributes = [];
    // Determine intersection of geometry and material attributes
    for (const attribute of this.material.attributes) {
      if (this.geometry.attributes.has(attribute)) {
        this.activeAttributes.push(attribute);
      }
    }

    if (this.material.supportsMorphTargets) {
      this.material.setWeights(this.weights);
    }

    this.material.initializeProgram(this.activeAttributes, this.geometry.morphTargets);

    if (this.hasSkin && this.material.supportsSkin) {
      this.material.enableSkin();
    }

    for (const attribute of this.activeAttributes) {
      const handle = this.material.program.getAttribLocation(attribute);
      this.geometry.attributes.get(attribute).handle = handle;
      if (this.geometry.morphTargets != null && this.material.supportsMorphTargets) {
        for (let i = 0; i < this.geometry.morphTargets.length; i++) {
          if (this.geometry.morphTargets[i].attributes.has(attribute)) {
            let morphTargetHandle = this.material.program.getAttribLocation(attribute + "" + i);
            this.geometry.morphTargets[i].attributes.get(attribute).handle = morphTargetHandle;
          }
        }
      }
    }
    this.createVAO();
  }

  setOverrideMaterial(material) {
    this.overrideMaterial = material;
  }

  setOutput(output) {
    this.material.setOutput(output);
  }

  displayOverrideMaterial() {
    this.setMaterial(this.overrideMaterial);
  }

  displayOriginalMaterial() {
    this.setMaterial(this.originalMaterial);
  }

  destroy() {
    if (this.geometry != null) {

      this.bindVAO();
      this.geometry.destroy();
      this.unbindVAO();

      gl.deleteVertexArray(this.vao);
      this.geometry = null;
    }

    if (this.originalMaterial != null) {
      this.originalMaterial.destroy();
      this.originalMaterial = null;
    }

    if (this.overrideMaterial != null) {
      this.overrideMaterial.destroy();
      this.overrideMaterial = null;
    }

    if (this.material != null) {
      this.material.destroy();
      this.material = null;
    }
  }

  createVAO() {
    if (this.vao == null) {
      this.vao = gl.createVertexArray();
    }

    this.bindVAO();

    this.geometry.enableBuffers(this.activeAttributes, this.material.supportsMorphTargets);

    this.unbindVAO();
  }

  bindVAO() {
    gl.bindVertexArray(this.vao);
  }

  unbindVAO() {
    gl.bindVertexArray(null);
  }

  doubleSided() {
    return this.material.doubleSided;
  }

  setMin() {
    let min = [1e10, 1e10, 1e10];
    for (const corner of this.aabb) {
      let transformedCorner = m4.transformPoint(this.worldMatrix, corner);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(transformedCorner[i], min[i]);
      }
    }
    this.min = min;
  }

  setMax() {
    let max = [-1e10, -1e10, -1e10];
    for (const corner of this.aabb) {
      let transformedCorner = m4.transformPoint(this.worldMatrix, corner);
      for (let i = 0; i < 3; i++) {
        max[i] = Math.max(transformedCorner[i], max[i]);
      }
    }
    this.max = max;
  }

  /**
   * Override of Node function to update min and max data
   * Combine ancestor transforms, local matrix and animation matrix
   */
  updateWorldMatrix() {
    this.worldMatrix = m4.multiply(this.parentMatrix, this.localMatrix);
    this.normalMatrix = m4.transpose(m4.inverse(this.worldMatrix));
    this.setMin();
    this.setMax();
    this.updateChildren();
  }
  /**
   * Override of Node function to animate morph targets
   */
  animate(time, name) {
    if (this.animations.get(name) != null) {
      if (this.animations.get(name).size > 0) {
        this.localMatrix = this.getAnimatedTransform(time, name);
        if (this.hasWeights) {
          this.getAnimatedWeights(time, name);
        }
        this.updateWorldMatrix();
      }
    }
    for (const child of this.children) {
      child.animate(time);
    }
  }


  setIdle() {
    this.setIdleWeights();
    this.setIdleTransform();
    for (const child of this.children) {
      child.setIdle();
    }
  }

  /**
   * Get morph target weight values at the given time
   * @param {number} time 
   * @returns array of weights
   */
  getAnimatedWeights(time, name) {
    const weights = this.animations.get(name).get("weights");
    if (weights != null) {
      this.weights = weights.getValue(time);
    }
  }

  isMesh() {
    return true;
  }

  cullingEnabled() {
    return this.cull;
  }

  setCulling(cull) {
    this.cull = cull;
  }

  setIdleWeights() {
    this.weights = new Array(this.weights.length).fill(0);
  }

}
