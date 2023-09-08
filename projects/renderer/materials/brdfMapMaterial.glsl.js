function getVertexSource() {

  var vertexSource = `

  in vec3 POSITION;

  void main(){ 
    gl_Position = vec4(POSITION, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = `
  
  #define PI 3.14159

  uniform vec2 resolution;
  out vec4 fragColor;

  const int sampleCount = 1024;

  const float minDot = 1e-5;

  // Clamped dot product
  float dot_c(vec3 a, vec3 b){
    return max(dot(a, b), minDot);
  }

  // Get orthonormal basis from surface normal
  // https://graphics.pixar.com/library/OrthonormalB/paper.pdf
  void pixarONB(vec3 n, out vec3 b1, out vec3 b2){
    float sign_ = n.z >= 0.0 ? 1.0 : -1.0;
    float a = -1.0 / (sign_ + n.z);
    float b = n.x * n.y * a;
    b1 = vec3(1.0 + sign_ * n.x * n.x * a, sign_ * b, -sign_ * n.x);
    b2 = vec3(b, sign_ + n.y * n.y * a, -n.y);
  }

  // ------------- Hammersley sequence generation using radical inverse -------------

  /*
    http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
    http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/The_Halton_Sampler.html
  */

  float radicalInverse(uint bits) {
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // / 0x100000000
    }

  vec2 hammersley(int i, int N){
    return vec2(float(i)/float(N), radicalInverse(uint(i)));
  }

  // -------------------------------------------------------------------------------

  //  Return a world space sample vector based on a random hemisphere point, the surface normal
  //  and the roughness of the surface.
  //  https://google.github.io/filament/Filament.html#annex/choosingimportantdirectionsforsamplingthebrdf

  // From tangent-space vector to world-space sample vector
  vec3 rotateToNormal(vec3 L, vec3 N){
    vec3 tangent;
    vec3 bitangent;

    pixarONB(N, tangent, bitangent);

    tangent = normalize(tangent);
    bitangent = normalize(bitangent);

    return normalize(tangent * L.x + bitangent * L.y + N * L.z);
  }

  // Return a world-space halfway vector H around N which corresponds to the GGX normal
  // distribution. Reflecting the view ray on H will give a light sample direction
  vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness){
    float a = roughness*roughness;

    // GGX importance sampling
    float cosTheta = sqrt((1.0 - Xi.x) / (1.0 + (a * a - 1.0) * Xi.x));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    float phi = Xi.y * 2.0 * PI;

    vec3 L = normalize(vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta));

    return rotateToNormal(L, N);
  }

  // Schlick-Beckmann
  float geometry(float cosTheta, float k){
    return (cosTheta) / (cosTheta * (1.0 - k) + k);
  }

  float smithShadowing(float NdotV, float NdotL, float roughness){
    // IBL uses a different k than direct lighting
    float k = (roughness * roughness) / 2.0; 
    return geometry(NdotV, k) * geometry(NdotL, k);
  }

  // https://google.github.io/filament/Filament.html#toc9.5
  vec2 integrateBRDF(float NdotV, float roughness){
    
    // Surface normal
    vec3 N = vec3(0.0, 0.0, 1.0);

    // Generate view direction for fragment such that dot(N, V) is uv.x
    vec3 V = normalize(vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV));

    // To accumulate
    vec2 result = vec2(0);
    
    for(int i = 0; i < sampleCount; i++){

      // Low discrepancy random point in uniform square
      vec2 Xi = hammersley(i, sampleCount);
      // Halfway vector
      vec3 H = importanceSampleGGX(Xi, N, roughness);
      // Light vector
      vec3 L = normalize(reflect(-V, H));

      float NdotL = dot_c(N, L);
      float NdotH = dot_c(N, H);
      float VdotH = dot_c(V, H);

      if(NdotL > 0.0){
        float G = smithShadowing(NdotV, NdotL, roughness);
        float S = (G * VdotH) / (NdotH * NdotV);
        
        // Fresnel-Schlick
        float F = pow(1.0 - VdotH, 5.0);

        // Multiple scattering approach from Filament
        result.x += F * S;
        result.y += S;
      }
    }

    return result / float(sampleCount);
  }

  void main(){
    vec2 texCoord = gl_FragCoord.xy/resolution;
    vec2 c = integrateBRDF(texCoord.x, sqrt(texCoord.y));

    fragColor = vec4(c, 0.0, 1.0);
  }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
