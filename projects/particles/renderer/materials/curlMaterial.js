import { gl, Material } from '../renderer.js'
import { getVertexSource, getFragmentSource } from './curlMaterial.glsl.js'

export class CurlMaterial extends Material {

  scale = 256;
  scaleHandle;

  speed = 5.0;
  speedHandle;

  time = 0.0;
  timeHandle;

  lifetime = 4.0;
  lifetimeHandle;

  textureUnits = 0;

  deltaTime = 0;
  deltaTimeHandle;

  noiseTexture;
  noiseTextureHandle;
  noiseTextureUnit;

  lastFrameTexture;
  lastFrameTextureHandle;
  lastFrameTextureUnit;

  thisFrameTexture;

  constructor(noiseTexture) {

    super();

    if (noiseTexture == null) {
      console.error("CurlMaterial requires a texture during construction!");
    }

    this.noiseTexture = noiseTexture;

    this.attributes = ["POSITION"];

    this.textureUnits = 0;
    this.noiseTextureUnit = this.textureUnits++;
    this.lastFrameTextureUnit = this.textureUnits++;
  }

  setRenderTextures(lastFrameTexture, thisFrameTexture) {
    this.lastFrameTexture = lastFrameTexture;
    this.thisFrameTexture = thisFrameTexture;
  }

  swapTextures() {
    let temp = this.lastFrameTexture;
    this.lastFrameTexture = this.thisFrameTexture;
    this.thisFrameTexture = temp;
  }

  getVertexShaderSource() {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.deltaTimeHandle = this.program.getUniformLocation('deltaTime');
    this.scaleHandle = this.program.getUniformLocation('scale');
    this.speedHandle = this.program.getUniformLocation('speed');
    this.timeHandle = this.program.getUniformLocation('time');
    this.lifetimeHandle = this.program.getUniformLocation('lifetime');

    this.noiseTextureHandle = this.program.getUniformLocation('noiseTexture');
    this.lastFrameTextureHandle = this.program.getUniformLocation('lastFrameTexture');
  }

  bindUniforms() {
    gl.uniform1f(this.deltaTimeHandle, this.deltaTime);
    gl.uniform1f(this.scaleHandle, this.scale);
    gl.uniform1f(this.speedHandle, this.speed);
    gl.uniform1f(this.timeHandle, this.time);
    gl.uniform1f(this.lifetimeHandle, this.lifetime);

    gl.activeTexture(gl.TEXTURE0 + this.noiseTextureUnit);
    gl.bindTexture(gl.TEXTURE_3D, this.noiseTexture);
    gl.uniform1i(this.noiseTextureHandle, this.noiseTextureUnit);

    gl.activeTexture(gl.TEXTURE0 + this.lastFrameTextureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.lastFrameTexture);
    gl.uniform1i(this.lastFrameTextureHandle, this.lastFrameTextureUnit);
  }

}
