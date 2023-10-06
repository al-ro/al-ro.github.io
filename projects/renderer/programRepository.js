/**
 * We maintain a repository of unique programs to save on compilation times
 * and reduce the number of pipeline state switches
 */

import { gl } from "./canvas.js"
import { Program } from "./program.js"
import { compileShader, getDefinePrefix } from "./shader.js"

class ProgramRepository {

  programs = new Map();

  constructor() { }

  /**
  * Return program corresponding to passed prefix and type.
  * If one does not exist, compile it, enter it to the map
  * and return it.
  */
  getProgram(material, geometry, attributes) {

    const definePrefix = getDefinePrefix(material, geometry, attributes);

    if (this.programs.has(definePrefix)) {
      return this.programs.get(definePrefix);
    }

    const vertexSource = definePrefix + material.getVertexShaderSource();
    const vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);

    const fragmentSource = definePrefix + material.getFragmentShaderSource();
    const fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    const program = new Program(vertexShader, fragmentShader, vertexSource, fragmentSource);
    this.programs.set(definePrefix, program);

    return program;

  }

}

var programRepository = new ProgramRepository();

export { programRepository }
