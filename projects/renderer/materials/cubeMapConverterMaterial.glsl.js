function getVertexSource(parameters){ 

  var vertexSource = `

  attribute vec3 POSITION;
  varying vec3 vPosition;

  void main(){ 
    vPosition = POSITION;
    gl_Position = vec4(POSITION, 1.0);
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
  uniform sampler2D sphericalTexture;
  uniform float textureType;
  varying vec3 vPosition;

  void main(){ 
    vec3 rayDir = normalize(vec3(vPosition.rg, -1.0));
    rayDir = normalize((cameraMatrix * vec4(rayDir, 1.0)).xyz);
    vec2 texCoord;

    if(textureType < 1.0){
      texCoord = vec2((atan(rayDir.z, rayDir.x) / TWO_PI) + 0.5, acos(rayDir.y) / PI);
    }else{
      rayDir.y *= -1.0;
      float r = 1.0 / PI * acos(rayDir.z) / sqrt(pow(rayDir.x, 2.0) + pow(rayDir.y, 2.0));
      texCoord = 0.5 + 0.5 * vec2(rayDir.x * r, rayDir.y * r);
    }
    vec4 data = texture2D(sphericalTexture, texCoord);
    gl_FragColor = vec4(data.rgb, 1.0);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
