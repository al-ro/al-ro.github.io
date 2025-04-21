function getVertexSource() {

  var vertexSource = /*glsl*/`

    in vec3 POSITION;
    in vec2 TEXCOORD_0;

    out vec2 vUV;

    void main(){
      vUV = TEXCOORD_0;
      vUV.y = 1.0 - vUV.y;
      gl_Position = vec4(POSITION, 1.0);
    }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*glsl*/`

    uniform float slice;

    in vec2 vUV;
    out vec4 fragColor;

    float saturate(float x) {
      return clamp(x, 0.0, 1.0);
    }

    vec3 modulo(vec3 m, float n) {
      return mod(mod(m, n) + n, n);
    }

    // 5th order polynomial interpolation
    vec3 fade(vec3 t) {
      return (t * t * t) * (t * (t * 6.0 - 15.0) + 10.0);
    }

    #define SIZE 16.0

    // https://www.shadertoy.com/view/4djSRW
    vec3 hash(vec3 p3) {
      p3 = modulo(p3, SIZE);
      p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yxz + 33.33);
      return 2.0 * fract((p3.xxy + p3.yxx) * p3.zyx) - 1.0;
    }

    float gradientNoise(vec3 p) {

      vec3 i = floor(p);
      vec3 f = fract(p);

      vec3 u = fade(f);

      /*
      * For 1D, the gradient of slope g at vertex u has the form h(x) = g * (x - u), where u
      * is an integer and g is in [-1, 1]. This is the equation for a line with slope g which
      * intersects the x-axis at u.
      * For N dimensional noise, use dot product instead of multiplication, and do
      * component-wise interpolation (for 3D, trilinear)
      */
      return mix( mix( mix( dot( hash(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0)),
             dot( hash(i + vec3(1.0,0.0,0.0)), f - vec3(1.0,0.0,0.0)), u.x),
        mix( dot( hash(i + vec3(0.0,1.0,0.0)), f - vec3(0.0,1.0,0.0)),
             dot( hash(i + vec3(1.0,1.0,0.0)), f - vec3(1.0,1.0,0.0)), u.x), u.y),
        mix( mix( dot( hash(i + vec3(0.0,0.0,1.0)), f - vec3(0.0,0.0,1.0)),
             dot( hash(i + vec3(1.0,0.0,1.0)), f - vec3(1.0,0.0,1.0)), u.x),
        mix( dot( hash(i + vec3(0.0,1.0,1.0)), f - vec3(0.0,1.0,1.0)),
             dot( hash(i + vec3(1.0,1.0,1.0)), f - vec3(1.0,1.0,1.0)), u.x), u.y), u.z );
    }

    float getPerlinNoise(vec3 pos, float frequency) {

      //Compute the sum for each octave.
      float sum = 0.0;
      float weightSum = 0.0;
      float weight = 1.0;

      for(int oct = 0; oct < 3; oct++) {

        vec3 p = pos * frequency;
        float val = gradientNoise(p);
        sum += val * weight;
        weightSum += weight;

        weight *= 0.5;
        frequency *= 2.0;
      }

      return saturate(0.5 + 0.5 * (sum / weightSum));
    }

    void main() {
      // Get 3D position represented by the current fragment at the specified slice
      fragColor = vec4(getPerlinNoise(vec3(vUV, slice), 16.0), 0.0, 0.0, 0.0);
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
