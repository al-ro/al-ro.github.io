import { gl } from "./canvas.js"
import { MorphTarget } from "./morphTarget.js";

/**
 * Generate hash defines to toggle specific parts of shaders according to
 * geometry and material data
 * @param {Material} material Material object
 * @param {string[]} attributes array of vertex attribute names
 * @returns prefix for shader string
 */
function getDefinePrefix(material, attributes, morphTargets) {

  var prefix = "#version 300 es\n// " + material.constructor.name + " \n";

  prefix += "precision highp float;\n";

  if (material.isInstanced()) {
    prefix += "#define INSTANCED \n";
  }

  if (attributes.includes("NORMAL")) {
    prefix += "#define HAS_NORMALS \n";
  }

  if (attributes.includes("TEXCOORD_0")) {
    prefix += "#define HAS_UV_0 \n";
  }

  if (attributes.includes("TEXCOORD_1")) {
    prefix += "#define HAS_UV_1 \n";
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

  if (material.supportsMorphTargets) {
    prefix += getMorphTargetDeclarationString({ morphTargets: morphTargets });
  }

  return prefix;
}

/**
 * Construct a glsl string for morph target attributes and weight uniforms
 * @param {any} parameters
 * @returns shader string of attribute and uniform declaration
 */
function getMorphTargetDeclarationString(parameters) {
  let declarationString = "";
  if (parameters != null && parameters.morphTargets != null) {
    // Weight uniforms (w0, w1, etc.)
    for (let i = 0; i < parameters.morphTargets.length; i++) {
      declarationString += "uniform float w" + i + ";\n"
    }
    // Morph target attributes (POSITION0, POSITION1, etc.)
    for (let i = 0; i < parameters.morphTargets.length; i++) {
      parameters.morphTargets[i].getAttributes().forEach((attribute) => {
        declarationString += "in vec3 " + attribute.getName() + i + ";\n"
      });
    }
  }
  return declarationString;
}

/**
 * Construct a glsl string for morphed attribute calculations
 * @param {any} parameters 
 * @param {string} name 
 * @returns shader string of morphed attributes
 */
function getMorphedAttributeString(parameters, name) {
  let morphString = "vec3 " + name.toLowerCase() + " = " + name + ".xyz";
  if (parameters != null && parameters.morphTargets != null) {
    for (let i = 0; i < parameters.morphTargets.length; i++) {
      if (parameters.morphTargets[i].getAttributes().has(name)) {
        morphString += "\n + w" + i + " * " + name + i;
      }
    }
  }
  return morphString + ";\n";
}

function getVertexSource(parameters) {

  var vertexSource = `

  in vec3 POSITION;

#ifdef HAS_NORMALS
  in vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

#ifdef HAS_UV_0
  in vec2 TEXCOORD_0;
#endif

#ifdef HAS_UV_1
  in vec2 TEXCOORD_1;
#endif

layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
};

  uniform mat4 modelMatrix;

#ifdef HAS_NORMALS
  out vec3 vNormal;
#endif

#ifdef HAS_UV_0
  out vec2 vUV0;
#endif

#ifdef HAS_UV_1
  out vec2 vUV1;
#endif

#ifdef HAS_TANGENTS
  in vec4 TANGENT;
  out mat3 tbn;
#endif

  out vec3  vPosition;

  void main(){

#ifdef HAS_UV_0
    vUV0 = TEXCOORD_0;
#endif

#ifdef HAS_UV_1
    vUV1 = TEXCOORD_1;
#endif

#ifdef HAS_NORMALS
    `+ getMorphedAttributeString(parameters, "NORMAL") + `
    vec4 transformedNormal = normalMatrix * vec4(normal, 0.0);
    vNormal = transformedNormal.xyz;
#endif

#ifdef HAS_TANGENTS
    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    vec3 N = normalize(vec3(transformedNormal));
    `+ getMorphedAttributeString(parameters, "TANGENT") + `
    vec3 T = normalize(vec3(normalMatrix * vec4(tangent.xyz, 0.0)));
    T = normalize(T - dot(T, N) * N);
    vec3 B = normalize(cross(N, T)) * TANGENT.w;
    tbn = mat3(T, B, N);
#endif 

    `+ getMorphedAttributeString(parameters, "POSITION") + `
    vec4 transformedPosition = modelMatrix * vec4(position, 1.0);
    vPosition = transformedPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * transformedPosition;
  }
  `;

  return vertexSource;
}

function compileShader(shaderSource, shaderType) {

  var shader = gl.createShader(shaderType);

  gl.shaderSource(shader, shaderSource);
  try {
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      // Print the error followed by the source with line numbers
      throw "Shader compile failed with: " + gl.getShaderInfoLog(shader) +
      "\n <------ Shader source ------> \n" + shaderSource.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n');
    }
  } catch (error) {
    console.error(error);
  }

  return shader;
}

export { compileShader, getDefinePrefix, getVertexSource, getMorphedAttributeString }
