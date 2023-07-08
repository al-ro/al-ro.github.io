function getVertexSource(){ 

  var vertexSource = `

    in vec3 POSITION;
    out vec3 vPosition;

    void main(){ 
      vPosition = POSITION;
      gl_Position = vec4(POSITION, 1.0);
    }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
    
    
    #define PI 3.14159
    
    uniform samplerCube cubeMap;
    uniform mat4 cameraMatrix;
    uniform float roughness;

    in vec3 vPosition;
    out vec4 fragColor;

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

    //https://patapom.com/blog/Math/ImportanceSampling/
    //https://www.shadertoy.com/view/4dtBWH
    vec2 nthWeyl(vec2 p0, int n) {
      return fract(p0 + vec2(n * 12664745, n * 9560333) / exp2(24.0));
    }

    // -------------------------------------------------------------------------------

    //  Return a world space sample vector based on a random hemisphere point, the surface normal
    //  and the roughness of the surface.
    //  https://google.github.io/filament/Filament.html#annex/choosingimportantdirectionsforsamplingthebrdf

    vec3 importanceSampleGGX(vec2 randomHemisphere, vec3 N, float roughness){
      float a = roughness * roughness;

      float phi = 2.0 * PI * randomHemisphere.x;
      float cosTheta = sqrt((1.0 - randomHemisphere.y) / (1.0 + (a*a - 1.0) * randomHemisphere.y));
      float sinTheta = sqrt(1.0 - cosTheta*cosTheta);

      //From spherical coordinates to cartesian coordinates
      vec3 H = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);

      //From tangent-space vector to world-space sample vector
      vec3 tangent;
      vec3 bitangent;

      pixarONB(N, tangent, bitangent);

      tangent = normalize(tangent);
      bitangent = normalize(bitangent);

      vec3 sampleDir = tangent * H.x + bitangent * H.y + N * H.z;
      return normalize(sampleDir);
    }

    float D_GGX(float NoH, float roughness) {
      float a = NoH * roughness;
      float k = roughness / (1.0 - NoH * NoH + a * a);
      return k * k * (1.0 / PI);
    }

    vec3 getPreFilteredColor(vec3 N, float roughness){
      vec3 R = N;
      vec3 V = R;

      float totalWeight = 0.0;
      vec3 prefilteredColor = vec3(0.0);    

      //Generate sampleCount number of a low discrepancy random directions in the 
      //specular lobe and add the environment map data into a weighted sum.
      for(int i = 0; i < sampleCount; i++){

        vec2 randomHemisphere = nthWeyl(vec2(0.0), i);
        vec3 H  = importanceSampleGGX(randomHemisphere, N, roughness);
        vec3 L  = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = dot(N, L);
        if(NdotL > 0.0){

          float level = 0.0;

          // Sample the mip levels of the environment map
          // https://placeholderart.wordpress.com/2015/07/28/implementation-notes-runtime-environment-map-filtering-for-image-based-lighting/
          // Vectors to evaluate pdf
          float NdotH = dot(N, H);
          float VdotH = dot(V, H);

          // Probability distribution function
          float pdf = D_GGX(NdotH, roughness * roughness) * NdotH / (4.0 * VdotH);

          // Solid angle represented by this sample
          float omegaS = 1.0 / (float(sampleCount) * pdf);

          float envMapSize = 512.0;
          // Solid angle covered by 1 pixel
          float omegaP = 4.0 * PI / (6.0 * envMapSize * envMapSize);
          // Original paper suggests biasing the mip to improve the results
          float mipBias = 1.0;
          level = max(0.5 * log2(omegaS / omegaP) + mipBias, 0.0);

          prefilteredColor += textureLod(cubeMap, L, level).rgb * NdotL;
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
      vec3 c = getPreFilteredColor(rayDir, roughness);

      fragColor = vec4(c, 1.0);
    }
    `;

    return fragmentSource;
}

export {getVertexSource, getFragmentSource};
