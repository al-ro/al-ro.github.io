function getVertexSource() {

  var vertexSource = /*GLSL*/`

    in vec3 POSITION;
    out vec3 vPosition;

    void main(){ 
      vPosition = POSITION;
      gl_Position = vec4(POSITION, 1.0);
    }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*GLSL*/`

    uniform mat4 cameraMatrix;
    
    uniform samplerCube environmentCubeMap;
    uniform float roughness;

    in vec3 vPosition;
    out vec4 fragColor;

    const float PI = 3.14159;
    const int sampleCount = 512;

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

    //  http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
    //  http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/The_Halton_Sampler.html

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

    // Trowbridge-Reitz AKA GGX
    float distribution(float NdotH, float roughness){
      float a2 = roughness * roughness;
      return a2 /(PI * pow(NdotH * NdotH * (a2 - 1.0) + 1.0, 2.0));
    }


    vec3 getPreFilteredColor(vec3 N, float roughness){
      vec3 R = N;
      vec3 V = R;
      
      float totalWeight = 0.0;
      vec3 prefilteredColor = vec3(0.0);    
      
      // Generate sampleCount number of a low discrepancy random directions in the 
      // specular lobe and add the environment map data into a weighted sum.
      for(int i = 0; i < sampleCount; i++){
    
        // Low discrepancy random point in uniform square
        vec2 Xi = hammersley(i, sampleCount);
        // Halfway vector
        vec3 H = importanceSampleGGX(Xi, N, roughness);
        // Light vector
        vec3 L = normalize(reflect(-V, H));

        float NdotL = dot(N, L);
        if(NdotL > 0.0){

          float level = 0.0;

          // Sample the mip levels of the environment map
          // https://placeholderart.wordpress.com/2015/07/28/implementation-notes-runtime-environment-map-filtering-for-image-based-lighting/
          // Vectors to evaluate pdf
          float NdotH = dot(N, H);
          float VdotH = dot(V, H);

          float pdf = distribution(NdotH, roughness * roughness) * NdotH / (4.0 * VdotH);

          // Solid angle represented by this sample
          float omegaS = 1.0 / (float(sampleCount) * pdf);

          float envMapSize = 512.0;
          // Solid angle covered by 1 pixel
          float omegaP = 4.0 * PI / (6.0 * envMapSize * envMapSize);
          // Original paper suggests biasing the mip to improve the results
          float mipBias = 1.0;
          level = max(0.5 * log2(omegaS / omegaP) + mipBias, 0.0);

          prefilteredColor += textureLod(environmentCubeMap, L, level).rgb * NdotL;
          totalWeight      += NdotL;
        }
      }

      if(totalWeight > 0.0){
        prefilteredColor = prefilteredColor / totalWeight;
      }

      return prefilteredColor;
    }

    void main(){
      vec3 rayDir = normalize(vec3(vPosition.rg, -1.0));
      rayDir = normalize((cameraMatrix * vec4(rayDir, 1.0)).xyz);
      fragColor = vec4(getPreFilteredColor(rayDir, roughness), 1.0);
    }
    `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
