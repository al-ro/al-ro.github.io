function getVertexSource(parameters){ 

  var vertexSource = `
  
  in vec3 POSITION;
  in vec2 TEXCOORD_0;

  out vec2 vUV;

  void main(){
    vUV = TEXCOORD_0;
    gl_Position = vec4(POSITION, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){
   
  var fragmentSource = `
    precision highp float;
    
    uniform sampler2D tex;
    in vec2 vUV;
    out vec4 fragColor;
  
    void main(){
      vec2 uv = vUV;
      uv.y = 1.0 - uv.y;
      fragColor = texture(tex, uv);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
