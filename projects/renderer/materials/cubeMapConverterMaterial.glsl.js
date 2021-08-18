function getVertexSource(parameters){ 

  var vertexSource = `

  attribute vec3 position;
  varying vec3 vPosition;

  void main(){ 
    vPosition = position;
    gl_Position = vec4(position, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `

  precision highp float;

  #define PI 3.14159
  #define TWO_PI (2.0 * PI)

  uniform mat4 cameraMatrix;
  uniform float exposure;
  uniform sampler2D sphericalTexture;
  varying vec3 vPosition;

  void main(){ 
    vec3 rayDir = normalize(vec3(vPosition.rg, -1.0));
    rayDir = normalize((cameraMatrix * vec4(rayDir, 1.0)).xyz);
    vec2 texCoord = vec2((atan(rayDir.z, rayDir.x) / TWO_PI) + 0.5, acos(rayDir.y) / PI);
    vec4 data = texture2D(sphericalTexture, texCoord);
    gl_FragColor = vec4(data.rgb, 1.0);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
