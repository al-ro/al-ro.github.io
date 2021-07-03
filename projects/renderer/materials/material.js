import {gl} from "../canvas.js"
import {Program} from "../program.js"
import {compileShader, getDefinePrefix} from "../shader.js"

export class Material{

  attributeHandles = {};

  program;

  constructor(){}

  createProgram(parameters, material){
    
    let definePrefix = getDefinePrefix(parameters, material);
    //console.log("Material defined with: ");
    //console.log(definePrefix);

    let vertexSource = this.getVertexShaderSource();
    vertexSource = definePrefix + vertexSource;
    //console.log(fragmentSource);

    let vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);

    let fragmentSource = this.getFragmentShaderSource();
    fragmentSource = definePrefix + fragmentSource;
    //console.log(fragmentSource);

    let fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    this.program = new Program(vertexShader, fragmentShader);
  }

  getProgram(){
    return this.program;
  }

  setPipeline(){}
}
