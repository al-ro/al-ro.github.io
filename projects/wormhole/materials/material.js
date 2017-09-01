import {gl} from "../canvas.js"
import {Program} from "../program.js"
import {programRepository} from "../programRepository.js"
import {compileShader, getDefinePrefix} from "../shader.js"

export class Material{

  attributeHandles = {};

  program;

  constructor(){}

  createProgram(parameters, material){
    this.program = programRepository.getProgram(parameters, material);
  }

  getProgram(){
    return this.program;
  }

  setPipeline(){}
}
