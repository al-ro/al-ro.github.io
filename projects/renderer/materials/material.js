import { gl } from "../canvas.js"
import { programRepository } from "../programRepository.js"

export class Material {

  attributeHandles = {};

  // All attributes supported by the material
  attributes = [];

  program;

  needsCamera = false;
  needTime = false;
  instanced = false;

  constructor() { }

  destroy() { }

  createProgram(attributes) {
    this.program = programRepository.getProgram(this, attributes);
  }

  getProgram() {
    return this.program;
  }

  bindMatrices(params) {

    if (this.projectionMatrixHandle != null && params.projectionMatrix != null) {
      gl.uniformMatrix4fv(this.projectionMatrixHandle, false, params.projectionMatrix);
    }

    if (this.viewMatrixHandle != null && params.viewMatrix != null) {
      gl.uniformMatrix4fv(this.viewMatrixHandle, false, params.viewMatrix);
    }

    if (this.modelMatrixHandle != null && params.modelMatrix != null) {
      gl.uniformMatrix4fv(this.modelMatrixHandle, false, params.modelMatrix);
    }

    if (this.normalMatrixHandle != null && params.normalMatrix != null) {
      gl.uniformMatrix4fv(this.normalMatrixHandle, false, params.normalMatrix);
    }
  }

  getAttributes() {
    return this.attributes;
  }

  bindParameters() { }

  isInstanced() {
    return this.instanced;
  }

  setPipeline() { }
}
