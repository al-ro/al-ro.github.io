import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './brdfMapMaterial.glsl.js'

export class BRDFMapMaterial extends Material {

  resolution

  constructor(resolution) {

    super();

    this.attributes = ["POSITION"];

    if (!resolution || resolution.some(function (x) { return x < 1; })) {
      console.error("BRDFMapMaterial must be created with a 2D resolution of at least [1, 1]. Parameter: ", resolution);
    }
    this.resolution = resolution;
  }

  getVertexShaderSource(parameters) {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getParameterHandles() {
    this.resolutionHandle = this.program.getUniformLocation('resolution');
  }

  bindParameters() {
    gl.uniform2fv(this.resolutionHandle, this.resolution);
  }

}
