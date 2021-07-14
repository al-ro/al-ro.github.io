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
  uniform float exposure;
  uniform samplerCube cubeMap;

  vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 xy = fragCoord - resolution.xy / 2.0;
    float z = (0.5 * resolution.y) / tan(fieldOfView / 2.0);
    return normalize(vec3(xy, -z));
  }

  //https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 ACESFilm(vec3 x){
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
  }

  void main(){ 
    vec3 rayDir = normalize(cameraMatrix * vec4(rayDirection(fov, gl_FragCoord.xy), 0.0)).rgb;
    vec3 col = exposure * textureCubeLodEXT(cubeMap, normalize(rayDir), 0.0).rgb;
    col = ACESFilm(col);
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
