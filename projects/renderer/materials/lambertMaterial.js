import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './lambertMaterial.glsl.js'

export class LambertMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  normalMatrixHandle;

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }

  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');
    this.attributeHandles.vertexNormalHandle = this.program.getAttribLocation('vertexNormal');

    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
  }

  getInstanceParameterHandles(){
    this.attributeHandles.orientationHandle = this.program.getAttribLocation('orientation');
    this.attributeHandles.offsetHandle = this.program.getAttribLocation('offset');
    this.attributeHandles.scaleHandle = this.program.getAttribLocation('scale');
  }

  getHandles(){
    return this.attributeHandles;
  }

}
