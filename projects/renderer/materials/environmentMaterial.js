import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './environmentMaterial.glsl.js'

export class EnvironmentMaterial extends Material{

  cameraMatrixHandle;
  cameraMatrix;

  exposureHandle;
  exposure = 1.0;

  cubeMapHandle;
  cubeMap;

  fovHandle;
  fov;

  resolutionHandle;

  constructor(cubeMap, camera, environment){

    super();

    this.environment = environment;

    this.attributes = ["POSITION"];

    this.needsCamera = true;

    if(cubeMap != null){
      this.cubeMap = cubeMap;
    }else{
      console.error("Environment material must be created with a cube map texture. Parameter: ", cubeMap);
    }

    this.cameraMatrix = camera.getCameraMatrix();
    this.exposure = camera.getExposure();
    this.fov = camera.getFOV();
  }

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
    this.cubeMapHandle = this.program.getUniformLocation('cubeMap');
    this.fovHandle = this.program.getUniformLocation('fov');
    this.resolutionHandle = this.program.getUniformLocation('resolution');
    this.exposureHandle = this.program.getUniformLocation('exposure');
/*
    this.shRedMatrixHandle = this.program.getUniformLocation('shRedMatrix');
    this.shGrnMatrixHandle = this.program.getUniformLocation('shGrnMatrix');
    this.shBluMatrixHandle = this.program.getUniformLocation('shBluMatrix');
*/
  }

  bindParameters(){
    gl.uniformMatrix4fv(this.cameraMatrixHandle, false, this.cameraMatrix);
    gl.uniform1f(this.fovHandle, this.fov);
    gl.uniform2f(this.resolutionHandle, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.exposureHandle, this.exposure);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
    gl.uniform1i(this.cubeMapHandle, 0);
/*
    let shMatrices = this.environment.getSHMatrices();
    this.shRedMatrix = shMatrices.red;
    this.shGrnMatrix = shMatrices.green;
    this.shBluMatrix = shMatrices.blue;

    gl.uniformMatrix4fv(this.shRedMatrixHandle, false, this.shRedMatrix);
    gl.uniformMatrix4fv(this.shGrnMatrixHandle, false, this.shGrnMatrix);
    gl.uniformMatrix4fv(this.shBluMatrixHandle, false, this.shBluMatrix);
*/
  }

  setCamera(camera){
    this.cameraMatrix = camera.getCameraMatrix();
    this.exposure = camera.getExposure();
    this.fov = camera.getFOV();;
  }

}
