import { gl } from "./canvas.js"

/**
 * Generate hash defines to toggle specific parts of shaders according to geometry and material data
 * @param {Material} material Material object
 * @param {string[]} attributes array of vertex attribute names
 * @returns prefix for shader string
 */
function getDefinePrefix(material, attributes) {

  var prefix = "#version 300 es\n// " + material.constructor.name + " \n";


  if (material.isInstanced()) {
    prefix += "#define INSTANCED \n";
  }

  if (attributes.includes("NORMAL")) {
    prefix += "#define HAS_NORMALS \n";
  }

  if (attributes.includes("TEXCOORD_0")) {
    prefix += "#define HAS_UVS \n";
  }

  if (attributes.includes("TANGENT")) {
    prefix += "#define HAS_TANGENTS \n";
  }

  if (material.hasBaseColorTexture) {
    prefix += "#define HAS_BASE_COLOR_TEXTURE \n";
  }

  if (material.hasNormalTexture) {
    prefix += "#define HAS_NORMAL_TEXTURE \n";
  }

  if (material.hasMetallicRoughnessTexture) {
    prefix += "#define HAS_METALLIC_ROUGHNESS_TEXTURE \n";
  }

  if (material.hasAO) {
    if (material.hasAOTexture) {
      prefix += "#define HAS_AO_TEXTURE \n";
    } else {
      prefix += "#define AO_IN_METALLIC_ROUGHNESS_TEXTURE \n";
    }
  }

  if (material.hasEmission) {
    prefix += "#define HAS_EMISSION \n";
  }
  if (material.hasEmissiveTexture) {
    prefix += "#define HAS_EMISSIVE_TEXTURE \n";
  }
  if (material.hasEmissiveFactor) {
    prefix += "#define HAS_EMISSIVE_FACTOR \n";
  }

  if (material.hasTransmission) {
    prefix += "#define HAS_TRANSMISSION \n";
  }
  if (material.hasTransmissionTexture) {
    prefix += "#define HAS_TRANSMISSION_TEXTURE \n";
  }
  if (material.hasTransmissionFactor) {
    prefix += "#define HAS_TRANSMISSION_FACTOR \n";
  }


  return prefix;

}

var instancePrefix = `

attribute vec4 orientation;
attribute vec3 offset;
attribute vec3 scale;

//https://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
vec3 rotateVectorByQuaternion(vec3 v, vec4 q){
  return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}
`;

function getNormalTransform(parameters) {

  let normalTransform = `
    vec4 transformedNormal = normalMatrix * vec4(vertexNormal, 0.0);
  `
  if (parameters != null && parameters.instanced) {
    /**
     * For instancing, we apply the same rotation as for the positions but an inverted scaling
     * https://paroj.github.io/gltut/Illumination/Tut09%20Normal%20Transformation.html
    */
    normalTransform = `
        vec4 transformedNormal = normalMatrix * vec4(normalize(normalize(vertexNormal)/scale), 0.0);
        transformedNormal.xyz = rotateVectorByQuaternion(transformedNormal.xyz, orientation);
      `
  }

  return normalTransform;

}

function getPositionTransform(parameters) {

  let positionTransform = `
    vec4 pos = modelMatrix * vec4(position, 1.0);
  `;
  if (parameters != null && parameters.instanced) {
    positionTransform = `
      vec4 pos = modelMatrix * vec4(position*scale, 1.0);
      pos.xyz = rotateVectorByQuaternion(pos.xyz, orientation);
      pos.xyz += offset; 
    `
  }

  return positionTransform;

}

function compileShader(shaderSource, shaderType) {

  var shader = gl.createShader(shaderType);

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }

  return shader;
}

export { compileShader, getDefinePrefix, getNormalTransform, getPositionTransform }
