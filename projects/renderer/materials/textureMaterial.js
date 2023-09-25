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

    this.attributes = ["POSITION", "TEXCOORD_0"];

    if (texture == null) {
      console.error("TextureMaterial requires a texture during construction. Provided: ", texture);
    }
    this.texture = texture;
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

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(this.textureHandle, 0);
  }

}
