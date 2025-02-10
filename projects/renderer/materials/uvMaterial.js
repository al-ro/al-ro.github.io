import { gl } from "../canvas.js"
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './uvMaterial.glsl.js'

export class UVMaterial extends Material {

  modelMatrixHandle;

  constructor() {
    super();
    this.attributes = [
      "POSITION",
      "TEXCOORD_0",
      "JOINTS_0",
      "WEIGHTS_0"
    ];

    this.supportsMorphTargets = true;
    this.supportsSkin = true;
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
  }

  getVertexShaderSource() {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.modelMatrixHandle = this.program.getOptionalUniformLocation('modelMatrix');
  }

  bindUniforms() {
    if (this.modelMatrixHandle != null) {
      gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);
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
