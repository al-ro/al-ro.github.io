/**
 * A collection of Node objects which represent the joints of a skin/skeleton
 */

import { gl } from "./canvas.js"
import { createAndSetupTexture } from "./texture.js"

export class Skin {
  /** Node objects which make up the skin */
  joints = [];
  /** TypedArray which holds 4x4 inverse bind matrices */
  inverseBindMatrices;
  /** TypedArray which holds 4x4 transform matrix of each joint */
  transformMatrices;
  /** Texture used to pass the joint matrices to the GPU */
  texture = createAndSetupTexture();

  min = [];
  max = [];

  constructor(parameters) {
    this.joints = parameters.joints;
    this.inverseBindMatrices = parameters.inverseBindMatrices;

    // Create an aray to store the 4x4 joint matrix of each node
    this.transformMatrices = new Float32Array(this.joints.length * 32);

    this.update();
  }

  destroy() {
    gl.deleteTexture(this.texture);
    this.texture = null;
    this.transformMatrices = null;
    this.inverseBindMatrices = null;
  }

  setMinAndMax() {
    let min = [1e10, 1e10, 1e10];
    let max = [-1e10, -1e10, -1e10];
    for (const joint of this.joints) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], joint.position[i]);
        max[i] = Math.max(max[i], joint.position[i]);
      }
    }

    this.min = min;
    this.max = max;
  }

  /**
   * Combine the global transforms of joint nodes with their inverse bind matrices and upload the data to the GPU
   */
  update() {
    this.setMinAndMax();
    let i = 0;
    for (const joint of this.joints) {
      let worldMatrix = joint.worldMatrix;
      let inverseBindMatrix = this.inverseBindMatrices.slice(i * 16, i * 16 + 16);
      let transformMatrix = m4.multiply(worldMatrix, inverseBindMatrix);
      this.transformMatrices.set(transformMatrix, i * 32);

      let normalMatrix = m4.inverse(transformMatrix);
      normalMatrix = m4.transpose(normalMatrix);
      this.transformMatrices.set(normalMatrix, i * 32 + 16);
      i++;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 8, this.joints.length, 0, gl.RGBA, gl.FLOAT, this.transformMatrices);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

}