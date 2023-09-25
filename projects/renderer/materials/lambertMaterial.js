import { gl } from "../canvas.js";
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './lambertMaterial.glsl.js'

export class LambertMaterial extends Material {

  modelMatrixHandle;
  normalMatrixHandle;

  constructor() {
    super();
    this.attributes = ["POSITION", "NORMAL"];
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
  }

  getVertexShaderSource(parameters) {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
  }

  bindUniforms() {
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);
    gl.uniformMatrix4fv(this.normalMatrixHandle, false, this.normalMatrix);
  }

}
