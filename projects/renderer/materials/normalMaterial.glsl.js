function getVertexSource(parameters){ 

  var vertexSource = `

  in vec3 POSITION;
#ifdef HAS_NORMALS
  in vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef HAS_NORMALS
  out vec3 vNormal;
#else
  out vec3  vPosition;
#endif

  void main(){

#ifdef HAS_NORMALS
    vec4 transformedNormal = normalMatrix * vec4(NORMAL, 0.0);

    vNormal = transformedNormal.xyz;
#endif

    vec4 pos = modelMatrix * vec4(POSITION, 1.0);

#ifndef HAS_NORMALS
    vPosition = vec3((modelMatrix * vec4(POSITION, 1.0)));
#endif
  
    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
    
    
#ifdef HAS_NORMALS
  in vec3 vNormal;
#else
  in vec3  vPosition;
#endif

  out vec4 fragColor;

    void main(){ 
      vec3 normal;
#ifdef HAS_NORMALS
      normal = normalize(vNormal);
#else
      normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
#endif

      if(!gl_FrontFacing){
        normal *= -1.0;
      }

      fragColor = vec4( 0.5 + 0.5 * normal, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
