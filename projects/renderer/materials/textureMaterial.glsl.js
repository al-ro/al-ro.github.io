function getVertexSource(parameters){ 

  var vertexSource = `
  
  attribute vec3 POSITION;
  attribute vec2 TEXCOORD_0;

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
  
    vUV = TEXCOORD_0;

    vec4 pos;

#ifdef INSTANCED
    pos = modelMatrix * vec4(POSITION * scale, 1.0);
    pos.xyz = rotateVectorByQuaternion(pos.xyz, orientation);
    pos.xyz += offset; 
#else
    pos = modelMatrix * vec4(POSITION, 1.0);
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
    
    uniform sampler2D tex;
    varying vec2 vUV;
  
    void main(){
      gl_FragColor = texture2D(tex, vUV);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
