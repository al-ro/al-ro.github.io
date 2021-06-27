import {getNormalTransform, getPositionTransform } from "./shader.js"

function getVertexSource(parameters){ 

  let normalTransform = getNormalTransform(parameters);
  let positionTransform = getPositionTransform(parameters);

  var vertexSource = `
  
  attribute vec3 position;
  attribute vec3 vertexNormal;
  attribute vec2 uv;

  uniform mat4 modelMatrix;
  uniform mat4 normalMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;

  varying vec3 vNorm;
  varying vec2 vUV;

  void main(){
  
    vUV = uv;

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
    varying vec2 vUV;

    uniform sampler2D tex;
  
    void main(){
      float d = clamp(dot(normalize(vNorm), vec3(0,1,0)), 0.0, 1.0);
      d += 0.1;
      vec3 normal = normalize(vNorm); 
      vec4 col = texture2D(tex, vUV);
      if(col.a < 0.5){
	discard;
	return;
      }
      col.rgb = pow(col.rgb, vec3(2.2));
      col.rgb *= d;
      col.rgb *= 2.0;
      col.rgb = 1.0-exp(-col.rgb);
      col.rgb = pow(col.rgb, vec3(0.4545));
      gl_FragColor = vec4(col);
    }
  `;

  return fragmentSource;
}

export {getVertexSource, getFragmentSource};
