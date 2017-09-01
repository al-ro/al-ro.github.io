function getVertexSource(parameters){ 

  var vertexSource = `
  
  in vec3 POSITION;
  in vec2 TEXCOORD_0;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef INSTANCED 
  in vec4 orientation;
  in vec3 offset;
  in vec3 scale;
#endif

  out vec2 vUV;

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
    in vec2 vUV;
    out vec4 fragColor;
  
    void main(){
      fragColor = texture(tex, vUV);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
