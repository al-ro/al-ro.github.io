import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './convolutionMaterial.glsl.js'

export class ConvolutionMaterial extends Material{

  cubeMap;
  cameraMatrix = m4.create();
  roughness;

  cubeMapHandle;
  cameraMatrixHandle;
  roughnessHandle;

  constructor(cubeMap){
    super();
    if(!cubeMap){
      console.error("ConvolutionMaterial must be created with a cube map. Parameter: ", cubeMap);
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
    this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
    this.roughnessHandle = this.program.getUniformLocation('roughness');
  }

  bindParameters(camera, geometry){
    gl.uniform1i(this.cubeMapHandle, this.cubeMap);
    gl.uniform1f(this.roughnessHandle, this.roughness);
    gl.uniformMatrix4fv(this.cameraMatrixHandle, false, this.cameraMatrix);
  }

  getHandles(){
    return this.attributeHandles; 
  }

  setCameraMatrix(cameraMatrix){
    this.cameraMatrix = cameraMatrix;
  }

}
