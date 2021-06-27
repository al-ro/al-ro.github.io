import { getPositionTransform } from "./shader.js"

function getVertexSource(parameters){ 

  let positionTransform = getPositionTransform(parameters);

  var vertexSource = `
  
  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

  varying vec2 vUV;

  void main(){
  
    vUV = uv;

  `+ 
    positionTransform 
   +`
  
    pos = projectionMatrix * viewMatrix * pos;
    gl_Position = vec4(pos);
  }
  `;

  return vertexSource;
}

function getFragmentSource(){
   
  var fragmentSource = `
    precision highp float;
    
    varying vec2 vUV;
  
    void main(){  
      vec3 col = vec3(vUV, 0.0); 
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
