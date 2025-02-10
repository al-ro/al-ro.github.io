import { getMorphTargetDeclarationString, getMorphTargetCalculationString, getSkinDeclarationString, getSkinCalculationString } from "../shader.js"

function getVertexSource() {

  var vertexSource = /*GLSL*/`

  in vec3 POSITION;

#ifdef HAS_UV_0
  in vec2 TEXCOORD_0;
#endif

#ifdef HAS_UV_1
  in vec2 TEXCOORD_1;
#endif


#ifdef HAS_UV_0
  out vec2 vUV0;
#endif

#ifdef HAS_UV_1
  out vec2 vUV1;
#endif

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

  uniform mat4 modelMatrix;

  `+ getSkinDeclarationString() + /*GLSL*/`
  `+ getMorphTargetDeclarationString() + /*GLSL*/`

  void main(){

#ifdef HAS_UV_0
    vUV0 = TEXCOORD_0;
#endif

#ifdef HAS_UV_1
    vUV1 = TEXCOORD_1;
#endif

    vec3 position = POSITION.xyz;
  `+ getMorphTargetCalculationString("POSITION") + /*GLSL*/ `
    vec4 transformedPosition = modelMatrix * vec4(position, 1.0);

  `+ getSkinCalculationString() + /*GLSL*/`

    gl_Position = projectionMatrix * viewMatrix * transformedPosition;
  }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*GLSL*/`

  out vec4 fragColor;

#ifdef HAS_UV_0
  in vec2 vUV0;
#endif

#ifdef HAS_UV_1
  in vec2 vUV1;
#endif

#ifdef HAS_BASE_COLOR_TEXTURE
    uniform sampler2D baseColorTexture;
    uniform int baseColorTextureUV;
#endif

    uniform vec4 baseColorFactor;
    uniform int alphaMode;
    uniform float alphaCutoff;

#if defined(HAS_UV_0) || defined(HAS_UV_1)

    // Helper function for multiple UV attributes
    vec4 readTexture(sampler2D tex, int uv){
      vec2 vUV;

#if defined(HAS_UV_0) && defined(HAS_UV_1)
      vUV = uv == 0 ? vUV0 : vUV1;
#elif defined(HAS_UV_0)
      vUV = vUV0;
#else
      vUV = vUV1;
#endif

      return texture(tex, vUV);
    }

#endif

    void main(){
      float alpha = 1.0;

#ifdef HAS_BASE_COLOR_TEXTURE
      vec4 colorData = readTexture(baseColorTexture, baseColorTextureUV);
      vec4 albedo = baseColorFactor * vec4(vec3(pow(colorData.rgb, vec3(2.2))), colorData.a);
#else
      vec4 albedo = baseColorFactor;
#endif

      if(alphaMode != 0){
        alpha = albedo.a;
      }

      if(alphaMode == 2 && alpha < alphaCutoff){
        discard;
      }

      fragColor = vec4(vec3(gl_FragCoord.z), 1.0);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
