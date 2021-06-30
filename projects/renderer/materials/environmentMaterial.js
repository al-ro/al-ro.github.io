import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './environmentMaterial.glsl.js'

export class EnvironmentMaterial extends Material{

  cameraMatrixHandle;

  cubeMapHandle;
  cubeMap;

  constructor(cubeMap){
    super();
    if(!cubeMap){
      console.error("Environment material must be created with a cube map texture. Parameter: ", cubeMap);
    }
    this.cubeMap = cubeMap;
  }

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');

    this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
    this.cubeMapHandle = this.program.getUniformLocation('cubeMap');
    this.fovHandle = this.program.getUniformLocation('fov');
    this.resolutionHandle = this.program.getUniformLocation('resolution');
  }

  bindParameters(camera, geometry){
    gl.uniformMatrix4fv(this.cameraMatrixHandle, false, camera.getCameraMatrix());
    gl.uniform1f(this.fovHandle, camera.getFOV());
    gl.uniform2f(this.resolutionHandle, gl.canvas.width, gl.canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
    gl.uniform1i(this.cubeMapHandle, 0);
  }

  getHandles(){
    return this.attributeHandles; 
  }

}
