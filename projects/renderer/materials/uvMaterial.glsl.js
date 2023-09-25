function getVertexSource(){ 

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

  void main(){
  
#ifdef HAS_UV_0
    vUV = TEXCOORD_0;
#endif

    vec4 pos = modelMatrix * vec4(POSITION, 1.0);
  
    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){
   
  var fragmentSource = `
    
    
#ifdef HAS_UV_0
    in vec2 vUV;
#endif

    out vec4 fragColor;
  
    void main(){
      vec3 col = vec3(1, 0, 1);
#ifdef HAS_UV_0
      col = vec3(vUV, 0.0); 
#endif
      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
