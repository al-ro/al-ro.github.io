function getVertexSource(parameters){ 

  var vertexSource = `

  in vec3 POSITION;

  void main(){ 
    gl_Position = vec4(POSITION, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `

  

  uniform float fov;
  uniform vec2 resolution;
  uniform mat4 cameraMatrix;
  uniform float exposure;
  uniform samplerCube cubeMap;

  out vec4 fragColor;
/*
  uniform mat4 shRedMatrix;
  uniform mat4 shGrnMatrix;
  uniform mat4 shBluMatrix;

  vec3 getSHIrradiance(vec3 normal){

    vec4 n = vec4(normal, 1.0);

    float r = dot(n, shRedMatrix * n);
    float g = dot(n, shGrnMatrix * n);
    float b = dot(n, shBluMatrix * n);

    return max(vec3(r, g, b), vec3(0));
  }
*/

  vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 xy = fragCoord - resolution.xy / 2.0;
    float z = (0.5 * resolution.y) / tan(fieldOfView / 2.0);
    return normalize(vec3(xy, -z));
  }

  //https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 ACESFilm(vec3 x){
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main(){ 
    vec3 rayDir = normalize(cameraMatrix * vec4(rayDirection(fov, gl_FragCoord.xy), 0.0)).rgb;
    vec3 col = exposure * texture(cubeMap, normalize(rayDir)).rgb;
    col = ACESFilm(col);
    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.0);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
