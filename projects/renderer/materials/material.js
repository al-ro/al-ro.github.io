import {gl} from "../canvas.js"
import {Program} from "../program.js"
import {programRepository} from "../programRepository.js"
import {compileShader, getDefinePrefix} from "../shader.js"

export class Material{

  attributeHandles = {};

  // All attributes supported by the material
  supportedAttributes = [];

  // Attributes provided by the geometry and supported by the material
  activeAttributes = [];

  program;

  needsCamera = false;
  needTime = false;

  constructor(){}

  createProgram(parameters, material){
    this.program = programRepository.getProgram(parameters, material);
    //this.program = programRepository.getProgram(this);
  }

  getProgram(){
    return this.program;
  }

  bindMatrices(params){

    if(this.projectionMatrixHandle != null && params.projectionMatrix != null){
      gl.uniformMatrix4fv(this.projectionMatrixHandle, false, params.projectionMatrix);
    }

    if(this.viewMatrixHandle != null && params.viewMatrix != null){
      gl.uniformMatrix4fv(this.viewMatrixHandle, false, params.viewMatrix);
    }

    if(this.modelMatrixHandle != null && params.modelMatrix != null){
      gl.uniformMatrix4fv(this.modelMatrixHandle, false, params.modelMatrix);
    }

    if(this.normalMatrixHandle != null && params.normalMatrix != null){
      gl.uniformMatrix4fv(this.normalMatrixHandle, false, params.normalMatrix);
    }
  }

  getSupportedAttributes(){
    return this.supportedAttributes;
  }

  getActiveAttributes(){
    return this.activeAttributes;
  }

  bindParameters(){}

  setPipeline(){}
}
