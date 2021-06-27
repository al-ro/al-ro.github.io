import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './normalMaterial.glsl.js'

export class NormalMaterial extends Material{

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

  bindParameters(camera, geometry){
    gl.uniformMatrix4fv(this.projectionMatrixHandle, false, camera.getProjectionMatrix());
    gl.uniformMatrix4fv(this.viewMatrixHandle, false, camera.getViewMatrix());
    gl.uniformMatrix4fv(this.normalMatrixHandle, false, geometry.getNormalMatrix());
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());
  }

  getHandles(){
    return this.attributeHandles;
  }

}
