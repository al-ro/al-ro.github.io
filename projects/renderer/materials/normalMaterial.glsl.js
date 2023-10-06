import { getMorphTargetDeclarationString, getMorphTargetCalculationString, getSkinDeclarationString, getSkinCalculationString } from "../shader.js"

function getVertexSource(parameters) {

  var vertexSource = /*GLSL*/`

  in vec3 POSITION;
#ifdef HAS_NORMALS
  in vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

  uniform mat4 modelMatrix;

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

#ifdef HAS_NORMALS
  out vec3 vNormal;
#else
  out vec3  vPosition;
#endif

  `+ getSkinDeclarationString() + /*GLSL*/`
  `+ getMorphTargetDeclarationString() + /*GLSL*/`

  void main(){
    
    vec3 position = POSITION.xyz;
    `+ getMorphTargetCalculationString("POSITION") + /*GLSL*/ `
    vec4 transformedPosition = modelMatrix * vec4(position, 1.0);

#ifdef HAS_NORMALS
    vec3 normal = NORMAL.xyz;
    `+ getMorphTargetCalculationString("NORMAL") + /*GLSL*/ `
    vec4 transformedNormal = normalMatrix * vec4(normal, 0.0);
#endif

  `+ getSkinCalculationString() + /*GLSL*/`

#ifdef HAS_NORMALS
    vNormal = transformedNormal.xyz;
#else
    vPosition = transformedPosition.xyz;
#endif
  
    gl_Position = projectionMatrix * viewMatrix * transformedPosition;
  }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*GLSL*/`
    
    
#ifdef HAS_NORMALS
  in vec3 vNormal;
#else
  in vec3  vPosition;
#endif

  out vec4 fragColor;

    void main(){ 
      vec3 normal;
#ifdef HAS_NORMALS
      normal = normalize(vNormal);
#else
      normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
#endif

      if(!gl_FrontFacing){
        normal *= -1.0;
      }

      fragColor = vec4( 0.5 + 0.5 * normal, 1.0);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
