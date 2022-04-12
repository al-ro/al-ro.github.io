function getVertexSource(parameters){ 

  var vertexSource = `

  attribute vec3 POSITION;
#ifdef HAS_NORMALS
  attribute vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef INSTANCED 
  attribute vec4 orientation;
  attribute vec3 offset;
  attribute vec3 scale;
#endif

#ifdef HAS_NORMALS
  varying vec3 vNormal;
#else
  varying vec3  vPosition;
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
#extension GL_OES_standard_derivatives : enable
    precision highp float;
    
#ifdef HAS_NORMALS
  varying vec3 vNormal;
#else
  varying vec3  vPosition;
#endif

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

      gl_FragColor = vec4( 0.5 + 0.5 * normal, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
