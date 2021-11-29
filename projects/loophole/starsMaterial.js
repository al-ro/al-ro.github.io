import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './starsMaterial.glsl.js'

export class StarsMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  aspectHandle;
  aspect;

  mousePosHandle;
  mousePos;

  offsetHandle;
  offset;

  radiusHandle;
  radius;

  dataHandle;
  data;

  deformationEnabledHandle;
  deformationEnabled;

  glowEnabledHandle;
  glowEnabled;

  glowRadiusHandle;
  glowRadius;

  glowFadeHandle;
  glowFade;

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
    this.aspectHandle = this.program.getUniformLocation('aspect');
  }


  bindParameters(geometry, time){
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());
    gl.uniform1f(this.timeHandle, time);
    gl.uniform1f(this.aspectHandle, this.aspect);
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

  setMousePos(mousePos){
    this.mousePos = mousePos;
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
