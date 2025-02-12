#define GAMMA 2.2
#define INV_GAMMA (1.0/GAMMA)
#define GOLDEN_RATIO 1.61803398875

#define STEPS_PRIMARY 50
#define STEPS_LIGHT 16

in vec2 vUV;
out vec4 fragColor;

// -------------------- Uniforms -------------------- //

// RGB / FLOAT
uniform int renderBackground;

// RED / UNSIGNED_BYTE
uniform highp sampler3D densityTexture;
uniform highp sampler3D noiseTexture;

// RGBA / UNSIGNED_BYTE
uniform sampler2D blueNoiseTexture;
uniform int dithering;

uniform vec2 resolution;
uniform float time;
uniform int frame;

// scale AABB to fit the data
uniform vec3 aabbScale;
// The aspect ratio of the 3D density data
uniform vec3 dataAspect;

// Scattering coefficients
uniform vec3 sigmaS;
// Absorption coefficients
uniform vec3 sigmaA;
// Extinction coefficients, sigmaS + sigmaA
uniform vec3 sigmaT;

// [0, unbounded]
uniform float densityMultiplier;
// [0, unbounded]
uniform float detailSize;
// [0, 1]
uniform float detailStrength;

uniform vec3 sunDirection;
uniform vec3 sunColor;
// [0, unbounded]
uniform float sunStrength;

uniform float emissionStrength;

layout(std140) uniform cameraMatrices {
  mat4 viewMatrix;
  mat4 projectionMatrix;
  mat4 cameraMatrix;
};

layout(std140) uniform cameraUniforms {
  vec3 cameraPosition;
  float cameraExposure;
  float cameraFOV;
};

// -------------------- Utility functions --------------------- //

// Generate a ray for each fragment looking in the negative Z direction
vec3 rayDirection() {
  vec2 xy = gl_FragCoord.xy - 0.5 * resolution.xy;
  float z = (0.5 * resolution.y) / tan(0.5 * cameraFOV);
  return normalize(vec3(xy, -z));
}

vec3 gamma(vec3 col) {
  return pow(col, vec3(INV_GAMMA));
}

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

// Map variable x in range [low1, high1] to be in range [low2. high2]
float remap(float x, float low1, float high1, float low2, float high2) {
  return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}

// Tonemapping
// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 ACESFilm(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Hyperbolic curve to render a glow
// https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity) {
  return pow(radius / max(dist, 1e-6), intensity);
}

vec3 getSkyColor(vec3 rayDir) {
  const vec3 skyColor = 0.7 * vec3(0.09, 0.33, 0.81);
  return mix(skyColor, 0.25 * skyColor, 0.5 + 0.5 * rayDir.y);
}

// https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p) {
  p *= 129.5;
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// -------------------- AABB Intersection --------------------- //

// https://gist.github.com/DomNomNom/46bb1ce47f68d255fd5d
// Compute the near and far intersections using the slab method.
// No intersection if tNear > tFar.
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
  vec3 tMin = (boxMin - rayOrigin) / rayDir;
  vec3 tMax = (boxMax - rayOrigin) / rayDir;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  return vec2(tNear, tFar);
}

bool insideAABB(vec3 p) {

  // Scale the default cube in [-1, 1]
  vec3 minCorner = aabbScale * vec3(-1);
  vec3 maxCorner = aabbScale * vec3(1);

  const float eps = 1e-4;
  return (p.x > minCorner.x - eps) && (p.y > minCorner.y - eps) &&
    (p.z > minCorner.z - eps) && (p.x < maxCorner.x + eps) &&
    (p.y < maxCorner.y + eps) && (p.z < maxCorner.z + eps);
}

bool getAABBIntersection(vec3 org, vec3 rayDir, out float distToStart, out float totalDistance) {

  // Scale the default cube in [-1, 1]
  vec3 minCorner = aabbScale * vec3(-1);
  vec3 maxCorner = aabbScale * vec3(1);

  // Get the intersection distances of the ray and the AABB
  vec2 intersections = intersectAABB(org, rayDir, minCorner, maxCorner);

  // If we are inside the AABB, the closest intersection is at the camera
  if(insideAABB(org)) {
    intersections.x = 1e-4;
  }

  distToStart = intersections.x;
  totalDistance = intersections.y - intersections.x;

  return intersections.x > 0.0 && (intersections.x < intersections.y);
}

// -------------------- Read Data Textures -------------------- //

float getDetailNoise(vec3 pos) {
  return texture(noiseTexture, pos).r;
}

float getDensityData(vec3 p) {
  // Correct aspect ratio of data
  p *= dataAspect;

  // Map from [-1, 1] to [0, 1]
  p = 0.5 + 0.5 * p;

  // Read the data from the red channel
  return texture(densityTexture, p).r;
}

// ------------------------ Main Code ------------------------- //

float getDensity(vec3 p) {

  // No substance outside the AABB
  if(!insideAABB(p)) {
    return 0.0;
  }

  float cloud = getDensityData(p);

  // If there are no clouds, exit early
  if(cloud <= 0.0) {
    return 0.0;
  }

  // If no carving, return the data
  if(detailStrength < 1e-4) {
    return densityMultiplier * cloud;
  }

  // Animate details
  p -= vec3(0.1 * time);

  // Get detail shape noise
  float detail = getDetailNoise(detailSize * p);

  // Carve away detail based on the noise
  return densityMultiplier * saturate(remap(cloud, detailStrength * detail, 1.0, 0.0, 1.0));
}

// Phase function
// https://www.pbr-book.org/3ed-2018/Volume_Scattering/Phase_Functions
float HenyeyGreenstein(float g, float cosTheta) {
  return (1.0 / (4.0 * 3.1415926)) * ((1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5));
}

// https://fpsunflower.github.io/ckulla/data/oz_volumes.pdf
// https://twitter.com/FewesW/status/1364629939568451587/photo/1
vec3 multipleOctaves(float density, float cosTheta) {

  vec3 radiance = vec3(0);

  // Attenuation
  float a = 1.0;
  // Contribution
  float b = 1.0;
  // Phase attenuation
  float c = 1.0;

  for(int i = 0; i < 4; i++) {
    // Two-lobed HG
    float phase = mix(HenyeyGreenstein(-0.1 * c, cosTheta), HenyeyGreenstein(0.3 * c, cosTheta), 0.7);
    radiance += b * phase * exp(-sigmaT * density * a);
    // Lower is brighter
    a *= 0.2;
    // Higher is brighter
    b *= 0.5;
    c *= 0.5;
  }
  return radiance;
}

// Get the amount of light that reaches a sample point
vec3 lightRay(vec3 org, vec3 p, float cosTheta) {

  float lightRayDistance = 1.0;
  float distToStart = 0.0;

  getAABBIntersection(p, sunDirection, distToStart, lightRayDistance);

  // Light step size
  float stepL = lightRayDistance / float(STEPS_LIGHT);

  // To accumulate
  float lightRayDensity = 0.0;

  // Collect total density along light ray
  for(int j = 0; j < STEPS_LIGHT; j++) {
    lightRayDensity += getDensity(p + sunDirection * float(j) * stepL);
  }

  lightRayDensity *= stepL;

  vec3 beersLaw = multipleOctaves(lightRayDensity, cosTheta);

  // Return product of Beer's law and powder effect depending on the view direction angle with the light direction
  return mix(beersLaw * 2.0 * (1.0 - (exp(-lightRayDensity * 2.0 * sigmaT))), beersLaw, 0.5 + 0.5 * cosTheta);
}

// Get the color along the main view ray
vec3 mainRay(vec3 org, vec3 dir, float cosTheta, inout vec3 totalTransmittance, float offset) {

  // The distance at which to start ray marching
  float distToStart = 0.0;

  // The length of the intersection
  float totalDistance = 0.0;

  // Determine if ray intersects bounding volume
  bool renderClouds = getAABBIntersection(org, dir, distToStart, totalDistance);

  if(!renderClouds) {
    return vec3(0);
  }

  // Default to black.
  vec3 radiance = vec3(0.0);

  // Sampling step size
  float stepS = totalDistance / float(STEPS_PRIMARY);

  // Offset the starting point by blue noise
  distToStart += stepS * offset;

  // Initialise sampling point
  vec3 p = org + distToStart * dir;

  // Combine backward and forward scattering to have details in all directions
  float phaseFunction = mix(HenyeyGreenstein(-0.3, cosTheta), HenyeyGreenstein(0.3, cosTheta), 0.7);

  vec3 sunLight = sunStrength * sunColor;

  for(int i = 0; i < STEPS_PRIMARY; i++) {

    // Get density and cloud height at sample point
    float density = getDensity(p);

    // If there is a cloud at the sample point
    if(density > 0.0) {

      vec3 sampleSigmaS = sigmaS * density;
      vec3 sampleSigmaT = sigmaT * density;

      // Constant ambient factor
      vec3 ambient = 0.0 * sunLight;

      // Emulate lightning as a distance glow to some source
      // Distance to the source position
      float dist = length(p - vec3(0, -0.15, 0));
      // Vary size for flicker
      float size = 0.2 * (sin(4.0 * fract(time)) + 1.0);
      // Get distance based glow
      vec3 emission = emissionStrength * vec3(0.1, 0.35, 1) * getGlow(dist, size, 3.2);

      // Amount of light that reaches the sample point through the cloud is the combination of ambient light and attenuated direct light
      vec3 inscatter = emission + ambient + sunLight * phaseFunction * lightRay(org, p, cosTheta);

      // Scale light contribution by scattering coefficent and density
      inscatter *= sampleSigmaS;

      // Beer-Lambert
      vec3 transmittance = exp(-sampleSigmaT * stepS);

      // Naïve integration (note that the earlier inscatter *= sampleSigmaS already includes sigmaS and density)
      // radiance += totalTransmittance * inscatter * stepS;

      // Better energy conserving integration from "Physically based sky, atmosphere and cloud rendering in Frostbite" 5.6 by Sebastian Hillaire
      radiance += totalTransmittance * (inscatter - inscatter * transmittance) / sampleSigmaT;

      // Attenuate the amount of light that reaches the camera
      totalTransmittance *= transmittance;

      // If ray combined transmittance is close to 0, nothing beyond this sample point is visible, so break early
      if(length(totalTransmittance) <= 1e-3) {
        totalTransmittance = vec3(0.0);
        return radiance;
      }
    }

    // Step along ray
    p += dir * stepS;
  }

  return radiance;
}

void main() {

  // Generate a ray for the given fragment
  vec3 rayDir = rayDirection();

  // Transform the ray to point in the correct direction
  rayDir = normalize(cameraMatrix * vec4(rayDir, 0.0)).xyz;

  vec3 background = vec3(0);
  if(renderBackground > 0) {
    background = getSkyColor(rayDir);
  }

  // Alignment of the view ray and light
  float cosTheta = dot(rayDir, sunDirection);

  // Add a glow to visualize the light source
  if(sunStrength > 0.0) {
    background += sunColor * getGlow(1.0 - (0.5 + 0.5 * cosTheta), 1.5e-4, 0.9);
  }

  // Variable to track transmittance along view ray
  // Assume clear sky and attenuate light when encountering clouds
  vec3 totalTransmittance = vec3(1.0);

  // Jitter sampling to get rid of banding
  float offset = 0.0;

  if(dithering > 0) {
    float blueNoise = texture(blueNoiseTexture, gl_FragCoord.xy / 1024.0, 0.0).r;
    // Make blue noise low discrepancy in time
    offset = fract(blueNoise + float(frame) * GOLDEN_RATIO);
  }

  vec3 col = mainRay(cameraPosition, rayDir, cosTheta, totalTransmittance, offset);

  // Alpha blending of the cloud and background based on the total transmittance
  col += background * totalTransmittance;

  // Tonemapping and gamma correction
  col = ACESFilm(cameraExposure * col);
  col = gamma(col);

  // Output to render texture
  fragColor = vec4(col, 1.0);
}