function getVertexSource(){ 

  var vertexSource = `

  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelMatrix;

  varying vec2 vUV;

  void main(){
    vUV = uv;
    gl_Position = modelMatrix * vec4(position, 1.0);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
  
  precision highp float;

  varying vec2 vUV;
  uniform float time;
  uniform float aspect;

  //https://www.shadertoy.com/view/3s3GDn
  float getGlow(float dist, float radius, float intensity){
    return pow(radius/dist, intensity);
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

//Based on https://www.youtube.com/watch?v=3CycKKJiwis

float random(vec2 par){
   return fract(sin(dot(par.xy,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 random2(vec2 par){
	float rand = random(par);
	return vec2(rand, random(par+rand));
}
    
  void main(){

    vec2 uv = vUV;

    float t = time * 0.01;
    float dist = 0.0;
    const float layers = 32.0;
    float scale = 32.0;
    float depth;
    float size;
    float rotationAngle = time * 0.02;
    
    vec2 offset;
    vec2 local_uv;
    vec2 index;
    vec2 pos;
    vec2 seed;
    vec2 centre;

    mat2 rotation = mat2(cos(rotationAngle), -sin(rotationAngle), 
        sin(rotationAngle),  cos(rotationAngle));

    for(float i = 0.0; i < 32.0; i++){
      depth = fract(i/layers + t);

      //Move centre in a circle depending on the depth of the layer
      centre.x = 0.5 + 0.1 * cos(t) * depth;
      centre.y = 0.5 + 0.1 * sin(t) * depth;

      //Get uv from the fragment coordinates, rotation and depth
      uv = centre - vUV;
      uv.y /= aspect;
      uv *= rotation;
      uv *= mix(scale, 0.0, depth);

      //The local cell
      index = floor(uv);

      //Local cell seed;
      seed = 20.0 * i + index;

      //The local cell coordinates
      local_uv = fract(i + uv) - 0.5;

      //Get a random position for the local cell
      pos = 0.8 * (random2(seed) - 0.5);

      //Get a random size
      size = 0.01 + 0.02 * random(seed);

      //Get distance to the generated point, add fading to distant points
      //Add the distance to the sum
      dist += smoothstep(0.5 * size, 0.0, length(local_uv-pos)) * min(1.0, depth * 2.0);
    }

    vec3 col = 0.25 * vec3(dist);

    col = ACESFilm(col);
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
  }
  `;

  return fragmentSource;
}



export {getVertexSource, getFragmentSource};
