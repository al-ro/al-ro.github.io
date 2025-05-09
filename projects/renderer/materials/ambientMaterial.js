import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './ambientMaterial.glsl.js'
import { gl } from '../canvas.js'

export class AmbientMaterial extends Material {

  modelMatrixHandle;
  normalMatrixHandle;

  constructor() {
    super();

    this.attributes = [
      "POSITION",
      "NORMAL",
      "JOINTS_0",
      "WEIGHTS_0"
    ];

    this.supportsMorphTargets = true;
    this.supportsSkin = true;
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
    this.program.bindUniformBlock("sphericalHarmonicsUniforms", UniformBufferBindPoints.SPHERICAL_HARMONICS);
  }

  getVertexShaderSource(parameters) {
    return getVertexSource(parameters);
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.modelMatrixHandle = this.program.getOptionalUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getOptionalUniformLocation('normalMatrix');
  }

  bindUniforms() {
    if (this.modelMatrixHandle != null) {
      gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);
    }
    if (this.normalMatrixHandle != null) {
      gl.uniformMatrix4fv(this.normalMatrixHandle, false, this.normalMatrix);
    }

    if (this.hasSkin) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
      gl.uniform1i(this.skinTextureHandle, 0);
    }

    if (this.hasMorphTargets) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.morphTargetTexture);
      gl.uniform1i(this.morphTargetTextureHandle, 1);
      gl.uniform1fv(this.morphTargetWeightsHandle, this.weights);
    }

  }

}
