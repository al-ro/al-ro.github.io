import { gl } from "../canvas.js"
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './textureMaterial.glsl.js'

export class TextureMaterial extends Material {

  modelMatrixHandle;

  textureHandle;
  texture;

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
    this.supportsMorphTargets = true;
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
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.textureHandle = this.program.getUniformLocation('tex');
  }

  bindUniforms() {

    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);

    if (this.textureHandle != null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.textureHandle, 0);
    }

    if (this.hasSkin) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
      gl.uniform1i(this.skinTextureHandle, 1);
    }

    if (this.hasMorphTargets) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.morphTargetTexture);
      gl.uniform1i(this.morphTargetTextureHandle, 2);
      gl.uniform1fv(this.morphTargetWeightsHandle, this.weights);
    }
  }

}
