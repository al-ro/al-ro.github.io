import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './lambertMaterial.glsl.js'

export class LambertMaterial extends Material {

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  normalMatrixHandle;

  constructor() {
    super();
    this.attributes = ["POSITION", "NORMAL"];
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
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
  }

}
