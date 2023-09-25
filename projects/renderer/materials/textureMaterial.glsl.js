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

  void main(){
  
    vUV = TEXCOORD_0;

    vec4 v_position = modelMatrix * vec4(POSITION, 1.0);

    v_position = projectionMatrix * viewMatrix * v_position;
    gl_Position = vec4(v_position);
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
