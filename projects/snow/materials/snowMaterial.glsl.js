function getVertexSource(parameters){ 

  var vertexSource = `

  attribute vec3 position;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float time;
  uniform float speed;

  void main(){

    vec3 worldPos = 2.0 * fract(position + speed * vec3(0, -time, 0)) - 1.0;

    worldPos.xz += 0.05 * sin(5.0*worldPos.y+time);

    vec4 pos = modelMatrix * vec4(worldPos, 1.0);
  
    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = vec4(pos);
    gl_PointSize = 5.0 / -(modelMatrix * viewMatrix * vec4(worldPos, 1.0)).z;
  }
  `;

  return vertexSource;
}

function getFragmentSource(){

  var fragmentSource = `
    precision highp float;
     
    void main(){ 
      float d = length(gl_PointCoord.xy-0.5);
      d = smoothstep(0.5, 0.15, d); 
      gl_FragColor = vec4(d);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
