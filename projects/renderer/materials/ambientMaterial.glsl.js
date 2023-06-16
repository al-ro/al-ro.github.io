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

#ifdef INSTANCED 
  in vec4 orientation;
  in vec3 offset;
  in vec3 scale;
#endif

#ifdef HAS_NORMALS
  out vec3 vNormal;
#else
  out vec3 vPosition;
#endif

  void main(){

#ifdef HAS_NORMALS
    vec4 transformedNormal;

#ifdef INSTANCED
    transformedNormal = normalMatrix * vec4(normalize(normalize(NORMAL)/scale), 0.0);
    transformedNormal.xyz = rotateVectorByQuaternion(transformedNormal.xyz, orientation);
#else
    transformedNormal = normalMatrix * vec4(NORMAL, 0.0);
#endif

    vNormal = transformedNormal.xyz;
#endif

    vec4 pos;

#ifdef INSTANCED
    pos = modelMatrix * vec4(POSITION*scale, 1.0);
    pos.xyz = rotateVectorByQuaternion(pos.xyz, orientation);
    pos.xyz += offset; 
#else
    pos = modelMatrix * vec4(POSITION, 1.0);
#endif

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
    precision highp float;
    
#ifdef HAS_NORMALS
    in vec3 vNormal;
#else
    in vec3  vPosition;
#endif

  uniform mat4 shRedMatrix;
  uniform mat4 shGrnMatrix;
  uniform mat4 shBluMatrix;

  out vec4 fragColor;

  vec3 getSHIrradiance(vec3 normal){

    vec4 n = vec4(normal, 1.0);

    float r = dot(n, shRedMatrix * n);
    float g = dot(n, shGrnMatrix * n);
    float b = dot(n, shBluMatrix * n);

    return max(vec3(r, g, b), vec3(0));
  }

  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 ACESFilm(vec3 x){
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  
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

      vec3 col = getSHIrradiance(normal) / 3.1415; 

      col = ACESFilm(col);
      col = pow(col, vec3(0.4545));

      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
