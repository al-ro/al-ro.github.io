function getVertexSource(){ 

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
#extension GL_EXT_shader_texture_lod : enable
    precision highp float;
    
    #define PI 3.14159
    
    uniform samplerCube cubeMap;
    uniform mat4 cameraMatrix;
    uniform float roughness;
    varying vec3 vPosition;

    const int sampleCount = 1024;

    const float minDot = 1e-5;

    // Clamped dot product
    float dot_c(vec3 a, vec3 b){
      return max(dot(a, b), minDot);
    }

    // Get orthonormal basis from surface normal
    // https://graphics.pixar.com/library/OrthonormalB/paper.pdf
    void pixarONB(vec3 n, out vec3 b1, out vec3 b2){
      float sign_ = sign(n.z);
      float a = -1.0 / (sign_ + n.z);
      float b = n.x * n.y * a;
      b1 = vec3(1.0 + sign_ * n.x * n.x * a, sign_ * b, -sign_ * n.x);
      b2 = vec3(b, sign_ + n.y * n.y * a, -n.y);
    }

    //https://patapom.com/blog/Math/ImportanceSampling/
    //https://www.shadertoy.com/view/4dtBWH
    vec2 Nth_weyl(vec2 p0, int n) {

      //return fract(p0 + float(n)*vec2(0.754877669, 0.569840296));
      return fract(p0 + vec2(n*12664745, n*9560333)/exp2(24.));	// integer mul to avoid round-off
    }

    // -------------------------------------------------------------------------------

    //  Return a world space sample vector based on a random hemisphere point, the surface normal
    //  and the roughness of the surface.
    //  https://google.github.io/filament/Filament.html#annex/choosingimportantdirectionsforsamplingthebrdf
  
    vec3 importanceSampleGGX(vec2 randomHemisphere, vec3 N, float roughness){
      float a = roughness*roughness;
  
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

    vec3 getPreFilteredColour(vec3 N, float roughness){
      vec3 R = N;
      vec3 V = R;

      float totalWeight = 0.0;
      vec3 prefilteredColor = vec3(0.0);    

      //Generate sampleCount number of a low discrepancy random directions in the 
      //specular lobe and add the environment map data into a weighted sum.
      for(int i = 0; i < sampleCount; i++){

	vec2 randomHemisphere = Nth_weyl(vec2(0.0), i);
	vec3 H  = importanceSampleGGX(randomHemisphere, N, roughness);
	vec3 L  = normalize(2.0 * dot(V, H) * H - V);

	float NdotL = dot_c(N, L);
	if(NdotL > 0.0){
	  prefilteredColor += textureCubeLodEXT(cubeMap, L, 0.0).rgb * NdotL;
	  totalWeight      += NdotL;
	}
      }
      prefilteredColor = prefilteredColor / totalWeight;

      return prefilteredColor;
    }

    void main(){
      vec3 rayDir = normalize(vec3(vPosition.rg, -1.0));
      rayDir = normalize((cameraMatrix * vec4(rayDir, 1.0)).xyz);
      vec3 c = getPreFilteredColour(rayDir, roughness);
  
      gl_FragColor = vec4(c, 1.0);
    }
  `;
  
  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
