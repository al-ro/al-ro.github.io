import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './textureMaterial.glsl.js'

export class TextureMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  textureHandle;
  texture;

  constructor(texture){

    super();

    this.attributes = ["POSITION", "TEXCOORD_0"];

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
    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.textureHandle = this.program.getUniformLocation('tex');
  }

  bindParameters(){

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(this.textureHandle, 0);
  }

}
