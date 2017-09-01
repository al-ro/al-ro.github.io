import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './circleMaterial.glsl.js'

export class CircleMaterial extends Material{

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
    this.textureHandle = this.program.getUniformLocation('tex');
    this.aspectHandle = this.program.getUniformLocation('aspect');
    this.mousePosHandle = this.program.getUniformLocation('mousePos');

    this.offsetHandle = this.program.getUniformLocation('offset');
    this.radiusHandle = this.program.getUniformLocation('radius');
    this.dataHandle = this.program.getUniformLocation('data');

    this.deformationEnabledHandle = this.program.getUniformLocation('deformationEnabled');
    this.glowEnabledHandle = this.program.getUniformLocation('glowEnabled');
    this.glowRadiusHandle = this.program.getUniformLocation('glowRadius');
    this.glowFadeHandle = this.program.getUniformLocation('glowFade');
  }


  bindParameters(geometry, time){
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());
    gl.uniform1f(this.timeHandle, time);
    gl.uniform1f(this.aspectHandle, this.aspect);
    gl.uniform2fv(this.mousePosHandle, this.mousePos);

    gl.uniform2fv(this.offsetHandle, this.offset);
    gl.uniform1f(this.radiusHandle, this.radius);
    gl.uniform1i(this.dataHandle, this.data);

    gl.uniform1i(this.deformationEnabledHandle, this.deformationEnabled);
    gl.uniform1i(this.glowEnabledHandle, this.glowEnabled);
    gl.uniform1f(this.glowRadiusHandle, this.glowRadius);
    gl.uniform1f(this.glowFadeHandle, this.glowFade);

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
