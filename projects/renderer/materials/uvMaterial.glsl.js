import { getMorphTargetDeclarationString, getMorphTargetCalculationString, getSkinDeclarationString, getSkinCalculationString } from "../shader.js"

function getVertexSource() {

  var vertexSource = /*GLSL*/`
  
  in vec3 POSITION;
#ifdef HAS_UV_0
  in vec2 TEXCOORD_0;
#endif

  uniform mat4 modelMatrix;

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

#ifdef HAS_UV_0
  out vec2 vUV;
#endif

`+ getSkinDeclarationString() + /*GLSL*/`
`+ getMorphTargetDeclarationString() + /*GLSL*/`

  void main(){
  
#ifdef HAS_UV_0
    vUV = TEXCOORD_0;
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
    
    
#ifdef HAS_UV_0
    in vec2 vUV;
#endif

    out vec4 fragColor;
  
    void main(){
      vec3 col = mix(vec3(0.2), vec3(1, 0, 1), smoothstep(0.49, 0.5, mod(gl_FragCoord.x, 100.0)/100.0));
#ifdef HAS_UV_0
      col = vec3(vUV, 0.0); 
#endif
      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
