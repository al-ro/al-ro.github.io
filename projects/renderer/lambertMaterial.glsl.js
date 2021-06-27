import {getNormalTransform, getPositionTransform } from "./shader.js"

function getVertexSource(parameters){ 

  let normalTransform = getNormalTransform(parameters);
  let positionTransform = getPositionTransform(parameters);

  var vertexSource = `

  attribute vec3 position;
  attribute vec3 vertexNormal;

  uniform mat4 modelMatrix;
  uniform mat4 normalMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

  varying vec3 vNorm;

  void main(){
  
  `+ 
    normalTransform 
   +`
    
    vNorm = transformedNormal.xyz;

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
    
    varying vec3 vNorm;
  
    void main(){ 
      float d = clamp(dot(normalize(vNorm), vec3(0,1,0)), 0.0, 1.0);
      vec3 col = vec3(d); 
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
