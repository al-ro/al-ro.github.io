function getVertexSource(parameters){ 

  var vertexSource = `

  in vec3 POSITION;
#ifdef HAS_NORMALS
  in vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

  uniform mat4 modelMatrix;

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

#ifdef HAS_NORMALS
  out vec3 vNormal;
#else
  out vec3 vPosition;
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
    in vec3 vPosition;
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

      float d = clamp(dot(normal, normalize(vec3(1, 1, 1))), 0.0, 1.0);

      vec3 col = vec3(d); 

      col = pow(col, vec3(0.4545));

      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
