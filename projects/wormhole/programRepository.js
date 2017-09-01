// We maintain a repository of unique programs to save on compilation times
// and reduce the number of pipeline state switches

import {gl} from "./canvas.js"
import {Program} from "./program.js"
import {compileShader, getDefinePrefix} from "./shader.js"

class ProgramRepository{

  programs = new Map();

  constructor(){}

  // Return program corresponding to passed prefix and type
  // If one does not exist, compile it, enter it to the map
  // and return it.
  getProgram(parameters, material){
    
    let definePrefix = getDefinePrefix(parameters, material);

    if(this.programs.has(definePrefix)){
      return this.programs.get(definePrefix);
    }

    let vertexSource = material.getVertexShaderSource();
    vertexSource = definePrefix + vertexSource;

    let vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);

    let fragmentSource = material.getFragmentShaderSource();
    fragmentSource = definePrefix + fragmentSource;

    let fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    let program = new Program(vertexShader, fragmentShader);
    this.programs.set(definePrefix,  program);

    return program;
  
  }
}

var programRepository = new ProgramRepository();

export {programRepository}
