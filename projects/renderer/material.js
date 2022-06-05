import {gl} from "./canvas.js"
import {Program} from "./program.js"
import {compileShader, getDefinePrefix} from "./shader.js"

export class Material{

  attributeHandles = {};

  program;
  pipeline;

  constructor(){}

  createProgram(parameters, material){
    
    let definePrefix = getDefinePrefix(parameters, material);

    let vertexSource = this.getVertexShaderSource(parameters);
    vertexSource = definePrefix + vertexSource;

    let vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);

    let fragmentSource = this.getFragmentShaderSource();
    fragmentSource = definePrefix + fragmentSource;

    let fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    this.program = new Program(vertexShader, fragmentShader);
  }

  bindProgram(){
    gl.bindProgram(this.program.program);
  }

  getProgram(){
    return this.program;
  }

  setPipeline(){}
}
