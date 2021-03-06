function getVertexSource(){ 

  var vertexSource = `
  
  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef INSTANCED 
  attribute vec4 orientation;
  attribute vec3 offset;
  attribute vec3 scale;
#endif

  varying vec2 vUV;

  void main(){
  
    vUV = uv;

    vec4 pos;

#ifdef INSTANCED
    pos = modelMatrix * vec4(position*scale, 1.0);
    pos.xyz = rotateVectorByQuaternion(pos.xyz, orientation);
    pos.xyz += offset; 
#else
    pos = modelMatrix * vec4(position, 1.0);
#endif
  
    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){
   
  var fragmentSource = `
    precision highp float;
    
    varying vec2 vUV;
  
    void main(){  
      vec3 col = vec3(vUV, 0.0); 
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
