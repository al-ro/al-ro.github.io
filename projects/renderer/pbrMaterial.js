import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './PBRMaterial.glsl.js'

export class PBRMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  normalMatrixHandle;

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
  metal = 0.0;
  roughness = 1.0;

  // In the absence of a base colour texture, use a vec3 uniform
  // Either this or a texture must be supplied
  albedo;

  // --------- Textures ----------

  // The base colour texture
  // Optional
  albedoTexture;

  // Optional
  normalTexture;

  // Combined texture of:
  //	metal		r
  //	roughness	g
  //	ao		b
  // Optional
  propertiesTexture;

  // Optional
  emissiveTexture;

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
  brdfTexture;

  // --------- PBR uniform handles ----------

  albedoTextureHandle;
  normalTextureHandle;
  propertiesTextureHandle;
  emissiveTextureHandle;

  environmentTextureHandle;

  shRedMatrixHandle;
  shGrnMatrixHandle;
  shBluMatrixHandle;

  brdfTextureHandle;

  hasAlbedoTexture = false;
  hasNormalTexture = false;
  hasEmissiveTexture = false;
  hasPropertiesTexture = false;

  albedoTextureUnit;
  normalTextureUnit;
  emissiveTextureUnit;
  propertiesTextureUnit;

  textureUnits = 0;

  constructor(parameters){

    super();

    this.textureUnits = 0;

    if(parameters.hasOwnProperty("albedoTexture") && parameters.albedoTexture){
      this.albedoTexture = parameters.albedoTexture;
      this.hasAlbedoTexture = true;
      this.albedoTextureUnit = this.textureUnits;
      this.textureUnits++;
    }else if(parameters.hasOwnProperty("albedo") && parameters.albedo){
      this.albedo = parameters.albedo;
    }

    if(parameters.hasOwnProperty("normalTexture") && parameters.normalTexture){
      this.hasNormalTexture = true;
      this.normalTextureUnit = this.textureUnits;
      this.textureUnits++;
      this.normalTexture = parameters.normalTexture;
    }

    if(parameters.hasOwnProperty("emissiveTexture") && parameters.emissiveTexture){
      this.hasEmissiveTexture = true;
      this.emissiveTextureUnit = this.textureUnits;
      this.textureUnits++;
      this.emissiveTexture = parameters.emissiveTexture;
    }

    if(parameters.hasOwnProperty("propertiesTexture") && parameters.propertiesTexture){
      this.hasPropertiesTexture = true;
      this.propertiesTextureUnit = this.textureUnits;
      this.textureUnits++;
      this.propertiesTexture = parameters.propertiesTexture;
    }else{

      if(parameters.hasOwnProperty("roughness") && parameters.roughness){
	this.roughness = parameters.roughness;
      }

      if(parameters.hasOwnProperty("metal") && parameters.metal){
	this.metal = parameters.metal;
      }
    }
  }

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
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

    this.shRedMatrixHandle = this.program.getUniformLocation('shRedMatrix');
    this.shGrnMatrixHandle = this.program.getUniformLocation('shGrnMatrix');
    this.shBluMatrixHandle = this.program.getUniformLocation('shBluMatrix');

    if(this.hasAlbedoTexture){
      this.albedoTextureHandle = this.program.getOptionalUniformLocation('albedoTexture');
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

    this.timeHandle = this.program.getOptionalUniformLocation('time'); 
    this.environmentTextureHandle = this.program.getUniformLocation('environmentTexture');
    this.brdfTextureHandle = this.program.getUniformLocation('brdfTexture');
  }

  getInstanceParameterHandles(){
    this.attributeHandles.orientationHandle = this.program.getAttribLocation('orientation');
    this.attributeHandles.offsetHandle = this.program.getAttribLocation('offset');
    this.attributeHandles.scaleHandle = this.program.getAttribLocation('scale');
  }

  bindParameters(camera, geometry, time){
    gl.uniform1f(this.timeHandle, time);
    gl.uniformMatrix4fv(this.projectionMatrixHandle, false, camera.getProjectionMatrix());
    gl.uniformMatrix4fv(this.viewMatrixHandle, false, camera.getViewMatrix());
    gl.uniformMatrix4fv(this.normalMatrixHandle, false, geometry.getNormalMatrix());
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());

    gl.uniformMatrix4fv(this.shRedMatrixHandle, false, this.shRedMatrix);
    gl.uniformMatrix4fv(this.shGrnMatrixHandle, false, this.shGrnMatrix);
    gl.uniformMatrix4fv(this.shBluMatrixHandle, false, this.shBluMatrix);

    gl.uniform3fv(this.cameraPositionHandle, camera.position);

    if(this.hasAlbedoTexture){
      gl.activeTexture(gl.TEXTURE0 + this.albedoTextureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.albedoTexture);
      gl.uniform1i(this.albedoTextureHandle, this.albedoTextureUnit);
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
  }

  getHandles(){
    return this.attributeHandles; 
  }

}
