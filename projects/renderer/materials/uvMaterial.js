import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './uvMaterial.glsl.js'

export class UVMaterial extends Material {

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  constructor() {
    super();
    this.attributes = ["POSITION", "TEXCOORD_0"];
  }

  getVertexShaderSource(parameters) {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getParameterHandles() {
    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
  }

}
