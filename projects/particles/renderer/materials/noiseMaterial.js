import { gl, Material } from '../renderer.js'
import { getVertexSource, getFragmentSource } from './noiseMaterial.glsl.js'

export class NoiseMaterial extends Material {

  resolutionHandle;

  slice = 0;
  sliceHandle;

  constructor() {

    super();

    this.attributes = ["POSITION", "TEXCOORD_0"];
  }

  getVertexShaderSource() {
    return getVertexSource();
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getUniformHandles() {
    this.sliceHandle = this.program.getUniformLocation('slice');
  }

  bindUniforms() {
    gl.uniform1f(this.sliceHandle, this.slice);
  }
}
