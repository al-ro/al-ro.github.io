import {gl} from "./canvas.js"

// Add hash defines to toggle specific parts of the shaders according to geometry and material data
function getDefinePrefix(parameters, material){

  var prefix = "// " + material.constructor.name + "\n";

  if(parameters){
    if(parameters.hasOwnProperty("instanced") && parameters.instanced){
      prefix += "#define INSTANCED \n";
    }

    if(parameters.hasOwnProperty("normals") && parameters.normals){
      prefix += "#define HAS_NORMALS \n";
    }

    if(parameters.hasOwnProperty("uvs") && parameters.uvs){
      prefix += "#define HAS_UVS \n";
    }

    if(parameters.hasOwnProperty("tangents") && parameters.tangents){
      prefix += "#define HAS_TANGENTS \n";
    }

    if(material.hasAlbedoTexture){
      prefix += "#define HAS_ALBEDO_TEXTURE \n";
    }

    if(material.hasNormalTexture){
      prefix += "#define HAS_NORMAL_TEXTURE \n";
    }

    if(material.hasEmissiveTexture){
      prefix += "#define HAS_EMISSIVE_TEXTURE \n";
    }

    if(material.hasPropertiesTexture){
      prefix += "#define HAS_PROPERTIES_TEXTURE \n";
    }
    if(material.hasAO){
      if(material.hasAOTexture){
        prefix += "#define HAS_AO_TEXTURE \n";
      }else{
        prefix += "#define AO_IN_PROPERTIES_TEXTURE \n";
      }
    }
  }

  return prefix;

}

function getNormalTransform(parameters){

  let normalTransform = `
    vec4 transformedNormal = normalMatrix * vec4(vertexNormal, 0.0);
  `
  return normalTransform;

}

function getPositionTransform(parameters){

  let positionTransform = `
    vec4 pos = modelMatrix * vec4(position, 1.0);
  `;

  return positionTransform;

}

function compileShader(shaderSource, shaderType){

  var shader = gl.createShader(shaderType);

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }

  return shader;
}

export {compileShader, getDefinePrefix, getNormalTransform, getPositionTransform}
