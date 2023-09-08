import { getMorphedAttributeString } from "../shader.js"

function getVertexSource(parameters) {

  var vertexSource = `

  in vec3 POSITION;

#ifdef HAS_NORMALS
  in vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

#ifdef HAS_UV_0
  in vec2 TEXCOORD_0;
#endif

#ifdef HAS_UV_1
  in vec2 TEXCOORD_1;
#endif

layout(std140) uniform cameraMatrices{
    mat4 viewMatrix;
    mat4 projectionMatrix;
};

  uniform mat4 modelMatrix;

#ifdef HAS_NORMALS
  out vec3 vNormal;
#endif

#ifdef HAS_UV_0
  out vec2 vUV0;
#endif

#ifdef HAS_UV_1
  out vec2 vUV1;
#endif

#ifdef HAS_TANGENTS
  in vec4 TANGENT;
  out mat3 tbn;
#endif

  out vec3  vPosition;

  void main(){

#ifdef HAS_UV_0
    vUV0 = TEXCOORD_0;
#endif

#ifdef HAS_UV_1
    vUV1 = TEXCOORD_1;
#endif

#ifdef HAS_NORMALS
    `+ getMorphedAttributeString(parameters, "NORMAL") + `
    vec4 transformedNormal = normalMatrix * vec4(normal, 0.0);
    vNormal = transformedNormal.xyz;
#endif

#ifdef HAS_TANGENTS
    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    vec3 N = normalize(vec3(transformedNormal));
    `+ getMorphedAttributeString(parameters, "TANGENT") + `
    vec3 T = normalize(vec3(normalMatrix * vec4(tangent.xyz, 0.0)));
    T = normalize(T - dot(T, N) * N);
    vec3 B = normalize(cross(N, T)) * TANGENT.w;
    tbn = mat3(T, B, N);
#endif 

    `+ getMorphedAttributeString(parameters, "POSITION") + `
    vec4 transformedPosition = modelMatrix * vec4(position, 1.0);
    vPosition = transformedPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * transformedPosition;
  }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = `

  out vec4 fragColor;

#define PI 3.14159
#define TWO_PI (2.0 * PI)
#define HALF_PI (0.5 * PI)

  in vec3 vPosition;

#ifdef HAS_NORMALS
  in vec3 vNormal;
#endif

#ifdef HAS_UV_0
  in vec2 vUV0;
#endif

#ifdef HAS_UV_1
  in vec2 vUV1;
#endif

#ifdef HAS_TANGENTS
  in mat3 tbn;
#endif

#define DEBUG
#ifdef DEBUG
  uniform int outputVariable;
#endif

layout(std140) uniform cameraUniforms{
  vec3 cameraPosition;
  float cameraExposure;
};

layout(std140) uniform sphericalHarmonicsUniforms{
  uniform mat4 shRedMatrix;
  uniform mat4 shGrnMatrix;
  uniform mat4 shBluMatrix;
};

  uniform float time;

  uniform sampler2D brdfIntegrationMapTexture;
  uniform samplerCube cubeMap;

#ifdef HAS_BASE_COLOR_TEXTURE
  uniform sampler2D baseColorTexture;
  uniform int baseColorTextureUV;
#endif
  
  uniform vec4 baseColorFactor;

#ifdef HAS_NORMAL_TEXTURE
  uniform sampler2D normalTexture;
  uniform int normalTextureUV;
  uniform float normalScale;
#endif

#ifdef HAS_EMISSION
#ifdef HAS_EMISSIVE_TEXTURE
  uniform sampler2D emissiveTexture;
  uniform int emissiveTextureUV;
#endif

#ifdef HAS_EMISSIVE_FACTOR
  uniform vec3 emissiveFactor;
#endif
#endif

#ifdef HAS_TRANSMISSION
  uniform sampler2D backgroundTexture;
#ifdef HAS_TRANSMISSION_TEXTURE
  uniform sampler2D transmissionTexture;
  uniform int transmissionTextureUV;
#endif

#ifdef HAS_TRANSMISSION_FACTOR
  uniform float transmissionFactor;
#endif
#endif

#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
  uniform sampler2D metallicRoughnessTexture;
  uniform int metallicRoughnessTextureUV;
#endif

  uniform float metallicFactor;
  uniform float roughnessFactor;

#ifdef HAS_AO_TEXTURE
  uniform sampler2D occlusionTexture;
  uniform int occlusionTextureUV;
  uniform float occlusionStrength;
#endif

#ifdef AO_IN_METALLIC_ROUGHNESS_TEXTURE
  uniform float occlusionStrength;
#endif

  uniform int alphaMode;
  uniform float alphaCutoff;

  uniform float IOR;


  // ------------------------- Utility -------------------------

  /*
    Normal mapping will lead to an impossible surface where the view ray and normal dot product
    is negative. Using PBR, this leads to negative radiance and black artefacts at detail 
    fringes. See "Microfacet-based Normal Mapping for Robust Monte Carlo Path Tracing" by 
    Schüssler et al. for a discussion of a physically correct solution. 
    We just clamp the dot product with a normal to some small value.
  */
  const float minDot = 1e-5;

  // Clamped dot product
  float dot_c(vec3 a, vec3 b){
    return max(dot(a, b), minDot);
  }

  float dot_c(vec4 a, vec4 b){
    return max(dot(a, b), minDot);
  }

  float saturate(float x){
    return max(0.0, min(x, 1.0));
  }

  vec3 saturate(vec3 x){
    return max(vec3(0), min(x, vec3(1)));
  }

#if defined(HAS_UV_0) || defined(HAS_UV_1)

  // Helper function for multiple UV attributes
  vec4 readTexture(sampler2D tex, int uv){
    vec2 vUV;

#if defined(HAS_UV_0) && defined(HAS_UV_1)
    vUV = uv == 0 ? vUV0 : vUV1;
#elif defined(HAS_UV_0)
    vUV = vUV0;
#else
    vUV = vUV1;
#endif

    return texture(tex, vUV);
  }

#endif

  // ------------------------- Environment -------------------------

  vec3 getSHIrradiance(vec3 normal){

    vec4 n = vec4(normal, 1.0);

    float r = dot(n, shRedMatrix * n);
    float g = dot(n, shGrnMatrix * n);
    float b = dot(n, shBluMatrix * n);

    return max(vec3(r, g, b), vec3(0));
  }

  vec2 getBRDFIntegrationMap(vec2 texCoord){
    return texture(brdfIntegrationMapTexture, texCoord).rg;
  }

  vec3 getEnvironment(vec3 rayDir, float roughness){

    // There are 6 levels of roughness (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)
    float level = roughness * 5.0;
    level = max(0.0, min(level, 5.0));

    return textureLod(cubeMap, rayDir, level).rgb;
  }

#ifdef HAS_TRANSMISSION

//---------------------------- Transmission ----------------------------
/*
  https://developer.download.nvidia.com/SDK/9.5/Samples/DEMOS/OpenGL/src/fast_third_order/docs/Gems2_ch20_SDK.pdf
  https://0xef.wordpress.com/2013/01/12/third-order-texture-filtering-using-linear-interpolation/
  https://www.shadertoy.com/view/Dl2SDW
*/

  // Cubic B-spline weighting
  vec2 w0(vec2 a){
      return (1.0/6.0)*(a*(a*(-a + 3.0) - 3.0) + 1.0);
  }

  vec2 w1(vec2 a){
      return (1.0/6.0)*(a*a*(3.0*a - 6.0) + 4.0);
  }

  vec2 w2(vec2 a){
      return (1.0/6.0)*(a*(a*(-3.0*a + 3.0) + 3.0) + 1.0);
  }

  vec2 w3(vec2 a){
      return (1.0/6.0)*(a*a*a);
  }

  // g0 is the amplitude function
  vec2 g0(vec2 a){
      return w0(a) + w1(a);
  }

  // h0 and h1 are the two offset functions
  vec2 h0(vec2 a){
      return -1.0 + w1(a) / (w0(a) + w1(a));
  }

  vec2 h1(vec2 a){
      return 1.0 + w3(a) / (w2(a) + w3(a));
  }

  vec4 bicubic(sampler2D tex, vec2 uv, vec2 textureLodSize, float lod){
    
    uv = uv * textureLodSize + 0.5;
      
    vec2 iuv = floor(uv);
    vec2 f = fract(uv);

    // Find offset in texel
    vec2 h0 = h0(f);
    vec2 h1 = h1(f);

    // Four sample points
    vec2 p0 = (iuv + h0 - 0.5) / textureLodSize;
    vec2 p1 = (iuv + vec2(h1.x, h0.y) - 0.5) / textureLodSize;
    vec2 p2 = (iuv + vec2(h0.x, h1.y) - 0.5) / textureLodSize;
    vec2 p3 = (iuv + h1 - 0.5) / textureLodSize;
    
    // Weighted linear interpolation
    // g0 + g1 = 1 so only one is needed for a mix
    vec2 g0 = g0(f);
    return mix( mix(textureLod(tex, p3, lod), textureLod(tex, p2, lod), g0.x),
                mix(textureLod(tex, p1, lod), textureLod(tex, p0, lod), g0.x), g0.y);
  }

  vec4 textureBicubic(sampler2D s, vec2 uv, float lod) {

    vec2 lodSizeFloor = vec2(textureSize(s, int(lod)));
    vec2 lodSizeCeil = vec2(textureSize(s, int(lod + 1.0)));

    vec4 floorSample = bicubic(s, uv, lodSizeFloor.xy, floor(lod));
    vec4 ceilSample = bicubic(s, uv, lodSizeCeil.xy, ceil(lod));

    return mix(floorSample, ceilSample, fract(lod));
  }

  vec4 getRoughTransmission(sampler2D s, vec2 uv, float roughness){
    if(roughness == 0.0){
      return texture(s, uv);
    }
    vec2 size = vec2(textureSize(s, 0).xy);
    float maxLod = floor(log2(min(size.x, size.y)));

    // Should this be roughness^2 ?
    float lod = mix(0.0, maxLod-1.0, roughness);
    
    return textureBicubic(s, uv, lod);
  }

  vec3 getBackground(float roughness){
    vec2 uv = gl_FragCoord.xy / vec2(textureSize(backgroundTexture, 0));
    return pow(getRoughTransmission(backgroundTexture, uv, roughness).rgb, vec3(2.2));
  }
#endif


  // ---------------------------- PBR ----------------------------

  // Trowbridge-Reitz
  float distribution(vec3 n, vec3 h, float roughness){
    float a2 = roughness * roughness;
    return a2 / (PI * pow(pow(dot_c(n, h), 2.0) * (a2 - 1.0) + 1.0, 2.0));
  }

  // GGX and Schlick-Beckmann
  float geometry(float cosTheta, float k){
    return cosTheta / (cosTheta * (1.0 - k) + k);
  }

  float smiths(vec3 n, vec3 viewDir, vec3 lightDir, float roughness){
    float k = pow(roughness + 1.0, 2.0) / 8.0; 
    return geometry(dot_c(n, lightDir), k) * geometry(dot_c(n, viewDir), k);
  }

  // Anisotropic distribution and visibility functions from Filament
  // GGX
  float distributionAnisotropic(float NoH, vec3 h, vec3 t, vec3 b, float at, float ab) {
    float ToH = dot(t, h);
    float BoH = dot(b, h);
    float a2 = at * ab;
    vec3 v = vec3(ab * ToH, at * BoH, a2 * NoH);
    float v2 = dot(v, v);
    float w2 = a2 / v2;
    return a2 * w2 * w2 * (1.0 / PI);
  }

  // Smiths GGX correlated anisotropic
  float smithsAnisotropic(float at, float ab, float ToV, float BoV, float ToL, float BoL, float NoV, float NoL) {
    float lambdaV = NoL * length(vec3(at * ToV, ab * BoV, NoV));
    float lambdaL = NoV * length(vec3(at * ToL, ab * BoL, NoL));
    float v = 0.5 / (lambdaV + lambdaL);
    return saturate(v);
  }

  // Fresnel-Schlick
  vec3 fresnel(float cosTheta, vec3 F0){
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  } 

  vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness){
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
  }

  // Lambertian
  vec3 diffuseBRDF(vec3 albedo){
    return albedo / PI;
  }

  // Cook-Torrance BRDF
  float specularBRDF(vec3 n, vec3 viewDir, vec3 lightDir, vec3 h, float roughness){

    // Normal distribution
    // What fraction of microfacets are aligned in the correct direction
    float D;

    // Geometry term
    // What fraction of the microfacets are lit and visible
    float G;

    // Visibility term. 
    // In Filament it combines the geometry term and the denominator
    float V;

    D = distribution(n, h, roughness);
    G = smiths(n, viewDir, lightDir, roughness);
    V = G / max(0.0001, (4.0 * dot_c(lightDir, n) * dot_c(viewDir, n)));

    return D * V;
  }

  // ---------------------------- Lighting ----------------------------

  vec3 getIrradiance(vec3 rayDir, vec3 normal, vec4 albedo){

    float metal = metallicFactor;
    float roughness = roughnessFactor;

#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
    vec3 data = readTexture(metallicRoughnessTexture, metallicRoughnessTextureUV).rgb;
    roughness *= data.g;
    metal *= data.b; 
#endif

    float occlusion = 1.0;

#ifdef HAS_AO_TEXTURE
    occlusion = readTexture(occlusionTexture, occlusionTextureUV).r;
    occlusion = 1.0 + occlusionStrength * (occlusion - 1.0);
#else

#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
#ifdef AO_IN_METALLIC_ROUGHNESS_TEXTURE
    occlusion = data.r;
    occlusion = 1.0 + occlusionStrength * (occlusion - 1.0);
#endif
#endif

#endif

    vec3 I = vec3(0);
    vec3 radiance = vec3(0);
    vec3 lightDir = vec3(0);

    // Reflectance of the surface when looking straight at it along the negative normal
    vec3 F0 = vec3(pow(IOR - 1.0, 2.0) / pow(IOR + 1.0, 2.0));

    // Metals tint specular reflections.
    // https://docs.unrealengine.com/en-US/RenderingAndGraphics/Materials/PhysicallyBased/index.html 
    F0 = mix(F0, albedo.rgb, metal);

    lightDir = normalize(vec3(sin(time), 0.5, cos(time)));

    vec2 envBRDF = getBRDFIntegrationMap(vec2(dot_c(normal, -rayDir), roughness));
    // https://google.github.io/filament/Filament.html#materialsystem/improvingthebrdfs/energylossinspecularreflectance
    vec3 energyCompensation = 1.0 + F0 * (1.0 / envBRDF.y - 1.0);

    vec3 h = normalize(-rayDir + lightDir);
    float cosTheta = dot_c(h, -rayDir);

    // How reflective are the microfacets viewed from the current angle
    vec3 F = fresnelSchlickRoughness(cosTheta, F0, roughness);

    // Specular reflectance
    vec3 specular = F * specularBRDF(normal, -rayDir, lightDir, h, roughness); 

    // Scale the specular lobe to account for multiscattering
    specular *= energyCompensation;

    vec3 diffuse = diffuseBRDF(albedo.rgb);

#ifdef HAS_TRANSMISSION
    vec3 transmitted = vec3(0);
    float transmission = 1.0;
#ifdef HAS_TRANSMISSION_FACTOR
    transmission = transmissionFactor;
#endif

#ifdef HAS_TRANSMISSION_TEXTURE
    transmission *= readTexture(transmissionTexture, transmissionTextureUV).r;
#endif

    diffuse = mix(diffuse, transmitted, transmission);
#endif

    // Combine diffuse and specular
    vec3 kD = (1.0 - F) * (1.0 - metal);
    vec3 direct = kD * diffuse + specular;

    I += direct * radiance * dot_c(normal, lightDir);

    // Find ambient diffuse IBL component
    F = fresnelSchlickRoughness(dot_c(normal, -rayDir), F0, roughness);
    kD = saturate(1.0 - F) * (1.0 - metal);	
    vec3 irradiance = getSHIrradiance(normal);
    diffuse = irradiance * albedo.rgb / PI;

#ifdef HAS_TRANSMISSION
    transmitted = albedo.rgb * getBackground(roughness);
    diffuse = mix(diffuse, transmitted, transmission);
#endif

    // Find ambient specular IBL component
    vec3 R = reflect(rayDir, normal);

    vec3 prefilteredColor = getEnvironment(R, roughness);   
    specular = prefilteredColor * mix(envBRDF.xxx, envBRDF.yyy, F0);

    // Scale the specular lobe to account for multiscattering
    specular *= energyCompensation;

    vec3 ambient = kD * diffuse + specular;

    // Combine direct and IBL lighting
    return  occlusion * ambient + I;
  }


  // ------------------------- Tonemapping -------------------------

  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 ACESFilm(vec3 x){
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }


  // --------------------------- Render ----------------------------

  void main(){

    vec3 geometryNormal;
#ifdef HAS_NORMALS
    geometryNormal = normalize(vNormal);
#else
    geometryNormal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
#endif

#ifdef HAS_NORMAL_TEXTURE
    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    // Transform RGB normal map data from [0, 1] to [-1, 1]
    vec3 normalColor = normalize(vec3(vec2(normalScale), 1.0) * (readTexture(normalTexture, normalTextureUV).rgb * 2.0 - 1.0));
#ifndef HAS_TANGENTS

    vec2 tangentUV;
#if defined(HAS_UV_0) && defined(HAS_UV_1)
    tangentUV = normalTextureUV == 0 ? vUV0 : vUV1;
#elif defined(HAS_UV_0)
    tangentUV = vUV0;
#else
    tangentUV = vUV1;
#endif

    vec3 uv_dx = dFdx(vec3(tangentUV, 0.0));
    vec3 uv_dy = dFdy(vec3(tangentUV, 0.0));

    vec3 t_ = (uv_dy.t * dFdx(vPosition) - uv_dx.t * dFdy(vPosition)) / (uv_dx.s * uv_dy.t - uv_dy.s * uv_dx.t);
    vec3 T = normalize(t_ - geometryNormal * dot(geometryNormal, t_));
    vec3 B = normalize(cross(geometryNormal, T));

    mat3 tbn = mat3(T, B, geometryNormal);

#endif
    // Transform the normal vector in the RGB channels to tangent space
    vec3 normal = normalize(tbn * normalColor.rgb);
#else
    vec3 normal = geometryNormal;
#endif

    if(!gl_FrontFacing){
      normal *= -1.0;
    }

    float alpha = 1.0;

#ifdef HAS_BASE_COLOR_TEXTURE
    vec4 colorData = readTexture(baseColorTexture, baseColorTextureUV);
    vec4 albedo = baseColorFactor * vec4(vec3(pow(colorData.rgb, vec3(2.2))), colorData.a);
#else
    vec4 albedo = baseColorFactor;
#endif

    vec4 color = vec4(0);

    if(alphaMode != 0){
      alpha = albedo.a;
    }

    if(alphaMode == 2 && alpha < alphaCutoff){
      discard;
    }

    vec3 viewDirection = normalize(cameraPosition - vPosition);
    color.rgb = getIrradiance(-viewDirection, normal, albedo);
    color.a = alpha;

#ifdef HAS_EMISSION
    vec3 emissiveColor = vec3(1);
#ifdef HAS_EMISSIVE_TEXTURE
    vec3 emissiveData = readTexture(emissiveTexture, emissiveTextureUV).rgb;
    emissiveColor = pow(emissiveData, vec3(2.2));
#endif
#ifdef HAS_EMISSIVE_FACTOR
    emissiveColor *= emissiveFactor;
#endif
    
    color.rgb += emissiveColor.rgb;
#endif

    color.rgb *= cameraExposure;  

    color.rgb = ACESFilm(color.rgb);
    color.rgb = pow(color.rgb, vec3(0.4545));

    if(alphaMode == 1){
      color.rgb *= alpha;
    }

    fragColor = color;

  // ------------------------- Debug -------------------------

#ifdef DEBUG
  if(outputVariable > 0){
    // Magenta for missing data
    vec3 debugColor = vec3(1, 0, 1);

    float metal = metallicFactor;
    float roughness = roughnessFactor;

  #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
      vec3 data = readTexture(metallicRoughnessTexture, metallicRoughnessTextureUV).rgb;
      roughness *= data.g;
      metal *= data.b; 
  #endif

      float occlusion = 1.0;

  #ifdef HAS_AO_TEXTURE
      occlusion = readTexture(occlusionTexture, occlusionTextureUV).r;
      occlusion = 1.0 + occlusionStrength * (occlusion - 1.0);
  #else

  #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
  #ifdef AO_IN_METALLIC_ROUGHNESS_TEXTURE
      occlusion = data.r;
      occlusion = 1.0 + occlusionStrength * (occlusion - 1.0);
  #endif
  #endif

  #endif

  #ifdef HAS_EMISSION
      emissiveColor = vec3(1);
  #ifdef HAS_EMISSIVE_TEXTURE
      emissiveColor = readTexture(emissiveTexture, emissiveTextureUV).rgb;
  #endif
  #ifdef HAS_EMISSIVE_FACTOR
      emissiveColor *= emissiveFactor;
  #endif
  #else
      vec3 emissiveColor = debugColor;
  #endif

      vec3 transmissiveColor = debugColor;
  #ifdef HAS_TRANSMISSION
      float transmission = 1.0;
  #ifdef HAS_TRANSMISSION_FACTOR
      transmission = transmissionFactor;
  #endif

  #ifdef HAS_TRANSMISSION_TEXTURE
      transmission *= readTexture(transmissionTexture, transmissionTextureUV).r;
  #endif
      transmissiveColor = vec3(transmission);
  #endif

      vec3 uvColor0 = debugColor;
  #ifdef HAS_UV_0
      uvColor0 = vec3(vUV0, 0.0);
  #endif

      vec3 uvColor1 = debugColor;
  #ifdef HAS_UV_1
      uvColor1 = vec3(vUV1, 0.0);
  #endif

  vec3 tangentColor = debugColor;
  vec3 bitangentColor = debugColor;

  #ifdef HAS_NORMAL_TEXTURE
      tangentColor = 0.5 + 0.5 * tbn[0];
      bitangentColor = 0.5 + 0.5 * tbn[1];
  #endif

      switch(outputVariable){
        case 1: debugColor = pow(albedo.rgb, vec3(0.4545)); break;
        case 2: debugColor = vec3(metal); break;
        case 3: debugColor = vec3(roughness); break;
        case 4: debugColor = 0.5 + 0.5 * geometryNormal; break;
        case 5: debugColor = 0.5 + 0.5 * normal; break;
        case 6: debugColor = tangentColor; break;
        case 7: debugColor = bitangentColor; break;
        case 8: debugColor = vec3(occlusion); break;
        case 9: debugColor = emissiveColor;; break;
        case 10: debugColor = uvColor0; break;
        case 11: debugColor = uvColor1; break;
        case 12: debugColor = vec3(alpha); break;
        case 13: debugColor = transmissiveColor; break;
        default: debugColor = vec3(1,0,1);
      };

      fragColor = vec4(debugColor, 1.0);
}
#endif
  }
  `;

  return fragmentSource;
}

export { getFragmentSource, getVertexSource };
