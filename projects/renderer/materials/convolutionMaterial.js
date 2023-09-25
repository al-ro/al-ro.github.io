import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './convolutionMaterial.glsl.js'

export class ConvolutionMaterial extends Material {

  environmenCubeMap;
  cubeMapHandle;

  roughness;
  roughnessHandle;

  cameraMatrix
  cameraMatrixHandle;

  constructor(environmenCubeMap) {

    super();

    this.attributes = ["POSITION"];

    if (!environmenCubeMap) {
      console.error("ConvolutionMaterial must be created with a cube map. Parameter: ", environmenCubeMap);
    }
    this.environmenCubeMap = environmenCubeMap;
  }

  getVertexShaderSource(parameters) {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.cubeMapHandle = this.program.getUniformLocation('environmenCubeMap');
    this.roughnessHandle = this.program.getUniformLocation('roughness');
    this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
  }

  bindUniforms() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.environmenCubeMap);
    gl.uniform1i(this.cubeMapHandle, 0);

    gl.uniform1f(this.roughnessHandle, this.roughness);
    gl.uniformMatrix4fv(this.cameraMatrixHandle, false, this.cameraMatrix);
  }

  setCameraMatrix(cameraMatrix) {
    this.cameraMatrix = cameraMatrix;
  }

}
