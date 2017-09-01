function getVertexSource(){ 

  var vertexSource = `
  
  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelMatrix;

  varying vec2 vUV;

  void main(){
  
    vUV = uv;

    vec4 pos;

    pos = modelMatrix * vec4(position, 1.0);
  
    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){
   
  var fragmentSource = `
    precision highp float;
    
    varying vec2 vUV;
    uniform float time;
  
    void main(){  
      vec3 col = vec3(vUV, 0.5+0.5*sin(time)); 
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
