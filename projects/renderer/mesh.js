
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

  constructor(geometry, material, params) {

    super(params);

    this.geometry = geometry;

    this.originalMaterial = material;
    this.overrideMaterial = material;

    this.instanced = this.geometry.instanced;

    this.setMaterial(material);
  }

  setMaterial(material) {

    this.material = material;

    this.activeAttributes = [];
    // Determine intersection of geometry and material attributes
    for (const attribute of this.material.getAttributes()) {
      if (this.geometry.getAttributes().has(attribute)) {
        this.activeAttributes.push(attribute);
      }
    }

    this.material.createProgram(this.activeAttributes);
    this.material.getParameterHandles();

    for (const attribute of this.activeAttributes) {
      const handle = this.material.program.getAttribLocation(attribute);
      this.geometry.getAttributes().get(attribute).setHandle(handle);
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

    this.geometry.enableBuffers(this.activeAttributes);

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

  getNormalMatrix() {
    return m4.transpose(m4.inverse(this.getWorldMatrix()));
  }

  getMin() {
    if (this.geometry.getMin() != null) {
      return m4.transformPoint(this.getWorldMatrix(), this.geometry.getMin());
    } else {
      return [0, 0, 0];
    }
  }

  getMax() {
    if (this.geometry.getMax() != null) {
      return m4.transformPoint(this.getWorldMatrix(), this.geometry.getMax());
    } else {
      return [0, 0, 0];
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

}
