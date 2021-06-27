import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './TextureMaterial.glsl.js'

export class TextureMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  normalMatrixHandle;

  textureHandle;
  texture;

  constructor(texture){
    super();
    if(texture == null){
      console.error("TextureMaterial requires a texture during construction. Provided: ", texture);
    }
    this.texture = texture;
  }

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');
    this.attributeHandles.vertexUVHandle = this.program.getAttribLocation('uv');
    this.attributeHandles.vertexNormalHandle = this.program.getAttribLocation('vertexNormal');

    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
    this.textureHandle = this.program.getUniformLocation('tex');
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

}
