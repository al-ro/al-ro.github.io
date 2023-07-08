import { gl } from "./canvas.js"
export class Program {

  vertexShader;
  fragmentShader;
  program;

  vertexSource;
  fragmentSource;

  constructor(vertexShader, fragmentShader, vertexSource, fragmentSource) {
    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;

    try {
      //Create shader programs
      this.program = gl.createProgram();
      gl.attachShader(this.program, this.vertexShader);
      gl.attachShader(this.program, this.fragmentShader);
      gl.linkProgram(this.program);
      gl.validateProgram(this.program);

      this.vertexSource = vertexSource;
      this.fragmentSourceSource = fragmentSource;

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw "Program link failed with: " + gl.getProgramInfoLog(this.program) + this.vertexSource;
      }
    } catch (error) {
      console.error(error);
    }
  }

  //https://codepen.io/jlfwong/pen/GqmroZ
  getAttribLocation(name) {
    var attributeLocation = gl.getAttribLocation(this.program, name);
    if (attributeLocation === -1) {
      console.error("Cannot find attribute ", name, ". Attributes which are declared must be used." + this.vertexSource);
    }
    return attributeLocation;
  }

  getUniformLocation(name) {
    var attributeLocation = gl.getUniformLocation(this.program, name);
    if (attributeLocation === -1) {
      console.error("Cannot find uniform: ", name);
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
