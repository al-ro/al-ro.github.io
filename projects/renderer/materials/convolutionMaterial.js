import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './convolutionMaterial.glsl.js'

export class ConvolutionMaterial extends Material {

  cubeMap;
  cameraMatrix = m4.create();
  roughness;

  cubeMapHandle;
  cameraMatrixHandle;
  roughnessHandle;

  constructor(cubeMap) {

    super();

    this.attributes = ["POSITION"];

    if (!cubeMap) {
      console.error("ConvolutionMaterial must be created with a cube map. Parameter: ", cubeMap);
    }
    this.cubeMap = cubeMap;
  }

  getVertexShaderSource(parameters) {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getParameterHandles() {
    this.cubeMapHandle = this.program.getUniformLocation('cubeMap');
    this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
    this.roughnessHandle = this.program.getUniformLocation('roughness');
  }

  bindParameters() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
    gl.uniform1i(this.cubeMapHandle, 0);
    gl.uniform1f(this.roughnessHandle, this.roughness);
    gl.uniformMatrix4fv(this.cameraMatrixHandle, false, this.cameraMatrix);
  }

  setCameraMatrix(cameraMatrix) {
    this.cameraMatrix = cameraMatrix;
  }

}
