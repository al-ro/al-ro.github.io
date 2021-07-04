import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './sphericalHarmonicsMaterial.glsl.js'

export class SphericalHarmonicsMaterial extends Material{

  cubeMapHandle;
  cubeMap;

  constructor(cubeMap){
    super();
    if(!cubeMap){
      console.error("SphericalHarmonicsMaterial must be created with a cube map texture. Parameter: ", cubeMap);
    }
    this.cubeMap = cubeMap;
  }

  getVertexShaderSource(){
    return getVertexSource();
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');
    this.cubeMapHandle = this.program.getUniformLocation('cubeMap');
  }

  bindParameters(camera, geometry){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
    gl.uniform1i(this.cubeMapHandle, 0);
  }

  getHandles(){
    return this.attributeHandles; 
  }

}
