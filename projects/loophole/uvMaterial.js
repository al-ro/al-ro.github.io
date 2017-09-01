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

    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.timeHandle = this.program.getUniformLocation('time');
  }


  bindParameters(geometry, time){
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());
    gl.uniform1f(this.timeHandle, time);
  }

  getHandles(){
    return this.attributeHandles; 
  }

}
