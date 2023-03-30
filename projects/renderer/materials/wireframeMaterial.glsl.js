function getVertexSource(parameters){ 

  var vertexSource = `

  in vec3 POSITION;
  in vec3 BARYCENTRIC;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef INSTANCED 
  in vec4 orientation;
  in vec3 offset;
  in vec3 scale;
#endif

  out vec3 barycentric;
  out vec3 vPosition;

  void main(){

    vec4 pos;

#ifdef INSTANCED
    pos = modelMatrix * vec4(POSITION * scale, 1.0);
    pos.xyz = rotateVectorByQuaternion(pos.xyz, orientation);
    pos.xyz += offset; 
#else
    pos = modelMatrix * vec4(POSITION, 1.0);
#endif

    vPosition = vec3((modelMatrix * vec4(POSITION, 1.0)));
    barycentric = BARYCENTRIC;
  
    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  in vec3  vPosition;
  in vec3 barycentric;

  out vec4 fragColor;
  
    void main(){
      vec3 lineColour = vec3(0);
      float width = 1.5;
      if(!gl_FrontFacing){
        lineColour = vec3(1, 0, 0);
        width = 1.0ssssss;
      }
      vec3 d = fwidth(barycentric);
      vec3 f = smoothstep(vec3(0), width * d, barycentric);
      vec3 col = 1.0-vec3(min(min(f.x, f.y), f.z)); 

      //col = pow(col, vec3(0.4545));
      //col = normalize(barycentric);
      if(length(col) < 0.5){
        discard;
      }
      fragColor = vec4(lineColour * col, length(col));
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
