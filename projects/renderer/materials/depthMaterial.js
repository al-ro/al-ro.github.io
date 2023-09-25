import { UniformBufferBindPoints, AlphaModes } from "../enums.js"
import { Material } from './material.js'
import { getFragmentSource, getVertexSource } from './depthMaterial.glsl.js'
import { gl } from "../canvas.js";

export class DepthMaterial extends Material {

  // CPU-side buffer for uniform buffer objects
  vertexUniformBuffer;

  modelMatrixHandle;

  baseColorFactor = [1, 1, 1, 1];

  alphaMode = AlphaModes.OPAQUE;
  alphaCutoff = 0.5;

  doubleSided = false;

  // --------- Textures ----------

  // The base color texture
  // Optional
  baseColorTexture;
  baseColorTextureUV = 0;

  alphaCutoffHandle;
  alphaModeHandle;
  baseColorHandle;
  baseColorTextureHandle;
  baseColorTextureUVHandle;

  hasBaseColorTexture = false;
  hasSkin = false;

  skinTexture;
  skinTextureHandle;

  weights = [];
  weightHandles = [];

  constructor(parameters) {

    super();

    this.attributes = [
      "POSITION",
      "TEXCOORD_0",
      "TEXCOORD_1",
      "JOINTS_0",
      "WEIGHTS_0"
    ];


    this.supportsMorphTargets = true;
    this.supportsSkin = true;

    if (parameters != null) {

      if (parameters.alphaMode != null) {
        this.alphaMode = parameters.alphaMode;
      }

      if (parameters.alphaCutoff != null) {
        this.alphaCutoff = parameters.alphaCutoff;
      }

      if (parameters.baseColorTexture != null) {
        this.baseColorTexture = parameters.baseColorTexture;
        this.hasBaseColorTexture = true;
        if (parameters.baseColorTextureUV != null) {
          this.baseColorTextureUV = parameters.baseColorTextureUV;
        }
      }

      if (parameters.baseColorFactor != null) {
        this.baseColorFactor = parameters.baseColorFactor;
      }

      if (parameters.doubleSided != null) {
        this.doubleSided = parameters.doubleSided;
      }
    }

  }

  getVertexShaderSource(parameters) {
    return getVertexSource(parameters);
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  setWeights(weights) {
    this.weights = weights;
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
  }

  getUniformHandles() {
    if (this.weights != null) {
      for (let i = 0; i < this.weights.length; i++) {
        this.weightHandles.push(this.program.getOptionalUniformLocation("w" + i));
      }
    }

    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.alphaCutoffHandle = this.program.getOptionalUniformLocation('alphaCutoff');
    this.alphaModeHandle = this.program.getOptionalUniformLocation('alphaMode');

    if (this.hasBaseColorTexture) {
      this.baseColorTextureHandle = this.program.getOptionalUniformLocation('baseColorTexture');
      this.baseColorTextureUVHandle = this.program.getOptionalUniformLocation('baseColorTextureUV');
    }

    this.baseColorHandle = this.program.getOptionalUniformLocation('baseColorFactor');
  }

  getInstanceParameterHandles() {
    this.attributeHandles.orientationHandle = this.program.getAttribLocation('orientation');
    this.attributeHandles.offsetHandle = this.program.getAttribLocation('offset');
    this.attributeHandles.scaleHandle = this.program.getAttribLocation('scale');
  }

  enableSkin() {
    if (!this.hasSkin && this.program != null) {
      this.hasSkin = true;
      this.skinTextureHandle = this.program.getOptionalUniformLocation('jointMatricesTexture');
    }
  }

  bindUniforms() {

    gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);

    if (this.weights != null) {
      for (let i = 0; i < this.weights.length; i++) {
        gl.uniform1f(this.weightHandles[i], this.weights[i]);
      }
    }

    gl.uniform1f(this.alphaCutoffHandle, this.alphaCutoff);

    let alphaModeAsInt;
    switch (this.alphaMode) {
      case AlphaModes.BLEND:
        alphaModeAsInt = 1;
        break;
      case AlphaModes.MASK:
        alphaModeAsInt = 2;
        break;
      default:
        alphaModeAsInt = 0;
    }

    gl.uniform1i(this.alphaModeHandle, alphaModeAsInt);

    if (this.hasBaseColorTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.baseColorTexture);
      gl.uniform1i(this.baseColorTextureHandle, 0);
      gl.uniform1i(this.baseColorTextureUVHandle, this.baseColorTextureUV);
    }

    if (this.hasSkin) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
      gl.uniform1i(this.skinTextureHandle, 1);
    }

    gl.uniform4fv(this.baseColorHandle, this.baseColorFactor);
  }

}
