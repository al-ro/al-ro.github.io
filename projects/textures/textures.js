//2D raphics using WebGL and GLSL
//Based on:
//http://jamie-wong.com/2016/07/06/metaballs-and-webgl/
//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
//http://learningwebgl.com/blog/?p=1786
//https://dev.opera.com/articles/webgl-post-processing/
//https://webglfundamentals.org/
//And many more

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");

var WIDTH = 256;
var HEIGHT = WIDTH;

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Initialize the GL context
var gl = canvas.getContext('webgl');

if(!gl){
  alert("Unable to initialize WebGL.");
}
//Time step
var dt = 0.025;
//Time
var time = 0.0;

/*
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'dt').min(0.0).max(0.05).step(0.005).listen();
gui.add(this, 'bloom').min(0.0).max(100.0).step(1).listen();
gui.add(this, 'blurFactor').min(0.0).max(6.0).step(0.1).listen();
gui.add(red_button, 'red');
gui.add(green_button, 'green');
gui.add(blue_button, 'blue');
gui.add(gradient_button, 'gradient');
gui.close();
*/

//GLSL code is presented as a string that is passed for compilation. 
//Can use quotes (' or "), which require escaping newline, or backtick (`), which doesn't.

//****************** Noise shaders ******************
//Specify vertex shader. (x,y) coordinates are variable, z is 0
var noiseVertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

//Specify fragment shader. Set colour
var noiseFragmentSource = `
precision highp float;
const float WIDTH = ` + WIDTH + `.0;
const float HEIGHT = ` + HEIGHT + `.0;
vec2 resolution = vec2(WIDTH, HEIGHT);
uniform float time;
uniform sampler2D greyNoiseTexture;

//WEBGL-NOISE FROM https://github.com/stegu/webgl-noise

//Description : Array and textureless GLSL 2D/3D simplex noise function. Author : Ian McEwan, Ashima Arts. Maintainer : stegu Lastmod : 20110822 (ijm) License : Copyright (C) 2011 Ashima Arts. All rights reserved. Distributed under the MIT License. See LICENSE file. https://github.com/ashima/webgl-noise https://github.com/stegu/webgl-noise

//2D
//vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1;i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}

//3D
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}float snoise(vec3 v, float frequency){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0)); p = mod(p, frequency);float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}

vec4 fade(vec4 t){
  return (t * t * t) * (t * (t * vec4(6) - vec4(15)) + vec4(10));
}

//From https://github.com/g-truc/glm/blob/master/glm/gtc/noise.inl
// Classic Perlin noise, periodic version
float glmPerlin(vec4 Position, vec4 rep){
  vec4 Pi0 = mod(floor(Position), rep); // Integer part modulo rep
  vec4 Pi1 = mod(Pi0 + float(1), rep); // Integer part + 1 mod rep
  vec4 Pf0 = fract(Position); // Fractional part for interpolation
  vec4 Pf1 = Pf0 - float(1); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 iw0 = vec4(Pi0.w);
  vec4 iw1 = vec4(Pi1.w);

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 ixy00 = permute(ixy0 + iw0);
  vec4 ixy01 = permute(ixy0 + iw1);
  vec4 ixy10 = permute(ixy1 + iw0);
  vec4 ixy11 = permute(ixy1 + iw1);

  vec4 gx00 = ixy00 / float(7);
  vec4 gy00 = floor(gx00) / float(7);
  vec4 gz00 = floor(gy00) / float(6);
  gx00 = fract(gx00) - float(0.5);
  gy00 = fract(gy00) - float(0.5);
  gz00 = fract(gz00) - float(0.5);
  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);
  vec4 sw00 = step(gw00, vec4(0));
  gx00 -= sw00 * (step(float(0), gx00) - float(0.5));
  gy00 -= sw00 * (step(float(0), gy00) - float(0.5));

  vec4 gx01 = ixy01 / float(7);
  vec4 gy01 = floor(gx01) / float(7);
  vec4 gz01 = floor(gy01) / float(6);
  gx01 = fract(gx01) - float(0.5);
  gy01 = fract(gy01) - float(0.5);
  gz01 = fract(gz01) - float(0.5);
  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);
  vec4 sw01 = step(gw01, vec4(0.0));
  gx01 -= sw01 * (step(float(0), gx01) - float(0.5));
  gy01 -= sw01 * (step(float(0), gy01) - float(0.5));

  vec4 gx10 = ixy10 / float(7);
  vec4 gy10 = floor(gx10) / float(7);
  vec4 gz10 = floor(gy10) / float(6);
  gx10 = fract(gx10) - float(0.5);
  gy10 = fract(gy10) - float(0.5);
  gz10 = fract(gz10) - float(0.5);
  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);
  vec4 sw10 = step(gw10, vec4(0.0));
  gx10 -= sw10 * (step(float(0), gx10) - float(0.5));
  gy10 -= sw10 * (step(float(0), gy10) - float(0.5));

  vec4 gx11 = ixy11 / float(7);
  vec4 gy11 = floor(gx11) / float(7);
  vec4 gz11 = floor(gy11) / float(6);
  gx11 = fract(gx11) - float(0.5);
  gy11 = fract(gy11) - float(0.5);
  gz11 = fract(gz11) - float(0.5);
  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);
  vec4 sw11 = step(gw11, vec4(float(0)));
  gx11 -= sw11 * (step(float(0), gx11) - float(0.5));
  gy11 -= sw11 * (step(float(0), gy11) - float(0.5));

  vec4 g0000 = vec4(gx00.x, gy00.x, gz00.x, gw00.x);
  vec4 g1000 = vec4(gx00.y, gy00.y, gz00.y, gw00.y);
  vec4 g0100 = vec4(gx00.z, gy00.z, gz00.z, gw00.z);
  vec4 g1100 = vec4(gx00.w, gy00.w, gz00.w, gw00.w);
  vec4 g0010 = vec4(gx10.x, gy10.x, gz10.x, gw10.x);
  vec4 g1010 = vec4(gx10.y, gy10.y, gz10.y, gw10.y);
  vec4 g0110 = vec4(gx10.z, gy10.z, gz10.z, gw10.z);
  vec4 g1110 = vec4(gx10.w, gy10.w, gz10.w, gw10.w);
  vec4 g0001 = vec4(gx01.x, gy01.x, gz01.x, gw01.x);
  vec4 g1001 = vec4(gx01.y, gy01.y, gz01.y, gw01.y);
  vec4 g0101 = vec4(gx01.z, gy01.z, gz01.z, gw01.z);
  vec4 g1101 = vec4(gx01.w, gy01.w, gz01.w, gw01.w);
  vec4 g0011 = vec4(gx11.x, gy11.x, gz11.x, gw11.x);
  vec4 g1011 = vec4(gx11.y, gy11.y, gz11.y, gw11.y);
  vec4 g0111 = vec4(gx11.z, gy11.z, gz11.z, gw11.z);
  vec4 g1111 = vec4(gx11.w, gy11.w, gz11.w, gw11.w);

  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100)));
  g0000 *= norm00.x;
  g0100 *= norm00.y;
  g1000 *= norm00.z;
  g1100 *= norm00.w;

  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101)));
  g0001 *= norm01.x;
  g0101 *= norm01.y;
  g1001 *= norm01.z;
  g1101 *= norm01.w;

  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110)));
  g0010 *= norm10.x;
  g0110 *= norm10.y;
  g1010 *= norm10.z;
  g1110 *= norm10.w;

  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111)));
  g0011 *= norm11.x;
  g0111 *= norm11.y;
  g1011 *= norm11.z;
  g1111 *= norm11.w;

  float n0000 = dot(g0000, Pf0);
  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.y, Pf0.z, Pf0.w));
  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.z, Pf0.w));
  float n1100 = dot(g1100, vec4(Pf1.x, Pf1.y, Pf0.z, Pf0.w));
  float n0010 = dot(g0010, vec4(Pf0.x, Pf0.y, Pf1.z, Pf0.w));
  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));
  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.y, Pf1.z, Pf0.w));
  float n1110 = dot(g1110, vec4(Pf1.x, Pf1.y, Pf1.z, Pf0.w));
  float n0001 = dot(g0001, vec4(Pf0.x, Pf0.y, Pf0.z, Pf1.w));
  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.y, Pf0.z, Pf1.w));
  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));
  float n1101 = dot(g1101, vec4(Pf1.x, Pf1.y, Pf0.z, Pf1.w));
  float n0011 = dot(g0011, vec4(Pf0.x, Pf0.y, Pf1.z, Pf1.w));
  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.z, Pf1.w));
  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.y, Pf1.z, Pf1.w));
  float n1111 = dot(g1111, Pf1);

  vec4 fade_xyzw = fade(Pf0);
  vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);
  vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);
  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);
  vec2 n_yzw = mix(vec2(n_zw.x, n_zw.y), vec2(n_zw.z, n_zw.w), fade_xyzw.y);
  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);
  return float(2.2) * n_xyzw;
}

//END NOISE

#define TILES 1.0 // Use 1.0 for normal tiling across whole texture.
#define NUM_CELLS 4.0


float remap(float x, float low1, float high1, float low2, float high2){
  return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}
float saturate(float x){
  return clamp(x, 0.0, 1.0);
}



//----------------------------------------------------------------------------------------
float Hash(vec2 p, float scale){

  //return 0.5 + 0.5  * snoise(mod(p, scale));
  // This is tiling part, adjusts with the scale...
  p = mod(p, scale);
  return fract(sin(dot(p, vec2(27.16898, 38.90563))) * 5151.5473453);
}

//------------------------------------------------------------------------
vec2 Hash2(vec2 p){

  float r = 523.0*sin(dot(p, vec2(53.3158, 43.6143)));
  return vec2(fract(15.32354 * r), fract(17.25865 * r));

}
//-----------------------------------------------------------------------------
float hash(float n){
  return fract( sin(n) * 43758.5453 );
}
//------------------------------------------------------------------------
// hash based 3d value noise
float noise(in vec3 x){
  vec3 p = floor(x);
  vec3 f = fract(x);

  f = f*f*(3.0 - 2.0 * f);
  float n = p.x + p.y*57.0 + 113.0*p.z;
  return mix(
      mix(
	mix(hash(n + 0.0), hash(n + 1.0), f.x),
	mix(hash(n + 57.0), hash(n + 58.0), f.x),
	f.y),
      mix(
	mix(hash(n + 113.0), hash(n + 114.0), f.x),
	mix(hash(n + 170.0), hash(n + 171.0), f.x),
	f.y),
      f.z);
}


//------------------------------------------------------------------------
float worley(vec2 pos, float numCells) {
  vec2 p = pos * numCells;
  float d = 1.0e10;
  for (int x = -1; x <= 1; x++){
    for (int y = -1; y <= 1; y++){
      vec2 tp = floor(p) + vec2(x, y);
      tp = p - tp - Hash2(mod(tp, numCells / TILES));
      d = min(d, dot(tp, tp));
    }
  }
  return 1.0 - clamp(d, 0.0, 1.0);
}

float worley(vec3 pos, float numCells){
  vec3 p = pos * numCells;
  float d = 1.0e10;
  for (int x = -1; x <= 1; x++){
    for (int y = -1; y <= 1; y++){
      for (int z = -1; z <= 1; z++){
	vec3 tp = floor(p) + vec3(x, y, z);
	tp = p - tp - noise(mod(tp, numCells / TILES));
	d = min(d, dot(tp, tp));
      }
    }
  }
  return 1.0 - clamp(d, 0.0, 1.0);
}

//----------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------
float Noise(vec2 pos, float scale )
{
  vec2 f;

  vec2 p = pos * scale;

  f = fract(p);		// Separate integer from fractional
  p = floor(p);

  f = f*f*(3.0-2.0*f);	// Cosine interpolation approximation

  float res = mix(mix(Hash(p, scale), 
	Hash(p + vec2(1.0, 0.0), scale), f.x),
      mix(Hash(p + vec2(0.0, 1.0), scale),
	Hash(p + vec2(1.0, 1.0), scale), f.x), 
      f.y);
  return res;
}

//----------------------------------------------------------------------------------------

//Return the 3D coordinate corresponding to the 2D atlas uv coordinate.
//If invalid, return -1.0
vec3 get3Dfrom2D(vec2 uv, float tileRows){

  vec2 tile = floor(uv);

  float z = floor(tileRows * tile.y + tile.x);
  return vec3(fract(uv), z);
}

float getPerlinNoise(vec3 pos, float frequency){
  //Noise frequency factor between octave, forced to 2
  const float octaveFrequencyFactor = 2.0;

  // Compute the sum for each octave
  float sum = 0.0;
  float weightSum = 0.0;
  float weight = 1.0;
  for(int oct = 0; oct < 3; oct++){

    vec3 p = pos * frequency;
    //Hillaire says that the 3D version of tileable perlin noise in GLM is broken
    //Use 4D noise with w component set to 0 as in example code
    float val = 0.5 + 0.5 * glmPerlin(vec4(p, 0.0), vec4(frequency));
    sum += val * weight;
    weightSum += weight;

    //Original had multiplication with weight but most sources say to reduce amplitude by half
    weight *= 0.5;
    frequency *= octaveFrequencyFactor;
  }

  float noise = (sum / weightSum);
  noise = saturate(noise);
  return noise;
}

//type 0 == perlin-worley
//type 1 == worley
float getTextureForPoint(vec3 p, int type){
  float res;
  if(type == 0){
    //Perlin-Worley
    //const float frequencyMul[6] = float[6]( 2.0,8.0,14.0,20.0,26.0,32.0 );
    //const int octaveCount = 3;
    const float frequency = 8.0;
    float perlinNoise = getPerlinNoise(p, frequency);
    res = perlinNoise;

    //Special weights from example code
    float worley0 = worley(p, NUM_CELLS*2.0);
    float worley1 = worley(p, NUM_CELLS*8.0);
    float worley2 = worley(p, NUM_CELLS*14.0);

    float worleyFBM = worley0 * 0.625 + worley1 * 0.25 + worley2 * 0.125;
    res = remap(perlinNoise, 0.0, 1.0, worleyFBM, 1.0);


  }else{
    //Worley
    float worley0 = worley(p, NUM_CELLS);
    float worley1 = worley(p, NUM_CELLS*2.0);
    float worley2 = worley(p, NUM_CELLS*4.0);
    float worley3 = worley(p, NUM_CELLS*8.0);

    float FBM0 = worley0 * 0.625 + worley1 * 0.25 + worley2 * 0.125;
    float FBM1 = worley1 * 0.625 + worley2 * 0.25 + worley3 * 0.125;
    float FBM2 = worley2 * 0.75 + worley3 * 0.25;

    res = FBM0 * 0.625 + FBM1 * 0.25 + FBM2 * 0.125;

  }
  return res;
}

float random(vec2 par){
  return fract(sin(dot(par.xy,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 random2(vec2 par){
  float rand = random(par);
  return vec2(rand, random(par+rand));
}

float createCloudMap(vec2 uv){
  uv = vec2(0.5) - uv;
  uv *= 8.0;
  vec2 fl = floor(uv) - 0.5;
  //The local cell coordinates. uv-fl == frac(uv)
  vec2 local_uv = fract(uv);
  vec2 cell;
  vec2 seed;
  vec2 index;
  vec2 pos;
  float dist = 100000000.0;
  //For a 3x3 group of cells around the fragment, find the distance from 
  //the points of each to the current fragment and draw an accumulative glow accordingly.
  //The local cell is (0,0)
  for(float j = -1.0; j <= 1.0; j++){
    for(float k = -1.0; k <= 1.0; k++){
	cell = vec2(j,k);
	//Index of the cell
	index = fl + cell;

	//Cell seed
	seed = 128.0 * index;

	//Get a random position in the considered cell
	pos = cell + 0.9 * (random2(seed) - 0.5);
	float tmp = length(local_uv - pos);
	float k_ = 1.0;
	float h = max( k_-abs(tmp-dist), 0.0 )/k_;
	dist = min( tmp, dist ) - h*h*h*k_*(1.0/6.0);
	//dist = min(dist, ); 
    }
  }
  return 1.0-dist;
}

void main() {
  bool atlas = true;
  vec3 col = vec3(0);
  if(atlas){
  //Normalized pixel coordinates (from 0 to 1)
  float tileSize = 34.0;
  float padWidth = 1.0;
  float coreSize = tileSize - 2.0 * padWidth;
  float tileRows = 6.0;
  float tileCount = tileRows * tileRows;
  vec2 tile = floor((gl_FragCoord.xy - 0.5) / tileSize);

  bool padCell = false;
  if(mod(gl_FragCoord.x, tileSize) == 0.5 || mod(gl_FragCoord.x, tileSize) == tileSize - 0.5){
    padCell = true;
  }
  if(mod(gl_FragCoord.y, tileSize) == 0.5 || mod(gl_FragCoord.y, tileSize) == tileSize - 0.5){
    padCell = true;
  }
  bool startPadX = false;
  bool endPadX = false;
  bool startPadY = false;
  bool endPadY = false;
  if(gl_FragCoord.x == tile.x * tileSize + 0.5){
    startPadX = true;
  }
  if(gl_FragCoord.y == tile.y * tileSize + 0.5){
    startPadY = true;
  }
  if(gl_FragCoord.x == (tile.x + 1.0) * tileSize - 0.5){
    endPadX = true;
  }
  if(gl_FragCoord.y == (tile.y + 1.0) * tileSize - 0.5){
    endPadY = true;
  }
  vec2 padding = vec2(2.0 * padWidth) * tile;
  vec2 pixel;
  vec2 uv;
  if(!padCell){
    pixel = gl_FragCoord.xy - padWidth - padding;
    uv = vec2(pixel.xy/coreSize);
  }else{
    pixel = gl_FragCoord.xy - padWidth - padding;
    if(startPadX){
      pixel.x += coreSize;	
    }
    if(startPadY){
      pixel.y += coreSize;	
    }
    if(endPadX){
      pixel.x -= coreSize;	
    }
    if(endPadY){
      pixel.y -= coreSize;	
    }
    uv = vec2(pixel.xy/coreSize);
  }

  vec3 p_ = get3Dfrom2D(uv, tileRows);
  vec3 p = p_;
  p.z /= (tileRows*tileRows);

  //Get Perlin-Worley noise for level l
  float worleyPerlinNoise = getTextureForPoint(p, 0);
  //Get Worley noise for level l
  float worleyNoise = getTextureForPoint(p, 1);
  col.r = saturate(remap(worleyPerlinNoise, worleyNoise, 1.0, 0.0, 1.0));

  p_ = mod(p_ + 1.0, tileRows * tileRows);
  p = p_;
  p.z /= (tileRows*tileRows); 
  //Get Perlin-Worley noise for level l+1
  worleyPerlinNoise = getTextureForPoint(p, 0);
  //Get Worley noise for level l+1
  worleyNoise = getTextureForPoint(p, 1);
  col.g = saturate(remap(worleyPerlinNoise, worleyNoise, 1.0, 0.0, 1.0));

  //Show erroneous values as red
  if((col.x > 1.0) || (col.x < 0.0)){ col = vec3(1,0,0); }

  //Boundary cells
  if(padCell){
    //col = vec4(0,0,1,1);
  }
  //iterate layers
  if(floor(p_.z) == floor(mod(time, tileRows * tileRows))){
    if(padCell){
      //col = vec4(1,1,0,1);
    }else{
      //col = vec4(0,1,0,1);
    }
  }
  if(startPadX){
    //col /= vec4(1,1,0,1);
  }
  if(startPadY){
    //col /= vec4(1,1,0,1);
  }
  //Unused cells
  if(gl_FragCoord.x > tileRows * tileSize || gl_FragCoord.y > tileRows * tileSize){
    col = vec3(0);
  }
}else{
  vec3 position = vec3(0.5*gl_FragCoord.xy/resolution.xy, 0.5);
  float freq = 8.0;
  float delta = 0.01 * freq;
  float noise = getPerlinNoise(position, freq);

  float noise_xp = getPerlinNoise(position + vec3(delta, 0.0, 0.0), freq);
  float noise_xn = getPerlinNoise(position + vec3(-delta,0.0, 0.0), freq);
  float a = (noise_xp - noise_xn) / (2.0 * delta);

  float noise_yp = getPerlinNoise(position + vec3(0.0, delta, 0.0), freq);
  float noise_yn = getPerlinNoise(position + vec3(0.0,-delta, 0.0), freq);
  float b = (noise_yp - noise_yn) / (2.0 * delta);

  vec2 curl = vec2(b, -a);
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 pos = uv;
  float scale = 20.0;
  vec2 centre = scale * vec2(0.5);
  pos *= scale;
  pos += 1.0*curl;
  pos += sin(pos.y*2.0) * vec2(time,0);
  pos.x = mod(pos.x, scale);
  float cloud = smoothstep(0.2*scale, 0.0, length(pos-centre));
  col = vec3(cloud);

}
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 p = vec3(uv, 0.0);
  const float frequency = 10.0;
  float perlinNoise = getPerlinNoise(p, frequency);
  //col = vec3(perlinNoise);
  gl_FragColor = vec4(col, 1.0);
}
`;

//****************** Canvas shaders ******************

var canvasVertexSource = `
attribute vec2 position;
varying vec2 texCoord;

void main() {
  // map texture coordinates [0, 1] to world coordinates [-1, 1]
  // convert from 0->1 to 0->2
  // convert from 0->2 to -1->+1 (clipspace)

  texCoord = position;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

var canvasFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D srcData;
uniform sampler2D blurData;

void main(){
  vec4 srcColour = texture2D(srcData, gl_FragCoord.xy/256.0);
  gl_FragColor = srcColour;
}
`;

//****************** Utility functions ******************
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.

function loadTexture(gl, texture, url) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  const internalFormat = gl.RGBA;
  const width_ = 1;
  const height_ = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([255, 0, 0, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width_, height_, border, srcFormat, srcType, pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  };
  image.crossOrigin = "";
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}
gl.activeTexture(gl.TEXTURE3);
var tex1 = gl.createTexture();
loadTexture(gl, tex1, 'https://al-ro.github.io/images/terrain/greyNoise.png');

//Compile shader and canvas with source
function compileShader(shaderSource, shaderType){

  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }

  return shader;
}

//From https://codepen.io/jlfwong/pen/GqmroZ
// Utility to complain loudly if we fail to find the attribute
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Can not find attribute ' + name + '.';
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  var attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Can not find uniform ' + name + '.';
  }
  return attributeLocation;
}

function createAndSetupTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

//****************** Create shaders ******************

//Create vertex and fragment shaders
var noiseVertexShader = compileShader(noiseVertexSource, gl.VERTEX_SHADER);
var noiseFragmentShader = compileShader(noiseFragmentSource, gl.FRAGMENT_SHADER);

var canvasVertexShader = compileShader(canvasVertexSource, gl.VERTEX_SHADER);
var canvasFragmentShader = compileShader(canvasFragmentSource, gl.FRAGMENT_SHADER);


// Create shader programs
var noise_program = gl.createProgram();
gl.attachShader(noise_program, noiseVertexShader);
gl.attachShader(noise_program, noiseFragmentShader);
gl.linkProgram(noise_program);

var canvas_program = gl.createProgram();
gl.attachShader(canvas_program, canvasVertexShader);
gl.attachShader(canvas_program, canvasFragmentShader);
gl.linkProgram(canvas_program);

//Set up rectangle covering entire canvas 
var vertexData = new Float32Array([
    -1.0,  1.0, // top left
    -1.0, -1.0, // bottom left
    1.0,  1.0, // top right
    1.0, -1.0, // bottom right
]);

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// To make the geometry information available in the shader as attributes, we
// need to tell WebGL what the layout of our data in the vertex buffer is.
var positionHandle = getAttribLocation(noise_program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
    2, // position is a vec2 (2 values per component)
    gl.FLOAT, // each component is a float
    false, // don't normalize values
    2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 // how many bytes inside the buffer to start from
    );

//Set uniform handles
var timeHandle = getUniformLocation(noise_program, 'time');
var greyNoiseTextureHandle = gl.getUniformLocation(noise_program, "greyNoiseTexture");
  gl.useProgram(noise_program);
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(greyNoiseTextureHandle, 3);
var srcLocation = gl.getUniformLocation(canvas_program, "srcData");

//Create and bind frame buffer
var noiseFramebuffer = gl.createFramebuffer();
noiseFramebuffer.width = WIDTH;
noiseFramebuffer.height = HEIGHT;
gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFramebuffer);

  gl.useProgram(canvas_program);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(srcLocation, 0);  // texture unit 0
//Create and bind texture
var noiseTexture = createAndSetupTexture(gl);

//Allocate/send over empty texture data
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noiseFramebuffer.width, noiseFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

//Assign texture as framebuffer colour attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTexture, 0);

var blurFBO = [];
var blurTexture = [];

for(i = 0; i < 2; i++){
  var framebuffer = gl.createFramebuffer();
  framebuffer.width = WIDTH;
  framebuffer.height = HEIGHT;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  var texture = createAndSetupTexture(gl);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  blurFBO.push(framebuffer);
  blurTexture.push(texture);
}

//****************** Main render loop ******************

//WebGL works like a state machine. Data is read from the last texture that was bound,
//using bindTexture, and written into the last framebuffer that was bound,
//using bindFramebuffer (and thereby into the texture bound to that frame buffer). 
//Binding to null displays onto the canvas (which is treated as a texture). 


function isVisible(obj){
  var clientRect = obj.getBoundingClientRect();
  return (clientRect.y > -clientRect.height/2) && (clientRect.y < clientRect.height/2);
}

function step(){

  //Unbind any textures
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.activeTexture(gl.TEXTURE0);

  //Update time
  time += dt;

  //Draw noises
  gl.useProgram(noise_program);
  //Send time to program
  gl.uniform1f(timeHandle, time);
  //Render to texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
/*

  //Combine original and blurred image 
  gl.useProgram(canvas_program);

  //Draw to canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.uniform1i(srcLocation, 0);  // texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
*/
  requestAnimationFrame(step);
}

step();
