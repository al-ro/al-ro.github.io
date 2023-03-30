import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './wireframeMaterial.glsl.js'

export class WireframeMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  constructor(){
    super();
    this.attributes = ["POSITION", "BARYCENTRIC"];

    this.doubleSided = true;
  }

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }

  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
  }

}
