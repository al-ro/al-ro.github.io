import { gl, enums } from "../canvas.js"
import { Material } from './material.js'
import { getFragmentSource } from './pbrMaterial.glsl.js'
import { getVertexSource } from '../shader.js'

// Which quantity to render for debugging
export const outputEnum = {
  PBR: 0,
  ALBEDO: 1,
  METALNESS: 2,
  ROUGHNESS: 3,
  GEOMETRY_NORMAL: 4,
  NORMAL: 5,
  TANGENT: 6,
  BITANGENT: 7,
  OCCLUSION: 8,
  EMISSIVE: 9,
  TEXCOORD_0: 10,
  ALPHA: 11,
  TRANSMISSION: 12
  //VERTEX_COLOR: 13,
  //TEXCOORD_1: 14,
};

export class PBRMaterial extends Material {

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;
  normalMatrixHandle;

  exposureHandle;
  exposure = 1.0;

  timeHandle;
  time = 0.0;

  cameraPositionHandle;
  cameraPosition = [10, 10, 10];

  /**
   * Spherical harmonics (SH) matrices for red, green and blue
   * Must be generated every time a new environment map is used
   * Stored on CPU for use later on if the same environment
   * is requested again
   * Mandatory
   */
  shRedMatrix = m4.create();
  shGrnMatrix = m4.create();
  shBluMatrix = m4.create();

  // In the absence of metallicRoughnessTexture, use float uniforms
  // Either these or a texture must be supplied
  metallicFactor = 1.0;
  roughnessFactor = 1.0;

  // In the absence of a base color texture, use a vec4 uniform
  // Either this or a texture must be supplied
  // If both are given, the base color values are used to multiply the texture values
  baseColorFactor = [1, 1, 1, 1];

  alphaMode = enums.OPAQUE;
  alphaCutoff = 0.5;

  doubleSided = false;

  // --------- Textures ----------

  // The base color texture
  // Optional
  baseColorTexture;

  // Optional
  normalTexture;

  // Multiplier for normal texture X and Y values
  normalScale = 1.0;

  /**
   * Combined texture of:
   * 	occlusion   r
   * 	roughness   g
   * 	metal       b
   * Optional
   */
  metallicRoughnessTexture;

  // Ambient occlusion may have a separate texture or use the red channel of properties
  occlusionTexture;

  // Multiplier for texture value
  occlusionStrength = 1.0;

  // Optional
  emissiveTexture;

  // Multiplier for texture value
  emissiveFactor = [1, 1, 1];

  transmissionTexture;
  transmissionFactor = 0.0;

  /**
   * A cubemap or equirectangular texture where each mip map is a
   * prefiltered environment map of the source cubemap at level 0
   * Must be generated every time a new environment map is used
   * Mandatory
   */
  environmentTexture;

  // For transmissive materials, this holds a mipmapped square texture of the opaque scene
  // Mandatory if hasTransmission == true
  backgroundTexture;

  /**
   * The precomputed Fresnel response table for given view ray
   * and surface normal. Used in the split sum approach to specular BRDF
   * This texture is independent from the environment and is computed
   * and stored once any pbrMaterial is used
   * Mandatory
   */
  brdfIntegrationMapTexture;

  // --------- PBR uniform handles ----------

  baseColorHandle;
  metallicFactorHandle;
  roughnessFactorHandle;

  baseColorTextureHandle;
  metallicRoughnessTextureHandle;

  normalTextureHandle;
  normalScaleHandle;

  occlusionTextureHandle;
  occlusionStrengthHandle;

  emissiveTextureHandle;
  emissiveFactorHandle;

  transmissionTextureHandle;
  transmissionFactorHandle;

  backgroundTextureHandle;

  environmentTextureHandle;

  shRedMatrixHandle;
  shGrnMatrixHandle;
  shBluMatrixHandle;

  brdfTextureHandle;

  alphaCutoffHandle;
  alphaModeHandle;

  outputVariableHandle;

  hasBaseColorTexture = false;
  hasNormalTexture = false;
  hasMetallicRoughnessTexture = false;
  hasAO = false;
  hasAOTexture = false;
  hasEmission = false;
  hasEmissiveTexture = false;
  hasEmissiveFactor = false;
  hasTransmission = false;
  hasTransmissionTexture = false;
  hasTransmissionFactor = false;

  brdfTextureUnit;
  environmentTextureUnit;
  baseColorTextureUnit;
  normalTextureUnit;
  metallicRoughnessTextureUnit;
  occlusionTextureUnit;
  emissiveTextureUnit;
  transmissionTextureUnit;
  backgroundTextureUnit;

  environment;

  outputVariable = outputEnum.PBR;

  textureUnits = 0;

  weights = [];
  weightHandles = [];

  destroy() {
    if (this.baseColorTexture != null) {
      gl.deleteTexture(this.baseColorTexture);
      this.baseColorTexture = null;
    }
    if (this.metallicRoughnessTexture != null) {
      gl.deleteTexture(this.metallicRoughnessTexture);
      this.metallicRoughnessTexture = null;
    }
    if (this.normalTexture != null) {
      gl.deleteTexture(this.normalTexture);
      this.normalTexture = null;
    }
    if (this.emissiveTexture != null) {
      gl.deleteTexture(this.emissiveTexture);
      this.emissiveTexture = null;
    }
    if (this.occlusionTexture != null) {
      gl.deleteTexture(this.occlusionTexture);
      this.occlusionTexture = null;
    }
    if (this.transmissionTexture != null) {
      gl.deleteTexture(this.transmissionTexture);
      this.transmissionTexture = null;
    }

  }

  constructor(parameters) {

    super();

    this.attributes = [
      "POSITION",
      "NORMAL",
      "TANGENT",
      "TEXCOORD_0"
    ];

    this.needsCamera = true;
    this.needsTime = true;
    this.supportsMorphTargets = true;

    if (parameters.alphaMode != null) {
      this.alphaMode = parameters.alphaMode;
    }

    if (parameters.alphaCutoff != null) {
      this.alphaCutoff = parameters.alphaCutoff;
    }

    if (parameters.doubleSided != null) {
      this.doubleSided = parameters.doubleSided;
    }

    this.textureUnits = 0;

    this.brdfTextureUnit = this.textureUnits++;

    this.environmentTextureUnit = this.textureUnits++;

    if (parameters.environment != null) {

      this.environment = parameters.environment;

      this.brdfIntegrationMapTexture = this.environment.getBRDFIntegrationMap();
      this.environmentTexture = this.environment.getCubeMap();

      let shMatrices = this.environment.getSHMatrices();
      this.shRedMatrix = shMatrices.red;
      this.shGrnMatrix = shMatrices.green;
      this.shBluMatrix = shMatrices.blue;
    }

    if (parameters.baseColorTexture != null) {
      this.baseColorTexture = parameters.baseColorTexture;
      this.hasBaseColorTexture = true;
      this.baseColorTextureUnit = this.textureUnits++;
    }

    if (parameters.baseColorFactor != null) {
      this.baseColorFactor = parameters.baseColorFactor;
    }

    if (parameters.normalTexture != null) {
      this.hasNormalTexture = true;
      this.normalTextureUnit = this.textureUnits++;
      this.normalTexture = parameters.normalTexture;
      if (parameters.normalScale != null) {
        this.normalScale = parameters.normalScale;
      }
    }

    if (parameters.emissiveTexture != null) {
      this.hasEmission = true;
      this.hasEmissiveTexture = true;
      this.emissiveTextureUnit = this.textureUnits++;
      this.emissiveTexture = parameters.emissiveTexture;
    }
    if (parameters.emissiveFactor != null) {
      this.hasEmission = true;
      this.hasEmissiveFactor = true;
      this.emissiveFactor = parameters.emissiveFactor;
    }

    if (parameters.transmissionTexture != null) {
      this.hasTransmission = true;
      this.hasTransmissionTexture = true;
      this.transmissionTextureUnit = this.textureUnits++;
      this.transmissionTexture = parameters.transmissionTexture;
    }

    if (parameters.transmissionFactor != null) {
      this.hasTransmission = true;
      this.hasTransmissionFactor = true;
      this.transmissionFactor = parameters.transmissionFactor;
    }

    if (this.hasTransmission) {
      this.backgroundTextureUnit = this.textureUnits++;
    }

    if (parameters.metallicRoughnessTexture != null) {
      this.hasMetallicRoughnessTexture = true;
      this.metallicRoughnessTextureUnit = this.textureUnits++;
      this.metallicRoughnessTexture = parameters.metallicRoughnessTexture;
    }

    if (parameters.metallicFactor != null) {
      this.metallicFactor = parameters.metallicFactor;
    }

    if (parameters.roughnessFactor != null) {
      this.roughnessFactor = parameters.roughnessFactor;
    }

    if (parameters.occlusionTexture != null) {
      this.hasAO = true;
      if (parameters.occlusionTexture == this.metallicRoughnessTexture) {
        this.hasAOTexture = false;
      } else {
        this.hasAOTexture = true;
        this.occlusionTextureUnit = this.textureUnits++;
        this.occlusionTexture = parameters.occlusionTexture;
      }
      if (parameters.occlusionStrength != null) {
        this.occlusionStrength = parameters.occlusionStrength;
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

  getParameterHandles() {

    if (this.weights != null) {
      for (let i = 0; i < this.weights.length; i++) {
        this.weightHandles.push(this.program.getOptionalUniformLocation("w" + i));
      }
    }

    this.outputVariableHandle = this.program.getUniformLocation('outputVariable');

    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');

    this.cameraPositionHandle = this.program.getUniformLocation('cameraPosition');
    this.exposureHandle = this.program.getUniformLocation('exposure');

    this.shRedMatrixHandle = this.program.getUniformLocation('shRedMatrix');
    this.shGrnMatrixHandle = this.program.getUniformLocation('shGrnMatrix');
    this.shBluMatrixHandle = this.program.getUniformLocation('shBluMatrix');

    this.alphaCutoffHandle = this.program.getOptionalUniformLocation('alphaCutoff');
    this.alphaModeHandle = this.program.getOptionalUniformLocation('alphaMode');

    if (this.hasBaseColorTexture) {
      this.baseColorTextureHandle = this.program.getOptionalUniformLocation('baseColorTexture');
    }

    this.baseColorHandle = this.program.getOptionalUniformLocation('baseColorFactor');

    if (this.hasNormalTexture) {
      this.normalTextureHandle = this.program.getOptionalUniformLocation('normalTexture');
      this.normalScaleHandle = this.program.getOptionalUniformLocation('normalScale');
    }

    if (this.hasEmission) {
      if (this.hasEmissiveTexture) {
        this.emissiveTextureHandle = this.program.getOptionalUniformLocation('emissiveTexture');
      }
      if (this.hasEmissiveFactor) {
        this.emissiveFactorHandle = this.program.getOptionalUniformLocation('emissiveFactor');
      }
    }

    if (this.hasTransmission) {
      if (this.hasTransmissionTexture) {
        this.transmissionTextureHandle = this.program.getOptionalUniformLocation('transmissionTexture');
      }

      if (this.hasTransmissionFactor) {
        this.transmissionFactorHandle = this.program.getOptionalUniformLocation('transmissionFactor');
      }

      this.backgroundTextureHandle = this.program.getOptionalUniformLocation('backgroundTexture');

    }

    if (this.hasMetallicRoughnessTexture) {
      this.metallicRoughnessTextureHandle = this.program.getOptionalUniformLocation('metallicRoughnessTexture');
    }

    this.metallicFactorHandle = this.program.getOptionalUniformLocation('metallicFactor');
    this.roughnessFactorHandle = this.program.getOptionalUniformLocation('roughnessFactor');

    if (this.hasAO) {
      this.occlusionStrengthHandle = this.program.getOptionalUniformLocation('occlusionStrength');
    }
    if (this.hasAOTexture) {
      this.occlusionTextureHandle = this.program.getOptionalUniformLocation('occlusionTexture');
    }

    this.timeHandle = this.program.getOptionalUniformLocation('time');

    this.environmentTextureHandle = this.program.getUniformLocation('cubeMap');
    this.brdfTextureHandle = this.program.getUniformLocation('brdfIntegrationMapTexture');
  }

  getInstanceParameterHandles() {
    this.attributeHandles.orientationHandle = this.program.getAttribLocation('orientation');
    this.attributeHandles.offsetHandle = this.program.getAttribLocation('offset');
    this.attributeHandles.scaleHandle = this.program.getAttribLocation('scale');
  }

  bindParameters() {

    if (this.weights != null) {
      for (let i = 0; i < this.weights.length; i++) {
        gl.uniform1f(this.weightHandles[i], this.weights[i]);
      }
    }

    gl.uniform1i(this.outputVariableHandle, this.outputVariable);

    gl.uniform1f(this.timeHandle, this.time);

    this.brdfIntegrationMapTexture = this.environment.getBRDFIntegrationMap();
    this.environmentTexture = this.environment.getCubeMap();

    let shMatrices = this.environment.getSHMatrices();
    this.shRedMatrix = shMatrices.red;
    this.shGrnMatrix = shMatrices.green;
    this.shBluMatrix = shMatrices.blue;

    gl.uniform1f(this.alphaCutoffHandle, this.alphaCutoff);

    let blendModeAsInt;
    switch (this.alphaMode) {
      case enums.BLEND:
        blendModeAsInt = 1;
        break;
      case enums.MASK:
        blendModeAsInt = 2;
        break;
      default:
        blendModeAsInt = 0;
    }

    gl.uniform1i(this.alphaModeHandle, blendModeAsInt);

    gl.uniformMatrix4fv(this.shRedMatrixHandle, false, this.shRedMatrix);
    gl.uniformMatrix4fv(this.shGrnMatrixHandle, false, this.shGrnMatrix);
    gl.uniformMatrix4fv(this.shBluMatrixHandle, false, this.shBluMatrix);

    gl.uniform3fv(this.cameraPositionHandle, this.cameraPosition);

    gl.uniform1f(this.exposureHandle, this.exposure);

    gl.activeTexture(gl.TEXTURE0 + this.brdfTextureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.brdfIntegrationMapTexture);
    gl.uniform1i(this.brdfTextureHandle, this.brdfTextureUnit);

    gl.activeTexture(gl.TEXTURE0 + this.environmentTextureUnit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.environmentTexture);
    gl.uniform1i(this.environmentTextureHandle, this.environmentTextureUnit);

    if (this.hasBaseColorTexture) {
      gl.activeTexture(gl.TEXTURE0 + this.baseColorTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.baseColorTexture);
      gl.uniform1i(this.baseColorTextureHandle, this.baseColorTextureUnit);
    }

    gl.uniform4fv(this.baseColorHandle, this.baseColorFactor);

    if (this.hasNormalTexture) {
      gl.activeTexture(gl.TEXTURE0 + this.normalTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
      gl.uniform1i(this.normalTextureHandle, this.normalTextureUnit);
      gl.uniform1f(this.normalScaleHandle, this.normalScale);
    }

    if (this.hasEmissiveTexture) {
      gl.activeTexture(gl.TEXTURE0 + this.emissiveTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.emissiveTexture);
      gl.uniform1i(this.emissiveTextureHandle, this.emissiveTextureUnit);
    }

    if (this.hasEmissiveFactor) {
      gl.uniform3fv(this.emissiveFactorHandle, this.emissiveFactor);
    }

    if (this.hasTransmissionTexture) {
      gl.activeTexture(gl.TEXTURE0 + this.transmissionTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.transmissionTexture);
      gl.uniform1i(this.transmissionTextureHandle, this.transmissionTextureUnit);
    }
    if (this.hasTransmissionFactor) {
      gl.uniform1f(this.transmissionFactorHandle, this.transmissionFactor);
    }
    if (this.hasTransmission) {
      gl.activeTexture(gl.TEXTURE0 + this.backgroundTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
      gl.uniform1i(this.backgroundTextureHandle, this.backgroundTextureUnit);
    }

    if (this.hasMetallicRoughnessTexture) {
      gl.activeTexture(gl.TEXTURE0 + this.metallicRoughnessTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.metallicRoughnessTexture);
      gl.uniform1i(this.metallicRoughnessTextureHandle, this.metallicRoughnessTextureUnit);
    }

    gl.uniform1f(this.metallicFactorHandle, this.metallicFactor);
    gl.uniform1f(this.roughnessFactorHandle, this.roughnessFactor);


    if (this.hasAO) {
      gl.uniform1f(this.occlusionStrengthHandle, this.occlusionStrength);
    }
    if (this.hasAOTexture) {
      gl.activeTexture(gl.TEXTURE0 + this.occlusionTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.occlusionTexture);
      gl.uniform1i(this.occlusionTextureHandle, this.occlusionTextureUnit);
    }
  }

  setCamera(camera) {
    this.cameraPosition = camera.getPosition();
    this.exposure = camera.getExposure();
  }

  setBackgroundTexture(backgroundTexture) {
    this.backgroundTexture = backgroundTexture;
  }

  setTime(time) {
    this.time = time;
  }

  setOutput(output) {
    this.outputVariable = output;
  }

}
