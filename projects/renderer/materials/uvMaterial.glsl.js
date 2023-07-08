function getVertexSource(){ 

  var vertexSource = `
  
  in vec3 POSITION;
#ifdef HAS_UVS
  in vec2 TEXCOORD_0;
#endif

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef HAS_UVS
  out vec2 vUV;
#endif

  void main(){
  
#ifdef HAS_UVS
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
    
    
#ifdef HAS_UVS
    in vec2 vUV;
#endif

    out vec4 fragColor;
  
    void main(){
      vec3 col = vec3(1, 0, 1);
#ifdef HAS_UVS
      col = vec3(vUV, 0.0); 
#endif
      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
