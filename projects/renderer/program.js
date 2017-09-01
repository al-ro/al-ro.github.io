import {gl} from "./canvas.js"
export class Program{

  vertexShader;
  fragmentShader;
  program;

  constructor(vertexShader, fragmentShader){
    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;

    //Create shader programs
    this.program = gl.createProgram();
    gl.attachShader(this.program, this.vertexShader);
    gl.attachShader(this.program, this.fragmentShader);
    gl.linkProgram(this.program);
    gl.validateProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)){
      var info = gl.getProgramInfoLog(this.program);
      console.error('Could not compile WebGL program.\n', info);
    }
  }

  //https://codepen.io/jlfwong/pen/GqmroZ
  getAttribLocation(name) {
    var attributeLocation = gl.getAttribLocation(this.program, name);
    if (attributeLocation === -1) {
      console.error("Cannot find attribute ", name, ". Attributes which are declared must be used.");
    }
    return attributeLocation;
  }
  
  getUniformLocation(name) {
    var attributeLocation = gl.getUniformLocation(this.program, name);
    if (attributeLocation === -1) {
      console.error("Cannot find uniform: ",  name);
    }
    return attributeLocation;
  }
  getOptionalAttribLocation(name) {
    return gl.getAttribLocation(this.program, name);
  }
  getOptionalUniformLocation(name) {
    return gl.getUniformLocation(this.program, name);
  }
}
