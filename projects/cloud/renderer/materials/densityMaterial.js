import { gl, Material } from '../renderer.js'
import { getVertexSource, getFragmentSource } from './densityMaterial.glsl.js'

export class DensityMaterial extends Material {

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
