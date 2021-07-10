function getVertexSource(parameters){ 

  var vertexSource = `

  attribute vec3 position;

  void main(){ 
    gl_Position = vec4(position, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
#extension GL_EXT_shader_texture_lod : enable

  precision highp float;

  uniform float fov;
  uniform vec2 resolution;
  uniform mat4 cameraMatrix;

  vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 xy = fragCoord - resolution.xy / 2.0;
    float z = (0.5 * resolution.y) / tan(fieldOfView / 2.0);
    return normalize(vec3(xy, -z));
  }

  uniform samplerCube cubeMap;

  void main(){ 
    vec3 rayDir = normalize(cameraMatrix * vec4(rayDirection(fov, gl_FragCoord.xy), 0.0)).rgb;
    vec3 col = textureCubeLodEXT(cubeMap, normalize(rayDir*vec3(-1,1,1)), 0.0).rgb;
    gl_FragColor = vec4(col, 1.0);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
