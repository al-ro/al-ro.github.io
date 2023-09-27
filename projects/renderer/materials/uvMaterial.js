import { gl } from "../canvas.js"
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './uvMaterial.glsl.js'

export class UVMaterial extends Material {

  projectionMatrixHandle;
  modelMatrixHandle;

  skinTexture;
  skinTextureHandle;

  constructor() {
    super();
    this.attributes = [
      "POSITION",
      "TEXCOORD_0",
      "JOINTS_0",
      "WEIGHTS_0"
    ];

    this.supportsSkin = true;
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
  }

  enableSkin() {
    if (!this.hasSkin && this.program != null) {
      this.hasSkin = true;
      this.skinTextureHandle = this.program.getOptionalUniformLocation('jointMatricesTexture');
    }
  }

  getVertexShaderSource() {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
  }

  bindUniforms() {
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);

    if (this.hasSkin) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
      gl.uniform1i(this.skinTextureHandle, 0);
    }
  }

}
