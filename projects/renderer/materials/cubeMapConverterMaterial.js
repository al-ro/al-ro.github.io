import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './cubeMapConverterMaterial.glsl.js'

export class CubeMapConverterMaterial extends Material{

  cameraMatrixHandle;

  textureHandle;
  texture;

  constructor(texture){

    super();

    this.attributes = ["POSITION"];

    if(!texture){
      console.error("Cube map converter material must be created with a texture. Parameter: ", texture);
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
    this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
    this.textureHandle = this.program.getUniformLocation('sphericalTexture');
  }

  bindParameters(){
    gl.uniformMatrix4fv(this.cameraMatrixHandle, false, this.cameraMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.textureHandle, 0);
  }

  setCameraMatrix(cameraMatrix){
    this.cameraMatrix = cameraMatrix;
  }

}
