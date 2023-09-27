import { gl } from "../canvas.js"
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './textureMaterial.glsl.js'

export class TextureMaterial extends Material {

  modelMatrixHandle;

  textureHandle;
  texture;

  skinTexture;
  skinTextureHandle;

  constructor(texture) {

    super();

    this.attributes = [
      "POSITION",
      "TEXCOORD_0",
      "JOINTS_0",
      "WEIGHTS_0"
    ];

    if (texture == null) {
      console.error("TextureMaterial requires a texture during construction. Provided: ", texture);
    }

    this.texture = texture;

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
    this.textureHandle = this.program.getUniformLocation('tex');
  }

  bindUniforms() {

    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.textureHandle, 0);

    if (this.hasSkin) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
      gl.uniform1i(this.skinTextureHandle, 1);
    }
  }

}
