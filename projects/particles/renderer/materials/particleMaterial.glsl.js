function getVertexSource() {

  var vertexSource = /*glsl*/`

  in vec3 POSITION;

  uniform mat4 modelMatrix;
  uniform float lifetime;
  uniform highp sampler2D dataTexture;

  layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
    mat4 cameraMatrix;
  };

  flat out vec3 vParticleCentre;
  out vec2 vPOSITION;

  void main(){

    vPOSITION = POSITION.xy;

    ivec2 textureDim = textureSize(dataTexture, 0);
    vec4 data = texelFetch(dataTexture, ivec2(float(gl_InstanceID % textureDim.x), floor(float(gl_InstanceID) / float(textureDim.x))), 0);
    vec3 position = data.xyz;

    vec3 cameraRight = vec3(viewMatrix[0].x, viewMatrix[1].x, viewMatrix[2].x);
    vec3 cameraUp = vec3(viewMatrix[0].y, viewMatrix[1].y, viewMatrix[2].y);

    float size = mix(0.3, 0.1, smoothstep(0.0, 0.5 * lifetime, abs(data.a - 0.5 * lifetime)));

    position.xyz += (cameraRight * POSITION.x * size) + (cameraUp * POSITION.y * size);

    vParticleCentre = data.xyz;

    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*glsl*/`

    flat in vec3 vParticleCentre;
    in vec2 vPOSITION;

    layout(location = 0) out vec4 fragColor;
    layout(location = 1) out vec4 fragNormal;

    layout(std140) uniform cameraUniforms{
      vec3 cameraPosition;
      float cameraExposure;
      float cameraFOV;
    };

    // https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
    mat3 lookAt(vec3 camera, vec3 at, vec3 up){
      vec3 zaxis = normalize(at-camera);
      vec3 xaxis = normalize(cross(zaxis, up));
      vec3 yaxis = cross(xaxis, zaxis);

      return mat3(xaxis, yaxis, -zaxis);
    }

    //https://www.shadertoy.com/view/3s3GDn
    float getGlow(float dist, float radius, float intensity){
      return min(10.0, max(0.0, pow(radius/dist, intensity)));
    }

    //https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
    vec3 ACESFilm(vec3 x){
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

    void main(){

      if(length(vPOSITION) > 0.5){
        discard;
      }

      vec3 col = vec3(1);

      vec2 uv = vPOSITION * 2.0;
      vec3 normal = normalize(vec3(uv.x, uv.y, sqrt(1.0 - uv.x * uv.x - uv.y * uv.y)));

      normal = normalize(lookAt(cameraPosition, vParticleCentre, vec3(0, 1, 0)) * normal);

      vec3 light = vec3(0);

      vec3 toLight = vParticleCentre - vec3(0,5,5);
      float attenuation = getGlow(length(toLight), 4.0, 3.0);
      light += attenuation * vec3(0.1, 0.4, 1.0) * mix(1.0, 1.5, (0.5 + 0.5 * dot(normal, -normalize(toLight))));

      toLight = vParticleCentre - vec3(-5,-5,0);
      attenuation = getGlow(length(toLight), 4.0, 3.0);
      light += attenuation * vec3(1.0, 0.2, 0.1) *  mix(1.0, 1.5, (0.5 + 0.5 * dot(normal, -normalize(toLight))));

      toLight = vParticleCentre - vec3(5,-5,5);
      attenuation = getGlow(length(toLight), 4.0, 3.0);
      light += attenuation * vec3(1.0, 0.1, 1.0) *  mix(1.0, 1.5, (0.5 + 0.5 * dot(normal, -normalize(toLight))));

      toLight = vParticleCentre - vec3(-5,0,-5);
      attenuation = getGlow(length(toLight), 4.0, 3.0);
      light += attenuation * vec3(0.1, 1.0, 0.1) *  mix(1.0, 1.5, (0.5 + 0.5 * dot(normal, -normalize(toLight))));

      toLight = vParticleCentre - vec3(5,5,-5);
      attenuation = getGlow(length(toLight), 4.0, 3.0);
      light += attenuation * vec3(0.1, 1.0, 1.0) *  mix(1.0, 1.5, (0.5 + 0.5 * dot(normal, -normalize(toLight))));

      light /= 6.0;

      col *= light;

      col = ACESFilm(col);
      col = pow(col, vec3(0.4545));

      fragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
