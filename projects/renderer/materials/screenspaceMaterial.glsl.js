function getVertexSource(parameters){ 

  var vertexSource = `
  
  attribute vec3 POSITION;
  attribute vec2 TEXCOORD_0;

  varying vec2 vUV;

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
    varying vec2 vUV;
  
    void main(){
      vec2 uv = vUV;
      uv.y = 1.0 - uv.y;
      gl_FragColor = texture2D(tex, uv);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
