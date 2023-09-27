import { getMorphedAttributeString, getSkinDeclarationString, getSkinCalculationString } from "../shader.js"

function getVertexSource(parameters){ 

  var vertexSource = `
  
  in vec3 POSITION;
  in vec2 TEXCOORD_0;

  uniform mat4 modelMatrix;

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

  out vec2 vUV;

  `+ getSkinDeclarationString() + `

  void main(){
  
    vUV = TEXCOORD_0;


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
    in vec2 vUV;
    out vec4 fragColor;
  
    void main(){
      fragColor = texture(tex, vUV);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
