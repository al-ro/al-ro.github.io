import { gl } from "../canvas.js";
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './lambertMaterial.glsl.js'

export class LambertMaterial extends Material {

  modelMatrixHandle;
  normalMatrixHandle;

  skinTexture;
  skinTextureHandle;

  constructor() {
    super();

    this.attributes = [
      "POSITION",
      "NORMAL",
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

  getVertexShaderSource(parameters) {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
  }

  bindUniforms() {

    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);
    gl.uniformMatrix4fv(this.normalMatrixHandle, false, this.normalMatrix);

    if (this.hasSkin) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
      gl.uniform1i(this.skinTextureHandle, 0);
    }
  }

}
