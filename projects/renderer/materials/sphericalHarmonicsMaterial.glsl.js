function getVertexSource() {

  var vertexSource = /*GLSL*/`

    in vec3 POSITION;

    void main(){
      gl_Position = vec4(POSITION, 1.0);
    }
  `;

  return vertexSource;
}

function getFragmentSource() {

  var fragmentSource = /*GLSL*/`

/*

  Diffuse IBL using spherical harmonics

  Read the environment map and calculate 9 spherical harmonics coefficients for each channel.
  The coefficients will describe the low frequency data of the environment. We can use them
  to construct a matrix which, when multiplied with a view vector, will give the data in
  that direction. The low frequency data is similar to a convoluted irradiance map and is
  used for diffuse image based lighting, which gives us the ambient color for shading.

  Based on:
  [1] https://cseweb.ucsd.edu/~ravir/papers/envmap/envmap.pdf
  [2] http://orlandoaguilar.github.io/sh/spherical/harmonics/irradiance/map/2017/02/12/SphericalHarmonics.html
  [3] https://metashapes.com/blog/realtime-image-based-lighting-using-spherical-harmonics/
  [4] https://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere/26127012#26127012
  [5] https://bduvenhage.me/geometry/2019/07/31/generating-equidistant-vectors.html
  [6] https://andrew-pham.blog/2019/08/26/spherical-harmonics/

*/

    uniform samplerCube environmentCubeMap;

    // Constants cn from equation 12 in [1]
    const float c1 = 0.429043;
    const float c2 = 0.511664;
    const float c3 = 0.743125;
    const float c4 = 0.886227;
    const float c5 = 0.247708;

    // First 9 spherical harmonics coefficients from equation 3 in [1]
    const float Y00 = 0.282095;
    const float Y1n = 0.488603; // 3 direction dependent values
    const float Y2n = 1.092548; // 3 direction dependent values
    const float Y20 = 0.315392;
    const float Y22 = 0.546274;

    out vec4 fragColor;

    const float PI = 3.1415926535;

    vec3 getRadiance(vec3 dir){
      return textureLod(environmentCubeMap, dir, 3.0).rgb;
    }

    void main(){

      vec4 col = vec4(0);

      if(gl_FragCoord.x < 4.0 && gl_FragCoord.y < 4.0){

        // Coefficient values to accumulate
        vec3 L00 = vec3(0);
        vec3 L1_1 = vec3(0);
        vec3 L10 = vec3(0);
        vec3 L11 = vec3(0);

        vec3 L2_2 = vec3(0);
        vec3 L2_1 = vec3(0);
        vec3 L20 = vec3(0);
        vec3 L21 = vec3(0);
        vec3 L22 = vec3(0);

        /*
          To make the sampling rate scalable and independent of the cubemap dimensions,
          we can sample a set number of equidistant directions on a sphere. While this is
          not doable for all number of directions, a good approximation is the Fibonacci
          spiral on a sphere.
        */

        // From [4]
        // Golden angle in radians
        float phi = PI * (3.0 - sqrt(5.0));

        const float sampleCount = 1024.0;

        for(float i = 0.0; i < sampleCount; i++){

          float y = 1.0 - (i / sampleCount) * 2.0;

          // Radius at y
          float radius = sqrt(1.0 - y * y);

          // Golden angle increment
          float theta = phi * i;

          float x = cos(theta) * radius;
          float z = sin(theta) * radius;

          // Sample direction
          vec3 dir = normalize(vec3(x, y, z));

          // Environment map value in the direction (interpolated)
          vec3 radiance = getRadiance(dir);

          // Accumulate value weighted by spherical harmonic coefficient in the direction
          L00 += radiance * Y00;
          L1_1 += radiance * Y1n * dir.y;
          L10 += radiance * Y1n * dir.z;
          L11 += radiance * Y1n * dir.x;
          L2_2 += radiance * Y2n * dir.x * dir.y;
          L2_1 += radiance * Y2n * dir.y * dir.z;
          L20 += radiance * Y20 * (3.0 * pow(dir.z, 2.0) - 1.0);
          L21 += radiance * Y2n * dir.x * dir.z;
          L22 += radiance * Y22 * (pow(dir.x, 2.0) - pow(dir.y, 2.0));
        }

        // Scale the sum of coefficients on a sphere
        float factor = 4.0 * PI / sampleCount;

        L00 *= factor;
        L1_1 *= factor;
        L10 *= factor;
        L11 *= factor;
        L2_2 *= factor;
        L2_1 *= factor;
        L20 *= factor;
        L21 *= factor;
        L22 *= factor;

        // Write three 4x4 matrices
        // GLSL matrices are column major

        if(gl_FragCoord.y == 0.5){
          mat4 redMatrix;
          redMatrix[0] = vec4(c1 * L22.r, c1 * L2_2.r, c1 * L21.r, c2 * L11.r);
          redMatrix[1] = vec4(c1 * L2_2.r, -c1 * L22.r, c1 * L2_1.r, c2 * L1_1.r);
          redMatrix[2] = vec4(c1 * L21.r, c1 * L2_1.r, c3 * L20.r, c2 * L10.r);
          redMatrix[3] = vec4(c2 * L11.r, c2 * L1_1.r, c2 * L10.r, c4 * L00.r-c5 * L20.r);
          if(gl_FragCoord.x == 0.5){
            col = redMatrix[0];
          }else if(gl_FragCoord.x == 1.5){
            col = redMatrix[1];
          }else if(gl_FragCoord.x == 2.5){
            col = redMatrix[2];
          }else if(gl_FragCoord.x == 3.5){
            col = redMatrix[3];
          }
        }

        if(gl_FragCoord.y == 1.5){
          mat4 grnMatrix;
          grnMatrix[0] = vec4(c1 * L22.g, c1 * L2_2.g, c1 * L21.g, c2 * L11.g);
          grnMatrix[1] = vec4(c1 * L2_2.g, -c1 * L22.g, c1 * L2_1.g, c2 * L1_1.g);
          grnMatrix[2] = vec4(c1 * L21.g, c1 * L2_1.g, c3 * L20.g, c2 * L10.g);
          grnMatrix[3] = vec4(c2 * L11.g, c2 * L1_1.g, c2 * L10.g, c4 * L00.g-c5 * L20.g);
          if(gl_FragCoord.x == 0.5){
            col = grnMatrix[0];
          }else if(gl_FragCoord.x == 1.5){
            col = grnMatrix[1];
          }else if(gl_FragCoord.x == 2.5){
            col = grnMatrix[2];
          }else if(gl_FragCoord.x == 3.5){
            col = grnMatrix[3];
          }
        }

        if(gl_FragCoord.y == 2.5){
          mat4 bluMatrix;
          bluMatrix[0] = vec4(c1 * L22.b, c1 * L2_2.b, c1 * L21.b, c2 * L11.b);
          bluMatrix[1] = vec4(c1 * L2_2.b, -c1 * L22.b, c1 * L2_1.b, c2 * L1_1.b);
          bluMatrix[2] = vec4(c1 * L21.b, c1 * L2_1.b, c3 * L20.b, c2 * L10.b);
          bluMatrix[3] = vec4(c2 * L11.b, c2 * L1_1.b, c2 * L10.b, c4 * L00.b-c5 * L20.b);
          if(gl_FragCoord.x == 0.5){
            col = bluMatrix[0];
          }else if(gl_FragCoord.x == 1.5){
            col = bluMatrix[1];
          }else if(gl_FragCoord.x == 2.5){
            col = bluMatrix[2];
          }else if(gl_FragCoord.x == 3.5){
            col = bluMatrix[3];
          }
        }
      }

      fragColor = col;
    }
  `;

  return fragmentSource;
}

export { getVertexSource, getFragmentSource };
