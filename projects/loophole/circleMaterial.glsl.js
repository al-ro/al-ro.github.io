function getVertexSource(){ 

  var vertexSource = `

  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelMatrix;

  varying vec2 vUV;

  void main(){

    vUV = uv;

    vec4 pos;

    pos = modelMatrix * vec4(position, 1.0);

    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
  
  precision highp float;

  varying vec2 vUV;
  uniform float time;
  uniform sampler2D tex;
  uniform float aspect;

  uniform vec2 offset;
  uniform float radius;
  uniform int data;

  //https://www.shadertoy.com/view/3s3GDn
  float getGlow(float dist, float radius, float intensity){
    return pow(radius/dist, intensity);
  }

  //https://www.shadertoy.com/view/4d3SR4
  vec3 getPastelGradient(float h) {
    h = fract(h + 0.92620819117478) * 6.2831853071796;
    vec2 cocg = 0.25 * vec2(cos(h), sin(h));
    vec2 br = vec2(-cocg.x,cocg.x) - cocg.y;
    vec3 c = 0.729 + vec3(br.y, cocg.y, br.x);
    return c * c;
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

  vec3 getCircle(vec2 pos){

    pos += offset;

    float angle = atan(pos.x, pos.y) / 6.2831853; 
    float height = data > 0 ? texture2D(tex, vec2(angle, 0.0)).b : texture2D(tex, vec2(angle, 0.0)).r ;

    height *= 8.0 * radius;

    vec3 col1 = pow(vec3(0.561, 0.01, 1.0), vec3(2.2));
    vec3 col2 = pow(vec3(0.196, 0.259, 0.871), vec3(2.2));
    vec3 gradientCol = vec3(0.1) + mix(col2, col1, 0.5+0.5*sin(1.0*atan(pos.x, pos.y)));

    float c = (height + length(pos) - radius);
    vec3 col = gradientCol * getGlow(c, 0.5 * max(0.0, -height), 1.5);
    vec3 gradient = 2.0 * gradientCol * smoothstep(-0.2 * radius, radius, c);

    col = mix((0.02 * col1) + gradient, clamp(col, 0.0, 1e6), smoothstep(-0.0, 0.0025, c));

    return col;
  }


  void main(){

    vec2 pos = vUV - vec2(0.5);
    pos.y /= aspect;

    vec3 col = getCircle(pos);

    col = ACESFilm(col);
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
  }
  `;

  return fragmentSource;
}



export {getVertexSource, getFragmentSource};