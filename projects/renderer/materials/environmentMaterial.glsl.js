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

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

  layout(std140) uniform cameraUniforms{
    vec3 cameraPosition;
    float cameraExposure;
    float cameraFOV;
  };

  uniform vec2 resolution;
  uniform samplerCube environmenCubeMap;

  out vec4 fragColor;

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
    vec3 rayDir = normalize(cameraMatrix * vec4(rayDirection(cameraFOV, gl_FragCoord.xy), 0.0)).rgb;
    vec3 col = cameraExposure * texture(environmenCubeMap, normalize(rayDir)).rgb;
    col = ACESFilm(col);
    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.0);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
