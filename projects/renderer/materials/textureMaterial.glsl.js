function getVertexSource(parameters){ 

  var vertexSource = `
  
  attribute vec3 position;
  attribute vec3 vertexNormal;
  attribute vec2 uv;

  uniform mat4 modelMatrix;
  uniform mat4 normalMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef INSTANCED 
  attribute vec4 orientation;
  attribute vec3 offset;
  attribute vec3 scale;
#endif

  varying vec3 vNormal;
  varying vec2 vUV;

  void main(){
  
    vUV = uv;

    vec4 transformedNormal;
  
#ifdef INSTANCED
    transformedNormal = normalMatrix * vec4(normalize(normalize(vertexNormal)/scale), 0.0);
    transformedNormal.xyz = rotateVectorByQuaternion(transformedNormal.xyz, orientation);
#else
    transformedNormal = normalMatrix * vec4(vertexNormal, 0.0);
#endif

    vNormal = transformedNormal.xyz;

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
    
    varying vec3 vNormal;
    varying vec2 vUV;

    uniform sampler2D tex;
  
    void main(){
      vec3 normal = normalize(vNormal); 
      vec4 col = texture2D(tex, vUV);
      if(col.a < 0.5){
	discard;
	return;
      }
      gl_FragColor = vec4(col);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
