import { gl } from "./canvas.js"

/**
 * Generate hash defines to toggle specific parts of shaders according to
 * geometry and material data
 * @param {Material} material Material object
 * @param {Geometry} geometry Geometry object
 * @param {string[]} attributes array of vertex attribute names
 * @returns prefix for shader string
 */
function getDefinePrefix(material, geometry, attributes) {

  var prefix = "#version 300 es \n // " + material.constructor.name + " \n";

  prefix += "precision highp float;\n";

  if (material.instanced) {
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

  if (attributes.includes("JOINTS_0") && attributes.includes("WEIGHTS_0")) {
    prefix += "#define HAS_SKIN \n";
  }

  if (material.hasBaseColorTexture) {
    prefix += "#define HAS_BASE_COLOR_TEXTURE \n";
  }

  if (material.hasBaseColorTextureTransform) {
    prefix += "#define HAS_BASE_COLOR_TEXTURE_TRANSFORM \n";
  }

  if (material.hasSheen) {
    prefix += "#define HAS_SHEEN \n";
  }

  if (material.hasSheenTexture) {
    prefix += "#define HAS_SHEEN_TEXTURE \n";
  }

  if (material.hasNormalTexture) {
    prefix += "#define HAS_NORMAL_TEXTURE \n";
  }

  if (material.hasNormalTextureTransform) {
    prefix += "#define HAS_NORMAL_TEXTURE_TRANSFORM \n";
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

  if (geometry.morphTarget != null && material.supportsMorphTargets) {
    prefix += "#define MORPH_TARGETS " + geometry.morphTarget.count + " \n"
    prefix += "#define MORPHED_ATTRIBUTES " + geometry.morphTarget.morphedAttributePositions.size + " \n"
    for (const attribute of geometry.morphTarget.morphedAttributePositions) {
      prefix += "#define " + attribute[0] + "_MORPH_TARGET " + attribute[1] + "\n";
    }
  }
  return prefix;
}

function getMorphTargetDeclarationString() {
  return /*GLSL*/`

  #ifdef MORPH_TARGETS
    uniform float[MORPH_TARGETS] morphTargetWeights;
    uniform highp sampler2DArray morphTargetTexture;

    vec3 getMorphTargetValue(int target, int property) {
      float id = float(gl_VertexID * MORPHED_ATTRIBUTES + property);
      float textureWidth = float(textureSize(morphTargetTexture, 0).x);
      ivec2 uv = ivec2(mod(id, textureWidth), floor(id / textureWidth));
      return texelFetch(morphTargetTexture, ivec3(uv, target), 0).rgb;
    }
  #endif

  `;
}

/**
 * Construct a glsl string for morphed attribute calculations
 * @param {string} name attribute name
 * @returns shader string of morphed attributes
 */
function getMorphTargetCalculationString(name) {
  return /*GLSL*/`
  #ifdef ` + name + /*GLSL*/`_MORPH_TARGET
    for(int i = 0; i < MORPH_TARGETS; i++){
      ` + name.toLowerCase() + /*GLSL*/` += morphTargetWeights[i] * getMorphTargetValue(i, ` + name + /*GLSL*/`_MORPH_TARGET);
    }
  #endif

  `;
}

function getSkinDeclarationString() {
  return /*GLSL*/`
    #ifdef HAS_SKIN

    in vec4 JOINTS_0;
    in vec4 WEIGHTS_0;
    uniform sampler2D jointMatricesTexture;

    mat4 getJointMatrix(uint idx){
      return mat4(
        texelFetch(jointMatricesTexture, ivec2(0, idx), 0),
        texelFetch(jointMatricesTexture, ivec2(1, idx), 0),
        texelFetch(jointMatricesTexture, ivec2(2, idx), 0),
        texelFetch(jointMatricesTexture, ivec2(3, idx), 0));
    }
    #endif
  `;
}

function getSkinCalculationString() {
  return /*GLSL*/`
    #ifdef HAS_SKIN

      mat4 skinMatrix =
        WEIGHTS_0[0] * getJointMatrix(uint(JOINTS_0[0])) +
        WEIGHTS_0[1] * getJointMatrix(uint(JOINTS_0[1])) +
        WEIGHTS_0[2] * getJointMatrix(uint(JOINTS_0[2])) +
        WEIGHTS_0[3] * getJointMatrix(uint(JOINTS_0[3]));

      transformedPosition = skinMatrix * vec4(position, 1.0);

    #ifdef HAS_NORMALS
      // Assuming that joint matrices do not scale the mesh, we can omit transpose(inverse())
      transformedNormal = skinMatrix * vec4(normal, 0.0);
    #endif
    #endif
  `;
}

function getVertexSource(parameters) {

  var vertexSource = /*GLSL*/`

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
    mat4 cameraMatrix;
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
    `+ getMorphTargetCalculationString("NORMAL") + /*GLSL*/`
    vec4 transformedNormal = normalMatrix * vec4(normal, 0.0);
    vNormal = transformedNormal.xyz;
#endif

#ifdef HAS_TANGENTS
    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    vec3 N = normalize(vec3(transformedNormal));
    `+ getMorphTargetCalculationString("TANGENT") +/*GLSL*/`
    vec3 T = normalize(vec3(normalMatrix * vec4(tangent.xyz, 0.0)));
    T = normalize(T - dot(T, N) * N);
    vec3 B = normalize(cross(N, T)) * TANGENT.w;
    tbn = mat3(T, B, N);
#endif 

    `+ getMorphTargetCalculationString("POSITION") + /*GLSL*/`
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
      "\n <------ Shader source ------> \n" + shaderSource.split('\n').map((line, index) => '${index + 1}. ${line}').join('\n');
    }
  } catch (error) {
    console.error(error);
  }

  return shader;
}

export { compileShader, getDefinePrefix, getMorphTargetDeclarationString, getMorphTargetCalculationString, getSkinDeclarationString, getSkinCalculationString }
