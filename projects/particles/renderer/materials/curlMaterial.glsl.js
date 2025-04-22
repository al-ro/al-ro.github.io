function getVertexSource() {

  var vertexSource = /*glsl*/`

    in vec3 POSITION;

    void main(){
      gl_Position = vec4(POSITION, 1.0);
    }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*glsl*/`

    uniform float deltaTime;
    uniform float scale;
    uniform float speed;
    uniform float time;
    uniform float lifetime;

    uniform highp sampler3D noiseTexture;
    uniform highp sampler2D lastFrameTexture;

    out vec4 fragColor;

    //https://www.shadertoy.com/view/4djSRW
    vec3 hash32(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yxz + 33.33);
      return fract((p3.xxy + p3.yzz) * p3.zyx);
    }

    vec4 getInitialPosition(vec2 fragCoord){
      return vec4(10.0 * (2.0 * hash32(fragCoord)- 1.0), lifetime * hash32(fragCoord + time).x) ;
    }

    float noise(vec3 p){
      return 2.0 * texture(noiseTexture, p / scale).r - 1.0;
    }

    // https://atyuwen.github.io/posts/bitangent-noise/
    vec3 computeCurl(vec3 p){

      const float eps = 1e-1;

      float dx = noise(p + vec3(eps, 0, 0)) - noise(p - vec3(eps, 0, 0));
      float dy = noise(p + vec3(0, eps, 0)) - noise(p - vec3(0, eps, 0));
      float dz = noise(p + vec3(0, 0, eps)) - noise(p - vec3(0, 0, eps));

      vec3 noiseGrad0 = vec3(dx, dy, dz) / (2.0 * eps);

      // Offset position by a random value for second uncorrelated noise read
      p += 1008.5;

      dx = noise(p + vec3(eps, 0, 0)) - noise(p - vec3(eps, 0, 0));
      dy = noise(p + vec3(0, eps, 0)) - noise(p - vec3(0, eps, 0));
      dz = noise(p + vec3(0, 0, eps)) - noise(p - vec3(0, 0, eps));

      vec3 noiseGrad1 = vec3(dx, dy, dz) / (2.0 * eps);

      vec3 curl = cross(noiseGrad0, noiseGrad1);

      return normalize(curl);
    }

    void main() {
      vec4 oldData = texelFetch(lastFrameTexture, ivec2(gl_FragCoord.xy), 0);

      if(oldData.w == 0.0 || oldData.w > lifetime){
        oldData = getInitialPosition(gl_FragCoord.xy + 102.3);
      }

      vec3 velocity =  computeCurl(oldData.xyz);

      fragColor = vec4(oldData.xyz + velocity * speed * deltaTime, oldData.w + deltaTime);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
