import {gl, enums} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './pbrMaterial.glsl.js'

export class PBRMaterial extends Material{

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

  // Spherical harmonics (SH) matrices for red, green and blue
  // Must be generated every time a new environment map is used
  // Stored on CPU table for use later on if the same environment
  // is requested again
  // Mandatory
  shRedMatrix = m4.create();
  shGrnMatrix = m4.create();
  shBluMatrix = m4.create();

  // In the absence of metal/roughness texture, use float uniforms
  // Either these or a texture must be supplied
  metal = 1.0;
  roughness = 1.0;

  // In the absence of a base colour texture, use a vec4 uniform
  // Either this or a texture must be supplied
  // If both are given, the base colour values are used to multiply the texture values
  baseColor = [1, 1, 1, 1];

  alphaMode = enums.OPAQUE;
  alphaCutoff = 0.5;

  doubleSided = false;

  // --------- Textures ----------

  // The base colour texture
  // Optional
  baseColorTexture;

  // Optional
  normalTexture;

  // Multiplier for normal texture X and Y values
  normalScale = 1.0;

  // Combined texture of:
  // 	ao		r
  //	roughness	g
  //	metal		b
  // Optional
  propertiesTexture;

  // Ambient occlusion may have a separate texture or use the red channel of properties
  aoTexture;

  // Multiplier for texture value
  aoStrength = 1.0;

  // Optional
  emissiveTexture;

  // Multiplier for texture value
  emissiveFactor = 1.0;

  // A cubemap or equirectangular texture where each mip map is a 
  // prefiltered environment map of the source cubemap at level 0
  // Must be generated every time a new environment map is used
  // Mandatory
  environmentTexture;

  // The precomputed Fresnel response table for given view ray
  // and surface normal. Used in the split sum approach to specular BRDF
  // This texture is independent from the environment and is computed
  // and stored once any pbrMaterial is used
  // Mandatory
  brdfIntegrationMapTexture;

  // --------- PBR uniform handles ----------

  baseColorHandle;
  metalHandle;
  roughnessHandle;

  baseColorTextureHandle;
  propertiesTextureHandle;

  normalTextureHandle;
  normalScaleHandle;

  aoTextureHandle;
  aoStrengthHandle;

  emissiveTextureHandle;
  emissiveFactorHandle;

  environmentTextureHandle;

  shRedMatrixHandle;
  shGrnMatrixHandle;
  shBluMatrixHandle;

  brdfTextureHandle;

  alphaCutoffHandle;
  alphaModeHandle;

  hasBaseColorTexture = false;
  hasNormalTexture = false;
  hasPropertiesTexture = false;
  hasAO = false;
  hasAOTexture = false;
  hasEmissiveTexture = false;

  brdfTextureUnit;
  environmentTextureUnit;
  baseColorTextureUnit;
  normalTextureUnit;
  propertiesTextureUnit;
  aoTextureUnit;
  emissiveTextureUnit;

  environment;

  textureUnits = 0;

  constructor(parameters){

    super();

    this.supportedAttributes = [
      "POSITION",
      "NORMAL",
      "TANGENT",
      "TEXCOORD_0"
    ];

    this.needsCamera = true;
    this.needsTime = true;

    if(parameters.hasOwnProperty("alphaMode") && parameters.alphaMode){
      this.alphaMode = parameters.alphaMode;
    }

    if(parameters.hasOwnProperty("alphaCutoff") && parameters.alphaCutoff){
      this.alphaCutoff = parameters.alphaCutoff;
    }

    if(parameters.hasOwnProperty("doubleSided") && parameters.doubleSided){
      this.doubleSided = parameters.doubleSided;
    }

    this.textureUnits = 0;

    this.brdfTextureUnit = this.textureUnits++;

    this.environmentTextureUnit = this.textureUnits++;

    if(parameters.hasOwnProperty("environment") && parameters.environment){

      this.environment = parameters.environment;

      this.brdfIntegrationMapTexture = this.environment.getBRDFIntegrationMap();
      this.environmentTexture = this.environment.getCubeMap();

      let shMatrices = this.environment.getSHMatrices();
      this.shRedMatrix = shMatrices.red;
      this.shGrnMatrix = shMatrices.green;
      this.shBluMatrix = shMatrices.blue;
    }

    if(parameters.hasOwnProperty("baseColorTexture") && parameters.baseColorTexture){
      this.baseColorTexture = parameters.baseColorTexture;
      this.hasBaseColorTexture = true;
      this.baseColorTextureUnit = this.textureUnits++;
    }else if(parameters.hasOwnProperty("baseColor") && parameters.baseColor){
      this.baseColor = parameters.baseColor;
    }

    if(parameters.hasOwnProperty("normalTexture") && parameters.normalTexture){
      this.hasNormalTexture = true;
      this.normalTextureUnit = this.textureUnits++;
      this.normalTexture = parameters.normalTexture;
    }

    if(parameters.hasOwnProperty("emissiveTexture") && parameters.emissiveTexture){
      this.hasEmissiveTexture = true;
      this.emissiveTextureUnit = this.textureUnits++;
      this.emissiveTexture = parameters.emissiveTexture;
    }

    if(parameters.hasOwnProperty("propertiesTexture") && parameters.propertiesTexture){
      this.hasPropertiesTexture = true;
      this.propertiesTextureUnit = this.textureUnits++;
      this.propertiesTexture = parameters.propertiesTexture;
    }else{

      if(parameters.hasOwnProperty("metal") && parameters.metal){
        this.metal = parameters.metal;
      }

      if(parameters.hasOwnProperty("roughness") && parameters.roughness){
        this.roughness = parameters.roughness;
      }
    }

    if(parameters.hasOwnProperty("aoTexture") && parameters.aoTexture){
      this.hasAO = true;
      if(parameters.aoTexture == this.propertiesTexture){
        this.hasAOTexture = false;
      }else{
        this.hasAOTexture = true;
        this.aoTextureUnit = this.textureUnits++;
        this.aoTexture = parameters.aoTexture;
      }
    }
  }

  getVertexShaderSource(){
    return getVertexSource();
  }

  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(parameters){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');

    if(parameters.hasOwnProperty("uvs") && parameters.uvs){
      this.attributeHandles.vertexUVHandle = this.program.getAttribLocation('uv');
    }

    if(parameters.hasOwnProperty("tangents") && parameters.tangents){
      this.attributeHandles.vertexTangentHandle = this.program.getAttribLocation('tangent');
    }

    if(parameters.hasOwnProperty("normals") && parameters.normals){
      this.attributeHandles.vertexNormalHandle = this.program.getAttribLocation('vertexNormal');
    }

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

    if(this.hasBaseColorTexture){
      this.baseColorTextureHandle = this.program.getOptionalUniformLocation('baseColorTexture');
    }else{
      this.baseColorHandle = this.program.getOptionalUniformLocation('baseColor');
    }

    if(this.hasNormalTexture){
      this.normalTextureHandle = this.program.getOptionalUniformLocation('normalTexture');
    }

    if(this.hasEmissiveTexture){
      this.emissiveTextureHandle = this.program.getOptionalUniformLocation('emissiveTexture');
    }

    if(this.hasPropertiesTexture){
      this.propertiesTextureHandle = this.program.getOptionalUniformLocation('propertiesTexture');
    }else{
      this.metalHandle = this.program.getOptionalUniformLocation('metal'); 
      this.roughnessHandle = this.program.getOptionalUniformLocation('roughness'); 
    }

    if(this.hasAOTexture){
      this.aoTextureHandle = this.program.getOptionalUniformLocation('aoTexture');
    }

    this.timeHandle = this.program.getOptionalUniformLocation('time'); 
    this.environmentTextureHandle = this.program.getUniformLocation('cubeMap');
    this.brdfTextureHandle = this.program.getUniformLocation('brdfInteggrationMapTexture');
  }

  getInstanceParameterHandles(){
    this.attributeHandles.orientationHandle = this.program.getAttribLocation('orientation');
    this.attributeHandles.offsetHandle = this.program.getAttribLocation('offset');
    this.attributeHandles.scaleHandle = this.program.getAttribLocation('scale');
  }

  bindParameters(){

    gl.uniform1f(this.timeHandle, this.time);

    this.brdfIntegrationMapTexture = this.environment.getBRDFIntegrationMap();
    this.environmentTexture = this.environment.getCubeMap();

    let shMatrices = this.environment.getSHMatrices();
    this.shRedMatrix = shMatrices.red;
    this.shGrnMatrix = shMatrices.green;
    this.shBluMatrix = shMatrices.blue;

    gl.uniform1f(this.alphaCutoffHandle, this.alphaCutoff);

    let blendModeAsInt;
    switch(this.alphaMode){
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

    if(this.hasBaseColorTexture){
      gl.activeTexture(gl.TEXTURE0 + this.baseColorTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.baseColorTexture);
      gl.uniform1i(this.baseColorTextureHandle, this.baseColorTextureUnit);
    }else{
      gl.uniform4fv(this.baseColorHandle, this.baseColor);
    }

    if(this.hasNormalTexture){
      gl.activeTexture(gl.TEXTURE0 + this.normalTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
      gl.uniform1i(this.normalTextureHandle, this.normalTextureUnit);
    }

    if(this.hasEmissiveTexture){
      gl.activeTexture(gl.TEXTURE0 + this.emissiveTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.emissiveTexture);
      gl.uniform1i(this.emissiveTextureHandle, this.emissiveTextureUnit);
    }

    if(this.hasPropertiesTexture){
      gl.activeTexture(gl.TEXTURE0 + this.propertiesTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.propertiesTexture);
      gl.uniform1i(this.propertiesTextureHandle, this.propertiesTextureUnit);
    }else{
      gl.uniform1f(this.metalHandle, this.metal);
      gl.uniform1f(this.roughnessHandle, this.roughness);
    }

    if(this.hasAOTexture){
      gl.activeTexture(gl.TEXTURE0 + this.aoTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.aoTexture);
      gl.uniform1i(this.aoTextureHandle, this.aoTextureUnit);
    }
  }

  getHandles(){
    return this.attributeHandles; 
  }

  setCamera(camera){
    this.cameraPosition = camera.getPosition();
    this.exposure = camera.getExposure();
  }

  setTime(time){
    this.time = time;
  }

}
