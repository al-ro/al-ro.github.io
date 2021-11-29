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
    uniform int interaction;
    uniform vec2 eventLocations;
    uniform sampler2D tex;
    uniform vec2 strengths;
    uniform float radius;
    uniform float wobble;
 
    const float eps = 1e-2;
    const float dampen = 0.9;

    vec4 getData(float x){
      return texture2D(tex, vec2(x, 0));
    }

    vec2 solve(vec2 data, vec2 leftData, vec2 rightData, float eventLocation, float strength){

      float height = 0.0;

      // Depress surface at mouse x-coordinate
      if(interaction != 0){

        float dist = length(eventLocation - vUV.x);
        dist = min(dist, length((1.0 + eventLocation) - (vUV.x)));
        dist = min(dist, length((eventLocation - 1.0) - (vUV.x)));

        height = strength * smoothstep(radius, 0.0, dist);
      }

      // Ripple propagation
      //height += data.r + (0.5 * (leftData.r + rightData.r) - data.g);

      // Write new to red, previous to green
      return vec2(height, data.r);
    }

    void main(){  
      vec4 data = getData(vUV.x);
      
      // Find last frame data to the left and right of current position
      // Walls are periodic
      vec4 leftData = getData(vUV.x - eps);
      vec4 rightData = getData(vUV.x + eps);
      
      vec2 leftCircle = solve(data.rg, leftData.rg, rightData.rg, eventLocations.x, strengths.x);
      vec2 rightCircle = solve(data.ba, leftData.ba, rightData.ba, eventLocations.y, strengths.y);

      gl_FragColor = vec4(leftCircle, rightCircle);
    }
  `;

  return fragmentSource;
}

    

export {getVertexSource, getFragmentSource};
