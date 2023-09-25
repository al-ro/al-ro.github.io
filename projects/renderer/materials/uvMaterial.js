import { gl } from "../canvas.js"
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './uvMaterial.glsl.js'

export class UVMaterial extends Material {

  projectionMatrixHandle;
  modelMatrixHandle;

  constructor() {
    super();
    this.attributes = ["POSITION", "TEXCOORD_0"];
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
  }

  getVertexShaderSource() {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
  }

  bindUniforms() {
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);
  }

}
