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
		
		// Create a Perlin-Worley texture atlas for cloud shape carving.
		// Based on https://github.com/sebh/TileableVolumeNoise/blob/master/main.cpp

		#define PERLIN_WORLEY 0
		#define WORLEY 1
		
		float saturate(float x) {
			return clamp(x, 0.0, 1.0);
		}
		
		float remap(float x, float low1, float high1, float low2, float high2) {
			return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
		}
		
		vec3 modulo(vec3 m, float n) {
			return mod(mod(m, n) + n, n);
		}
		
		// 5th order polynomial interpolation
		vec3 fade(vec3 t) {
			return (t * t * t) * (t * (t * 6.0 - 15.0) + 10.0);
		}
		
		#define SIZE 8.0
		
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
			return mix(	mix( mix( dot( hash(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0)), 
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
				float val = 0.5 + 0.5 * gradientNoise(p);
				sum += val * weight;
				weightSum += weight;
		
				weight *= 0.5;
				frequency *= 2.0;
			}
		
			return saturate(2.0 * (sum / weightSum) - 1.0);
		}
		
		float worley(vec3 pos, float numCells) {
			vec3 p = pos * numCells;
			float d = 1.0e10;
			for(int x = -1; x <= 1; x++) {
				for(int y = -1; y <= 1; y++) {
					for(int z = -1; z <= 1; z++) {
						vec3 tp = floor(p) + vec3(x, y, z);
						tp = p - tp - (0.5 + 0.5 * hash(mod(tp, numCells)));
						d = min(d, dot(tp, tp));
					}
				}
			}
			return 1.0 - saturate(d);
		}
		
		#define NUM_CELLS 2.0
		
		float getTextureForPoint(vec3 p, int type) {
			float res;
			if(type == PERLIN_WORLEY) {

				float perlinNoise = getPerlinNoise(p, SIZE);

				// Special weights from example code.
				float worley0 = worley(p, NUM_CELLS * 2.0);
				float worley1 = worley(p, NUM_CELLS * 8.0);
				float worley2 = worley(p, NUM_CELLS * 14.0);
		
				float worleyFBM = worley0 * 0.625 + worley1 * 0.25 + worley2 * 0.125;
				res = remap(perlinNoise, 0.0, 1.0, worleyFBM, 1.0);
		
			} else {
		
				// Worley
				float worley0 = worley(p, 3.0 * NUM_CELLS * 2.0);
				float worley1 = worley(p, 3.0 * NUM_CELLS * 8.0);
				float worley2 = worley(p, 3.0 * NUM_CELLS * 14.0);
				float worley3 = worley(p, 3.0 * NUM_CELLS * 18.0);
		
				float FBM0 = worley0 * 0.625 + worley1 * 0.25 + worley2 * 0.125;
				float FBM1 = worley1 * 0.625 + worley2 * 0.25 + worley3 * 0.125;
				float FBM2 = worley2 * 0.75 + worley3 * 0.25;
		
				res = FBM0 * 0.625 + FBM1 * 0.25 + FBM2 * 0.125;
			}
		
			return res;
		}
		
		void main() {
			// Get 3D position represented by the current fragment at the specified slice
			vec3 p = vec3(vUV, slice);

			float worleyPerlinNoise = getTextureForPoint(p, PERLIN_WORLEY);
			float worleyNoise = getTextureForPoint(p, WORLEY);

			float noise = saturate(remap(worleyPerlinNoise, 0.65 * (1.0 - worleyNoise), 1.0, 0.0, 1.0));
		
			fragColor = vec4(1.0 - noise, 0.0, 0.0, 1.0);
		}
  `;

	return fragmentSource;
}

export { getVertexSource, getFragmentSource };
