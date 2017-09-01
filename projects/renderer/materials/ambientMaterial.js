import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './ambientMaterial.glsl.js'
import { gl } from '../canvas.js'

export class AmbientMaterial extends Material {

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  normalMatrixHandle;

  environment;

  /**
   * Spherical harmonics (SH) matrices for red, green and blue
   * Must be generated every time a new environment map is used
   * Stored on CPU for use later on if the same environment
   * is requested again
   * Mandatory
   */
  shRedMatrix = m4.create();
  shGrnMatrix = m4.create();
  shBluMatrix = m4.create();

  shRedMatrixHandle;
  shGrnMatrixHandle;
  shBluMatrixHandle;

  constructor(environment) {
    super();
    this.attributes = ["POSITION", "NORMAL"];
    if (environment != null) {

      this.environment = environment;

      let shMatrices = this.environment.getSHMatrices();
      this.shRedMatrix = shMatrices.red;
      this.shGrnMatrix = shMatrices.green;
      this.shBluMatrix = shMatrices.blue;
    }
  }

  getVertexShaderSource(parameters) {
    return getVertexSource(parameters);
  }

  getFragmentShaderSource() {
    return getFragmentSource();
  }

  getParameterHandles() {

    this.shRedMatrixHandle = this.program.getUniformLocation('shRedMatrix');
    this.shGrnMatrixHandle = this.program.getUniformLocation('shGrnMatrix');
    this.shBluMatrixHandle = this.program.getUniformLocation('shBluMatrix');

    this.projectionMatrixHandle = this.program.getUniformLocation('projectionMatrix');
    this.viewMatrixHandle = this.program.getUniformLocation('viewMatrix');
    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');
    this.normalMatrixHandle = this.program.getUniformLocation('normalMatrix');
  }

  bindParameters() {
    let shMatrices = this.environment.getSHMatrices();
    this.shRedMatrix = shMatrices.red;
    this.shGrnMatrix = shMatrices.green;
    this.shBluMatrix = shMatrices.blue;

    gl.uniformMatrix4fv(this.shRedMatrixHandle, false, this.shRedMatrix);
    gl.uniformMatrix4fv(this.shGrnMatrixHandle, false, this.shGrnMatrix);
    gl.uniformMatrix4fv(this.shBluMatrixHandle, false, this.shBluMatrix);
  }

}
