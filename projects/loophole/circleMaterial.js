import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './circleMaterial.glsl.js'

export class CircleMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  aspectHandle;
  aspect;

  offsetHandle;
  offset;

  radiusHandle;
  radius;

  dataHandle;
  data;

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
    this.textureHandle = this.program.getUniformLocation('tex');
    this.aspectHandle = this.program.getUniformLocation('aspect');

    this.offsetHandle = this.program.getUniformLocation('offset');
    this.radiusHandle = this.program.getUniformLocation('radius');
    this.dataHandle = this.program.getUniformLocation('data');
  }


  bindParameters(geometry, time){
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());
    gl.uniform1f(this.timeHandle, time);
    gl.uniform1f(this.aspectHandle, this.aspect);

    gl.uniform2fv(this.offsetHandle, this.offset);
    gl.uniform1f(this.radiusHandle, this.radius);
    gl.uniform1i(this.dataHandle, this.data);

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(this.textureHandle, 0);
  }

  getHandles(){
    return this.attributeHandles; 
  }

  setTexture(texture){
    this.texture = texture;
  }

  setAspect(aspect){
    this.aspect = aspect;
  }

  setOffset(offset){
    this.offset = offset;
  }

  setRadius(radius){
    this.radius = radius;
  }

  setData(data){
    this.data = data;
  }

}
