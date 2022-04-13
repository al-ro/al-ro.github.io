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

  // In the absence of metallicRoughnessTexture, use float uniforms
  // Either these or a texture must be supplied
  metallicFactor = 1.0;
  roughnessFactor = 1.0;

  // In the absence of a base colour texture, use a vec4 uniform
  // Either this or a texture must be supplied
  // If both are given, the base colour values are used to multiply the texture values
  baseColorFactor = [1, 1, 1, 1];

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
  // 	occlusion   r
  //	roughness   g
  //	metal       b
  // Optional
  metallicRoughnessTexture;

  // Ambient occlusion may have a separate texture or use the red channel of properties
  occlusionTexture;

  // Multiplier for texture value
  occlusionStrength = 1.0;

  // Optional
  emissiveTexture;

  // Multiplier for texture value
  emissiveFactor = [1, 1, 1];

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

  environmentTextureHandle;

  shRedMatrixHandle;
  shGrnMatrixHandle;
  shBluMatrixHandle;

  brdfTextureHandle;

  alphaCutoffHandle;
  alphaModeHandle;

  hasBaseColorTexture = false;
  hasNormalTexture = false;
  hasMetallicRoughnessTexture = false;
  hasAO = false;
  hasAOTexture = false;
  hasEmissiveTexture = false;

  brdfTextureUnit;
  environmentTextureUnit;
  baseColorTextureUnit;
  normalTextureUnit;
  metallicRoughnessTextureUnit;
  occlusionTextureUnit;
  emissiveTextureUnit;

  environment;

  // Which quantity to render
  // 0: final PBR colour
  // 1: albedo
  // 2: metalness
  // 3: roughness
  // 4: geometry normal
  // 5: tangent
  // 6: bitangent
  // 7: normal texture
  // 8: ambient occlusion
  // 9: emissive
  // 10: vertex colour
  // 11: TEXCOORD_1
  // 12: TEXCOORD_0
  // 13: Alpha
  // 14: Shading normal
  outputVariable = 0;

  textureUnits = 0;

  destroy(){
    if(this.baseColorTexture != null){
      gl.deleteTexture(this.baseColorTexture);
      this.baseColorTexture = null;
    }
    if(this.metallicRoughnessTexture != null){
      gl.deleteTexture(this.metallicRoughnessTexture);
      this.metallicRoughnessTexture = null;
    }
    if(this.normalTexture != null){
      gl.deleteTexture(this.normalTexture);
      this.normalTexture = null;
    }
    if(this.emissiveTexture != null){
      gl.deleteTexture(this.emissiveTexture);
      this.emissiveTexture = null;
    }
    if(this.occlusionTexture != null){
      gl.deleteTexture(this.occlusionTexture);
      this.occlusionTexture = null;
    }
  }

  constructor(parameters){

    super();

    this.attributes = [
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
    }

    if(parameters.hasOwnProperty("baseColorFactor") && parameters.baseColorFactor){
      this.baseColorFactor = parameters.baseColorFactor;
    }

    if(parameters.hasOwnProperty("normalTexture") && parameters.normalTexture){
      this.hasNormalTexture = true;
      this.normalTextureUnit = this.textureUnits++;
      this.normalTexture = parameters.normalTexture;
      if(parameters.hasOwnProperty("normalScale") && parameters.normalScale != null){
        this.normalScale = parameters.normalScale;
      }
    }

    if(parameters.hasOwnProperty("emissiveTexture") && parameters.emissiveTexture){
      this.hasEmissiveTexture = true;
      this.emissiveTextureUnit = this.textureUnits++;
      this.emissiveTexture = parameters.emissiveTexture;
      if(parameters.hasOwnProperty("emissiveFactor") && parameters.emissiveFactor != null){
        this.emissiveFactor = parameters.emissiveFactor;
      }
    }

    if(parameters.hasOwnProperty("metallicRoughnessTexture") && parameters.metallicRoughnessTexture){
      this.hasMetallicRoughnessTexture = true;
      this.metallicRoughnessTextureUnit = this.textureUnits++;
      this.metallicRoughnessTexture = parameters.metallicRoughnessTexture;
    }else{

      if(parameters.hasOwnProperty("metallicFactor") && parameters.metallicFactor != null){
        this.metallicFactor = parameters.metallicFactor;
      }

      if(parameters.hasOwnProperty("roughnessFactor") && parameters.roughnessFactor != null){
        this.roughnessFactor = parameters.roughnessFactor;
      }
    }

    if(parameters.hasOwnProperty("occlusionTexture") && parameters.occlusionTexture){
      this.hasAO = true;
      if(parameters.occlusionTexture == this.metallicRoughnessTexture){
        this.hasAOTexture = false;
      }else{
        this.hasAOTexture = true;
        this.occlusionTextureUnit = this.textureUnits++;
        this.occlusionTexture = parameters.occlusionTexture;
      }
      if(parameters.hasOwnProperty("occlusionStrength") && parameters.occlusionStrength != null){
        this.occlusionStrength = parameters.occlusionStrength;
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
    }

    this.baseColorHandle = this.program.getOptionalUniformLocation('baseColorFactor');
    
    if(this.hasNormalTexture){
      this.normalTextureHandle = this.program.getOptionalUniformLocation('normalTexture');
      this.normalScaleHandle = this.program.getOptionalUniformLocation('normalScale');
    }

    if(this.hasEmissiveTexture){
      this.emissiveTextureHandle = this.program.getOptionalUniformLocation('emissiveTexture');
      this.emissiveFactorHandle = this.program.getOptionalUniformLocation('emissiveFactor'); 
    }

    if(this.hasMetallicRoughnessTexture){
      this.metallicRoughnessTextureHandle = this.program.getOptionalUniformLocation('metallicRoughnessTexture');
    }

    this.metallicFactorHandle = this.program.getOptionalUniformLocation('metallicFactor'); 
    this.roughnessFactorHandle = this.program.getOptionalUniformLocation('roughnessFactor'); 

    if(this.hasAO){
      this.occlusionStrengthHandle = this.program.getOptionalUniformLocation('occlusionStrength'); 
    }
    if(this.hasAOTexture){
      this.occlusionTextureHandle = this.program.getOptionalUniformLocation('occlusionTexture');
    }

    this.timeHandle = this.program.getOptionalUniformLocation('time'); 
    this.environmentTextureHandle = this.program.getUniformLocation('cubeMap');
    this.brdfTextureHandle = this.program.getUniformLocation('brdfIntegrationMapTexture');
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
    }

    gl.uniform4fv(this.baseColorHandle, this.baseColorFactor); 

    if(this.hasNormalTexture){
      gl.activeTexture(gl.TEXTURE0 + this.normalTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
      gl.uniform1i(this.normalTextureHandle, this.normalTextureUnit);
      gl.uniform1f(this.normalScaleHandle, this.normalScale);
    }

    if(this.hasEmissiveTexture){
      gl.activeTexture(gl.TEXTURE0 + this.emissiveTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.emissiveTexture);
      gl.uniform1i(this.emissiveTextureHandle, this.emissiveTextureUnit);
      gl.uniform3fv(this.emissiveFactorHandle, this.emissiveFactor);
    }

    if(this.hasMetallicRoughnessTexture){
      gl.activeTexture(gl.TEXTURE0 + this.metallicRoughnessTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.metallicRoughnessTexture);
      gl.uniform1i(this.metallicRoughnessTextureHandle, this.metallicRoughnessTextureUnit);
    }
    
    gl.uniform1f(this.metallicFactorHandle, this.metallicFactor);
    gl.uniform1f(this.roughnessFactorHandle, this.roughnessFactor);
    

    if(this.hasAO){
      gl.uniform1f(this.occlusionStrengthHandle, this.occlusionStrength);
    }
    if(this.hasAOTexture){
      gl.activeTexture(gl.TEXTURE0 + this.occlusionTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.occlusionTexture);
      gl.uniform1i(this.occlusionTextureHandle, this.occlusionTextureUnit);
    }
  }

  setCamera(camera){
    this.cameraPosition = camera.getPosition();
    this.exposure = camera.getExposure();
  }

  setTime(time){
    this.time = time;
  }

}
