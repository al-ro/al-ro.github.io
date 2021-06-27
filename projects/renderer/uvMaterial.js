import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './uvMaterial.glsl.js'

export class UVMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');
    this.attributeHandles.vertexUVHandle = this.program.getAttribLocation('uv');

    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
  }

  getInstanceParameterHandles(){
    this.attributeHandles.orientationHandle = this.program.getAttribLocation('orientation');
    this.attributeHandles.offsetHandle = this.program.getAttribLocation('offset');
    this.attributeHandles.scaleHandle = this.program.getAttribLocation('scale');
  }

  bindParameters(camera, geometry){
    gl.uniformMatrix4fv(this.projectionMatrixHandle, false, camera.getProjectionMatrix());
    gl.uniformMatrix4fv(this.viewMatrixHandle, false, camera.getViewMatrix());
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());
  }

  getHandles(){
    return this.attributeHandles; 
  }

}
