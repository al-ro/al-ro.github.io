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
    transformMatrics;
    /** Texture used to pass the joint matrices to the GPU */
    texture = createAndSetupTexture();

    min = [];
    max = [];

    constructor(parameters) {
        this.joints = parameters.joints;
        this.inverseBindMatrices = parameters.inverseBindMatrices;

        // Create an aray to store the 4x4 joint matrix of each node
        this.transformMatrics = new Float32Array(this.joints.length * 16);

        this.update();
    }

    destroy() {
        gl.deleteTexture(this.texture);
        this.texture = null;
        this.transformMatrics = null;
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
            let inverseBindMatrix = this.inverseBindMatrices.slice(i, i + 16);
            this.transformMatrics.set(m4.multiply(worldMatrix, inverseBindMatrix), i);
            i += 16;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, this.joints.length, 0, gl.RGBA, gl.FLOAT, this.transformMatrics);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

}