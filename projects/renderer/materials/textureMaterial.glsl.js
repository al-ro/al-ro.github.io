import { getMorphedAttributeString, getSkinDeclarationString, getSkinCalculationString } from "../shader.js"

function getVertexSource(parameters){ 

  var vertexSource = `
  
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

  `+ getSkinDeclarationString() + `

  void main(){
  
#ifdef HAS_UV_0
    vUV = TEXCOORD_0;
#endif

    vec3 position = POSITION.xyz;
    vec4 transformedPosition = modelMatrix * vec4(position, 1.0);

    `+ getSkinCalculationString() + `
    
    gl_Position = projectionMatrix * viewMatrix * transformedPosition;
  }
  `;

  return vertexSource;
}

function getFragmentSource(){
   
  var fragmentSource = `
    
    uniform sampler2D tex;
#ifdef HAS_UV_0
    in vec2 vUV;
#endif 
    out vec4 fragColor;
  
    void main(){
      fragColor = vec4(mix(vec3(0.2), vec3(1, 0, 1), smoothstep(0.49, 0.5, mod(gl_FragCoord.x, 100.0)/100.0)), 1.0);
#ifdef HAS_UV_0
      fragColor = texture(tex, vUV);
#endif
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
