import { getMorphedAttributeString, getSkinDeclarationString, getSkinCalculationString } from "../shader.js"

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
  out vec3 vPosition;
#endif

`+ getSkinDeclarationString() + /*GLSL*/`

  void main(){

    vec3 position = POSITION.xyz;
    vec4 transformedPosition = modelMatrix * vec4(position, 1.0);

#ifdef HAS_NORMALS
    vec3 normal = NORMAL.xyz;
    vec4 transformedNormal = normalMatrix * vec4(normal, 0.0);
#endif

`+ getSkinCalculationString() + /*GLSL*/`

#ifdef HAS_NORMALS
    vNormal = transformedNormal.xyz;
#else
    vPosition = transformedPosition.xyz;
#endif
  
    gl_Position = projectionMatrix * viewMatrix * transformedPosition;
  }`;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*GLSL*/`
    
    
#ifdef HAS_NORMALS
    in vec3 vNormal;
#else
    in vec3  vPosition;
#endif

  layout(std140) uniform sphericalHarmonicsUniforms{
    mat4 shRedMatrix;
    mat4 shGrnMatrix;
    mat4 shBluMatrix;
  };

  out vec4 fragColor;

  vec3 getSHIrradiance(vec3 normal){

    vec4 n = vec4(normal, 1.0);

    float r = dot(n, shRedMatrix * n);
    float g = dot(n, shGrnMatrix * n);
    float b = dot(n, shBluMatrix * n);

    return max(vec3(r, g, b), vec3(0));
  }

  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 ACESFilm(vec3 x){
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  
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

      vec3 col = getSHIrradiance(normal) / 3.1415; 

      col = ACESFilm(col);
      col = pow(col, vec3(0.4545));

      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
