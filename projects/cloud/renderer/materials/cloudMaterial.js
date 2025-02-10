import { gl, Material, UniformBufferBindPoints } from '../renderer.js'

export class CloudMaterial extends Material {

  timestamped = true;
  textureUnits = 0;

  resolution = [1, 1];
  resolutionHandle;
  time = 0;
  timeHandle;

  frame = 0;
  frameHandle;

  hasTransmission = true;

  blueNoiseTexture;
  blueNoiseTextureHandle;
  blueNoiseTextureUnit;

  densityTexture;
  densityTextureHandle;
  densityTextureUnit;

  noiseTexture;
  noiseTextureHandle;
  noiseTextureUnit;

  detailSize = 1.0;
  detailSizeHandle;

  detailStrength = 0.0;
  detailStrengthHandle;
  carve = false;

  sunStrength = 100.0;
  sunHandle;

  sunColor = [1, 1, 1];
  sunColorHandle;

  sunDirection = normalize([0.0, 1.0, 0.5]);
  sunDirectionHandle;

  dithering = true;
  ditheringHandle;

  renderBackground = true;
  renderBackgroundHandle;

  dataAspect = [1, 1, 1];
  dataAspectHandle;

  aabbScale = [1, 1, 1];
  aabbScaleHandle;

  sigmaS = [1, 1, 1];
  sigmaSHandle;

  sigmaA = [0, 0, 0];
  sigmaAHandle;

  sigmaT = [1, 1, 1];
  sigmaTHandle;

  emissionStrength = 0.0;
  emissionStrengthHandle;

  densityMultiplier = 110;
  densityMultiplierHandle;

  fragmentSource = /*glsl*/`
    uniform float time;

    layout(std140) uniform cameraMatrices{
      mat4 viewMatrix;
      mat4 projectionMatrix;
      mat4 cameraMatrix;
    };

    layout(std140) uniform cameraUniforms{
      vec3 cameraPosition;
      float cameraExposure;
      float cameraFOV;
    };

    in vec2 vUV;
    out vec4 fragColor;

    void main(){
      fragColor = vec4(vUV, 0.5 + 0.5 * sin(time), 1.0);
    }
    `;

  constructor() {

    super();

    this.attributes = ["POSITION", "TEXCOORD_0"];

    this.textureUnits = 0;

    this.blueNoiseTextureUnit = this.textureUnits++;
    this.densityTextureUnit = this.textureUnits++;
    this.noiseTextureUnit = this.textureUnits++;
  }

  getVertexShaderSource() {
    return /*glsl*/`
      in vec3 POSITION;
      in vec2 TEXCOORD_0;

      out vec2 vUV;

      void main(){
        vUV = TEXCOORD_0;
        vUV.y = 1.0 - vUV.y;
        gl_Position = vec4(POSITION, 1.0);
      }
    `;
  }

  getFragmentShaderSource() {
    return this.fragmentSource;
  }

  getUniformHandles() {
    this.timeHandle = this.program.getOptionalUniformLocation('time');
    this.frameHandle = this.program.getOptionalUniformLocation('frame');
    this.resolutionHandle = this.program.getOptionalUniformLocation('resolution');

    this.blueNoiseTextureHandle = this.program.getOptionalUniformLocation('blueNoiseTexture');
    this.densityTextureHandle = this.program.getOptionalUniformLocation('densityTexture');
    this.noiseTextureHandle = this.program.getOptionalUniformLocation('noiseTexture');

    this.dataAspectHandle = this.program.getOptionalUniformLocation('dataAspect');
    this.aabbScaleHandle = this.program.getOptionalUniformLocation('aabbScale');

    this.ditheringHandle = this.program.getOptionalUniformLocation('dithering');
    this.renderBackgroundHandle = this.program.getOptionalUniformLocation('renderBackground');

    this.sunDirectionHandle = this.program.getOptionalUniformLocation('sunDirection');
    this.sunColorHandle = this.program.getOptionalUniformLocation('sunColor');
    this.sunStrengthHandle = this.program.getOptionalUniformLocation('sunStrength');

    this.sigmaSHandle = this.program.getOptionalUniformLocation('sigmaS');
    this.sigmaAHandle = this.program.getOptionalUniformLocation('sigmaA');
    this.sigmaTHandle = this.program.getOptionalUniformLocation('sigmaT');

    this.densityMultiplierHandle = this.program.getOptionalUniformLocation('densityMultiplier');

    this.emissionStrengthHandle = this.program.getOptionalUniformLocation('emissionStrength');

    this.detailSizeHandle = this.program.getOptionalUniformLocation('detailSize');
    this.detailStrengthHandle = this.program.getOptionalUniformLocation('detailStrength');
  }

  bindUniforms() {
    gl.uniform1f(this.timeHandle, this.time);
    if (this.frameHandle != null) {
      gl.uniform1i(this.frameHandle, this.frame);
    }
    gl.uniform2fv(this.resolutionHandle, this.resolution);

    if (this.blueNoiseTextureHandle != null) {
      gl.activeTexture(gl.TEXTURE0 + this.blueNoiseTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.blueNoiseTexture);
      gl.uniform1i(this.blueNoiseTextureHandle, this.blueNoiseTextureUnit);
    }

    if (this.densityTextureHandle != null) {
      gl.activeTexture(gl.TEXTURE0 + this.densityTextureUnit);
      gl.bindTexture(gl.TEXTURE_3D, this.densityTexture);
      gl.uniform1i(this.densityTextureHandle, this.densityTextureUnit);
    }

    if (this.noiseTextureHandle != null) {
      gl.activeTexture(gl.TEXTURE0 + this.noiseTextureUnit);
      gl.bindTexture(gl.TEXTURE_3D, this.noiseTexture);
      gl.uniform1i(this.noiseTextureHandle, this.noiseTextureUnit);
    }

    if (this.ditheringHandle != null) {
      gl.uniform1i(this.ditheringHandle, this.dithering ? 1 : 0);
    }
    if (this.renderBackgroundHandle != null) {
      gl.uniform1i(this.renderBackgroundHandle, this.renderBackground ? 1 : 0);
    }

    if (this.sunDirectionHandle != null) {
      gl.uniform3fv(this.sunDirectionHandle, this.sunDirection);
    }
    if (this.sunStrengthHandle != null) {
      gl.uniform1f(this.sunStrengthHandle, this.sunStrength);
    }
    if (this.sunColorHandle != null) {
      gl.uniform3fv(this.sunColorHandle, this.sunColor);
    }

    if (this.dataAspectHandle != null) {
      gl.uniform3fv(this.dataAspectHandle, this.dataAspect);
    }

    if (this.aabbScaleHandle != null) {
      gl.uniform3fv(this.aabbScaleHandle, this.aabbScale);
    }

    if (this.sigmaSHandle != null) {
      gl.uniform3fv(this.sigmaSHandle, this.sigmaS);
    }
    if (this.sigmaAHandle != null) {
      gl.uniform3fv(this.sigmaAHandle, this.sigmaA);
    }
    if (this.sigmaTHandle != null) {
      gl.uniform3fv(this.sigmaTHandle, this.sigmaT);
    }

    if (this.detailSizeHandle != null) {
      gl.uniform1f(this.detailSizeHandle, this.detailSize);
    }
    if (this.detailStrengthHandle != null) {
      gl.uniform1f(this.detailStrengthHandle, this.carve ? this.detailStrength : 0.0);
    }

    if (this.densityMultiplierHandle != null) {
      gl.uniform1f(this.densityMultiplierHandle, this.densityMultiplier);
    }
    if (this.emissionStrengthHandle != null) {
      gl.uniform1f(this.emissionStrengthHandle, this.emissionStrength);
    }
  }

  bindUniformBlocks() {
    this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
    this.program.bindUniformBlock("cameraUniforms", UniformBufferBindPoints.CAMERA_UNIFORMS);
  }

}
