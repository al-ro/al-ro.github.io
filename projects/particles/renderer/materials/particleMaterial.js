import { gl } from "../canvas.js";
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './particleMaterial.glsl.js'

export class ParticleMaterial extends Material {

  lifetime = 4.0;
  lifetimeHandle;

  textureUnits = 0;

  particleDataTexture;
  particleDataTextureHandle;
  particleDataTextureUnit;

  doubleSided = true;

  constructor(particleDataTexture) {
    super();

    if (particleDataTexture == null) {
      console.error("ParticleTexture requires a texture during construction!");
    }

    this.particleDataTexture = particleDataTexture;

    this.attributes = [
      "POSITION"
    ];

    this.supportsSkin = false;
    this.supportsMorphTargets = false;

    this.textureUnits = 0;
    this.particleDataTextureUnit = this.textureUnits++;
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
    this.program.bindUniformBlock("cameraUniforms", UniformBufferBindPoints.CAMERA_UNIFORMS);
  }

  getVertexShaderSource() {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.particleDataTextureHandle = this.program.getUniformLocation('dataTexture');
    this.lifetimeHandle = this.program.getUniformLocation('lifetime');
  }

  bindUniforms() {
    gl.activeTexture(gl.TEXTURE0 + this.particleDataTextureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.particleDataTexture);
    gl.uniform1i(this.particleDataTextureHandle, this.particleDataTextureUnit);
    gl.uniform1f(this.lifetimeHandle, this.lifetime);
  }

}
