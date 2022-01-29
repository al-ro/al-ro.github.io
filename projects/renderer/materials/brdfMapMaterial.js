import {gl} from "../canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './brdfMapMaterial.glsl.js'

export class BRDFMapMaterial extends Material{

  resolution

  constructor(resolution){
    super();
    if(!resolution || resolution.some(function(x){return x <= 0;})){
      console.error("BRDFMapMaterial must be created with a 2D resolution of at least [1, 1]. Parameter: ", resolution);
    }
    this.resolution = resolution;
  }

  getVertexShaderSource(){
    return getVertexSource();
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');
    this.resolutionHandle = this.program.getUniformLocation('resolution');
  }

  bindParameters(){
    gl.uniform2fv(this.resolutionHandle, this.resolution);
  }

  getHandles(){
    return this.attributeHandles; 
  }

}
