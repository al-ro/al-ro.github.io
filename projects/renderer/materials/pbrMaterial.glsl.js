function getVertexSource(){ 

  var vertexSource = `

  attribute vec3 POSITION;

#ifdef INSTANCED 
  attribute vec4 orientation;
  attribute vec3 offset;
  attribute vec3 scale;
#endif

#ifdef HAS_NORMALS
  attribute vec3 NORMAL;
  uniform mat4 normalMatrix;
#endif

#ifdef HAS_UVS
  attribute vec2 TEXCOORD_0;
#endif


  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

#ifdef HAS_NORMALS
  varying vec3 vNormal;
#endif

#ifdef HAS_UVS
  varying vec2 vUV;
#endif

#ifdef HAS_TANGENTS
  attribute vec4 TANGENT;
  varying mat3 tbn;
#endif

  varying vec3  vPosition;

  //https://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
  vec3 rotateVectorByQuaternion(vec3 v, vec4 q){
    return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
  }

  void main(){

#ifdef HAS_UVS
    vUV = TEXCOORD_0;
#endif

#ifdef HAS_NORMALS
    vec4 transformedNormal;

#ifdef INSTANCED
    transformedNormal = normalMatrix * vec4(normalize(normalize(NORMAL)/scale), 0.0);
    transformedNormal.xyz = rotateVectorByQuaternion(transformedNormal.xyz, orientation);
#else
    transformedNormal = normalMatrix * vec4(NORMAL, 0.0);
#endif

    vNormal = transformedNormal.xyz;
#endif

#ifdef HAS_TANGENTS
    vec3 N = normalize(vec3(modelMatrix * vec4(NORMAL, 0.0)));
    //https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    //Create matrix to transform normal to tangent space i.e. transform static normal map data into the underlying triangle frame
    vec3 T = normalize(vec3(modelMatrix * vec4(TANGENT.xyz, 0.0)));
    //The triangle normal
    //Re-orthogonalize T with respect to N (for small optional correction)
    T = normalize(T - dot(T, N) * N);
    //The bitangent vector is perpendicular to N and T
    //The w value of the tangent is the "handedness"
    vec3 B = normalize(cross(N, T)) * TANGENT.w;
    //Create matrix from three vectors
    tbn = mat3(T, B, N);
#endif 

    vec4 pos;

#ifdef INSTANCED
    pos = modelMatrix * vec4(POSITION * scale, 1.0);
    pos.xyz = rotateVectorByQuaternion(pos.xyz, orientation);
    pos.xyz += offset; 
#else
    pos = modelMatrix * vec4(POSITION, 1.0);
#endif

    vPosition = pos.rgb;
    vPosition = vec3((modelMatrix * vec4(POSITION, 1.0)));

    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = pos;
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
#extension GL_EXT_shader_texture_lod : enable
#extension GL_OES_standard_derivatives : enable

  precision highp float;

#define PI 3.14159
#define TWO_PI (2.0 * PI)
#define HALF_PI (0.5 * PI)

#ifdef HAS_NORMALS
  varying vec3 vNormal;
#endif

  uniform float exposure;
  uniform float time;
  uniform vec3 cameraPosition;
  varying vec3 vPosition;

#ifdef HAS_UVS
  varying vec2 vUV;
#endif

  uniform sampler2D brdfIntegrationMapTexture;
  uniform samplerCube cubeMap;

#ifdef HAS_BASE_COLOR_TEXTURE
  uniform sampler2D baseColorTexture;
#endif
  
  uniform vec4 baseColorFactor;

#ifdef HAS_NORMAL_TEXTURE
  uniform sampler2D normalTexture;
  uniform float normalScale;
#endif

#ifdef HAS_TANGENTS
  varying mat3 tbn;
#endif

#ifdef HAS_EMISSIVE_TEXTURE
  uniform sampler2D emissiveTexture;
  uniform vec3 emissiveFactor;
#endif

#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
  uniform sampler2D metallicRoughnessTexture;
#endif

  uniform float metallicFactor;
  uniform float roughnessFactor;

#ifdef HAS_AO_TEXTURE
  uniform sampler2D occlusionTexture;
  uniform float occlusionStrength;
#endif

#ifdef AO_IN_METALLIC_ROUGHNESS_TEXTURE
  uniform float occlusionStrength;
#endif

  uniform mat4 shRedMatrix;
  uniform mat4 shGrnMatrix;
  uniform mat4 shBluMatrix;

  uniform int alphaMode;
  uniform float alphaCutoff;

  // Normal mapping will lead to an impossible surface where the view ray and normal dot product
  // is negative. Using PBR, this leads to negative radiance and black artefacts at detail 
  // fringes. See "Microfacet-based Normal Mapping for Robust Monte Carlo Path Tracing" by 
  // Schüssler et al. for a discussion of a physically correct solution. 
  // We just clamp the dot product with a normal to some small value.
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

  vec3 getSHIrradiance(vec3 normal){

    vec4 n = vec4(normal, 1.0);

    float r = dot(n, shRedMatrix * n);
    float g = dot(n, shGrnMatrix * n);
    float b = dot(n, shBluMatrix * n);

    return max(vec3(r, g, b), vec3(0));
  }

  vec2 getBRDFIntegrationMap(vec2 texCoord){
    return texture2D(brdfIntegrationMapTexture, texCoord).rg;
  }

  // Get two prefiltered roughness environment maps and linearly interpolate
  // between them to get the roughness data needed.
  vec3 getEnvironment(vec3 rayDir, float roughness){

    //There are 6 levels of roughness (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)
    float level = roughness * 5.0;
    level = max(0.0, min(level, 5.0));

    vec3 col = textureCubeLodEXT(cubeMap, rayDir, level).rgb;
    return col;
  }


  //---------------------------- PBR ----------------------------

  //Trowbridge-Reitz
  float distribution(vec3 n, vec3 h, float roughness){
    float a2 = roughness * roughness;
    return a2 / (PI * pow(pow(dot_c(n, h), 2.0) * (a2 - 1.0) + 1.0, 2.0));
  }

  //GGX and Schlick-Beckmann
  float geometry(float cosTheta, float k){
    return cosTheta / (cosTheta * (1.0 - k) + k);
  }

  float smiths(vec3 n, vec3 viewDir, vec3 lightDir, float roughness){
    float k = pow(roughness + 1.0, 2.0) / 8.0; 
    return geometry(dot_c(n, lightDir), k) * geometry(dot_c(n, viewDir), k);
  }

  //Anisotropic distribution and visibility functions from Filament
  //GGX
  float distributionAnisotropic(float NoH, vec3 h, vec3 t, vec3 b, float at, float ab) {
    float ToH = dot(t, h);
    float BoH = dot(b, h);
    float a2 = at * ab;
    vec3 v = vec3(ab * ToH, at * BoH, a2 * NoH);
    float v2 = dot(v, v);
    float w2 = a2 / v2;
    return a2 * w2 * w2 * (1.0 / PI);
  }

  //Smiths GGX correlated anisotropic
  float smithsAnisotropic(float at, float ab, float ToV, float BoV, float ToL, float BoL, float NoV, float NoL) {
    float lambdaV = NoL * length(vec3(at * ToV, ab * BoV, NoV));
    float lambdaL = NoV * length(vec3(at * ToL, ab * BoL, NoL));
    float v = 0.5 / (lambdaV + lambdaL);
    return saturate(v);
  }

  //Fresnel-Schlick
  vec3 fresnel(float cosTheta, vec3 F0){
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  } 

  vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness){
    return F0 + (max(vec3(1.0-roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
  }

  //Cook-Torrance BRDF
  vec3 BRDF(vec3 n, vec3 viewDir, vec3 lightDir, vec4 albedo, float metalness, 
      float roughness, vec3 F0, vec3 energyCompensation){

    vec3 h = normalize(viewDir + lightDir);
    float cosTheta = dot_c(h, viewDir);

    //Diffuse reflectance
    vec3 lambertian = albedo.rgb / PI;

    //Normal distribution
    //What fraction of microfacets are aligned in the correct direction
    float D;

    //Fresnel term
    //How reflective are the microfacets viewed from the current angle
    vec3 F = fresnelSchlickRoughness(cosTheta, F0, roughness);

    //Geometry term
    //What fraction of the microfacets are lit and visible
    float G;

    //Visibility term. 
    //In Filament it combines the geometry term and the denominator
    float V;

    D = distribution(n, h, roughness);
    G = smiths(n, viewDir, lightDir, roughness);
    V = G / max(0.0001, (4.0 * dot_c(lightDir, n) * dot_c(viewDir, n)));

    //Specular reflectance
    vec3 specular = D * F * V;

    specular *= energyCompensation;

    //Combine diffuse and specular
    vec3 kD = (1.0 - F) * (1.0 - metalness);
    return kD * lambertian + specular;
  }

  //---------------------------- Lighting ----------------------------

  vec3 getIrradiance(vec3 rayDir, vec3 normal, vec4 albedo){

    float metal = metallicFactor;
    float roughness = roughnessFactor;

#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
    vec3 data = texture2D(metallicRoughnessTexture, vUV).rgb;
    roughness *= data.g;
    metal *= data.b; 
#endif 

    float occlusion = 1.0;

#ifdef HAS_AO_TEXTURE
    occlusion = texture2D(occlusionTexture, vUV).r;
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
    vec3 radiance = vec3(1);
    vec3 lightDir = vec3(0);

    vec3 F0 = vec3(0.04);

    //Metals tint specular reflections.
    //https://docs.unrealengine.com/en-US/RenderingAndGraphics/Materials/PhysicallyBased/index.html
    vec3 tintColour = albedo.rgb;
    
    F0 = mix(F0, tintColour, metal);

    // Find direct lighting for all sources
    lightDir = normalize(vec3(sin(time), 0.5, cos(time)));

    vec2 envBRDF  = getBRDFIntegrationMap(vec2(dot_c(normal, -rayDir), roughness));
    //https://google.github.io/filament/Filament.html#materialsystem/improvingthebrdfs/energylossinspecularreflectance
    vec3 energyCompensation = 1.0 + F0 * (1.0 / envBRDF.x - 1.0);

    I += BRDF(normal, -rayDir, lightDir, albedo, metal, roughness, F0, energyCompensation) 
      * radiance 
      * dot_c(normal, lightDir);

    // Find ambient diffuse IBL component

    vec3 F = fresnelSchlickRoughness(dot_c(normal, -rayDir), F0, roughness);
    vec3 kS = F;
    vec3 kD = clamp(1.0-kS, 0.0, 1.0);
    kD *= 1.0 - metal;	
    vec3 irradiance = getSHIrradiance(normal);
    vec3 diffuse = irradiance * albedo.rgb / PI;

    vec3 R;
    R = reflect(rayDir, normal);

    vec3 prefilteredColor = getEnvironment(R, roughness);   
    vec3 specular = prefilteredColor * (F * envBRDF.x + envBRDF.y);

    // Scale the specular lobe to account for multiscattering
    specular *= energyCompensation;

    vec3 ambient = kD * diffuse + specular;

    // Combine direct and IBL lighting
    return  occlusion * ambient + I;
  }

  //https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 ACESFilm(vec3 x){
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
  }

  void main(){

    vec3 geometryNormal;
#ifdef HAS_NORMALS
    geometryNormal = vNormal;
#else
    geometryNormal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
#endif

#ifdef HAS_NORMAL_TEXTURE
    //https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    //Transform RGB normal map data from [0, 1] to [-1, 1]
    vec3 normalColour = normalize(vec3(vec2(normalScale), 1.0) * (texture2D(normalTexture, vUV).rgb * 2.0 - 1.0));
#ifdef HAS_TANGENTS
    // Transform the normal vector in the RGB channels to tangent space
    vec3 normal = normalize(tbn * normalColour.rgb);
#else

    vec3 uv_dx = dFdx(vec3(vUV, 0.0));
    vec3 uv_dy = dFdy(vec3(vUV, 0.0));

    vec3 t_ = (uv_dy.t * dFdx(vPosition) - uv_dx.t * dFdy(vPosition)) /
      (uv_dx.s * uv_dy.t - uv_dy.s * uv_dx.t);
    vec3 T = normalize(t_ - geometryNormal * dot(geometryNormal, t_));
    vec3 B = cross(geometryNormal, T);

    vec3 normal = normalize(mat3(T,B,geometryNormal) * normalColour.rgb);
#endif
#else
    vec3 normal = normalize(geometryNormal);
#endif

    if(!gl_FrontFacing){
      normal *= -1.0;
    }

    float alpha = 1.0;

#ifdef HAS_BASE_COLOR_TEXTURE
    vec4 data = texture2D(baseColorTexture, vUV);
    vec4 col = baseColorFactor * vec4(vec3(pow(data.rgb, vec3(2.2))), data.a);
#else
    vec4 col = baseColorFactor;
#endif

    if(alphaMode != 0){
      alpha = col.a;
    }

    if(alphaMode == 2 && alpha < alphaCutoff){
      discard;
    }


    vec3 viewDirection = normalize(cameraPosition - vPosition);
    col.rgb = getIrradiance(-viewDirection, normal, col);

#ifdef HAS_EMISSIVE_TEXTURE
    vec4 emissiveData = texture2D(emissiveTexture, vUV);
    vec3 emissiveCol = emissiveFactor * pow(emissiveData.rgb, vec3(2.2));
    col.rgb += emissiveCol.rgb;
#endif

    col.rgb *= exposure;  

    col.rgb = ACESFilm(col.rgb);
    col.rgb = pow(col.rgb, vec3(0.4545));

//#define DEBUG
#ifdef DEBUG
    float occlusion = 1.0;
#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
    vec3 data_ = texture2D(metallicRoughnessTexture, vUV).rgb;
    float roughness = data_.g;
    float metal = data_.b;

    //col = vec3(texture2D(brdfIntegrationMapTexture, gl_FragCoord.xy/256.0).rg, 0.0);
#endif
#ifdef HAS_AO_TEXTURE
    occlusion = texture2D(occlusionTexture, vUV).r;
#else

#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
#ifdef AO_IN_METALLIC_ROUGHNESS_TEXTURE
    occlusion = data.r;
#endif
#endif

#endif
    col = vec4(vec3(occlusion), 1.0);
/*
    col = getSHIrradiance(-viewDirection);
    if(col.r < 0.0){
      col = vec3(1,0,0);
    }
    if(col.g < 0.0){
      col = vec3(0,1,0);
    }
    if(col.b < 0.0){
      col = vec3(0,0,1);
    }
*/
#endif

    if(alphaMode == 1){
      col.rgb *= alpha;
    }
    gl_FragColor = vec4(col.rgb, alpha);
  }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
