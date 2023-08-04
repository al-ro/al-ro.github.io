import { AnimationType, InterpolationType } from "./canvas.js"

/**
 * Animation for the TRS and weight properties of nodes and meshes
 */
export class PropertyAnimation {

    /**
     * Array of times corresponding to keyframe values
     */
    timeStamps = [];

    /**
     * Array of keyframe values corresponding to times
     */
    values = [];

    interpolation = InterpolationType.LINEAR;

    /**
     * A multiplier for time to control animation speed
     */
    speed = 1.0;

    /**
     * Whether animation resets to the beginning after finishing
     */
    looping = true;

    /**
     * Translation, rotation, scale, weights
     */
    type = AnimationType.TRANSLATON;

    /**
     * Identifier from GLTF file or generated automatically
     */
    name;

    /**
     * @param {{timeStamps: Array, values: Array, interpolation: InterpolationType, name: string}} parameters 
     */
    constructor(parameters) {
        this.timeStamps = parameters.timeStamps;

        this.name = parameters.name;
        this.values = parameters.values;
        this.interpolation = parameters.interpolation;
        switch (parameters.path) {
            case AnimationType.TRANSLATON: this.type = AnimationType.TRANSLATON; break;
            case AnimationType.ROTATION: this.type = AnimationType.ROTATION; break;
            case AnimationType.SCALE: this.type = AnimationType.SCALE; break;
            case AnimationType.WEIGHTS: this.type = AnimationType.WEIGHTS; break;
            default: console.error("Animation type not supported:", parameters.path); this.type = null;
        }
    }

    destroy() {
        this.timeStamps = null;
        this.values = null;
        this.interpolation = null;
    }

    /**
     * Return the value at a given time
     * @param {number} time the animation time
     * @returns the value at the specified time
     */
    getValue(time) {
        time *= this.speed;
        let stamp = this.timeStamps[0];
        if (time <= stamp || this.timeStamps.length < 2) {
            if (this.interpolation == InterpolationType.CUBICSPLINE) {
                return this.values[1];
            }
            return this.values[0];
        }
        if (this.looping) {
            time = time % this.timeStamps[this.timeStamps.length - 1];
        }
        // Return index of first element lager than time
        let upperIdx = this.timeStamps.findIndex((s) => { return s > time; });

        if (upperIdx < 0) {
            if (this.interpolation == InterpolationType.CUBICSPLINE) {
                return this.values[1];
            }
            return this.values[0];
        }

        upperIdx = Math.min(upperIdx, this.timeStamps.length - 1);
        let lowerIdx = Math.max(upperIdx - 1, 0);
        if (upperIdx == 0) {
            lowerIdx = this.timeStamps.length - 1;
        }

        let fraction = (time - this.timeStamps[lowerIdx]) / (this.timeStamps[upperIdx] - this.timeStamps[lowerIdx]);
        let value = [];

        switch (this.interpolation) {
            case InterpolationType.LINEAR:
                if (this.type == AnimationType.ROTATION) {
                    let q0 = this.values[lowerIdx];
                    let q1 = this.values[upperIdx];
                    value = fraction == 0.0 ? q0 : (fraction == 1.0 ? q1 : slerpQuaternion(q0, q1, fraction));
                    break;
                }
                for (let i = 0; i < this.values[0].length; i++) {
                    value.push(this.values[lowerIdx][i] * (1 - fraction) + this.values[upperIdx][i] * fraction);
                }
                break;
            case InterpolationType.STEP:
                for (let i = 0; i < this.values[0].length; i++) {
                    value.push(this.values[lowerIdx][i]);
                }
                break;
            case InterpolationType.CUBICSPLINE:

                // Duration
                let td = this.timeStamps[upperIdx] - this.timeStamps[lowerIdx];
                let f2 = fraction * fraction;
                let f3 = fraction * fraction * fraction;

                for (let i = 0; i < this.values[0].length; i++) {
                    // The data is laid out as [..., inTangents[], values[], outTangents[], ...]
                    let v0 = this.values[3 * lowerIdx + 1][i];
                    let v1 = this.values[3 * upperIdx + 1][i];
                    let inTangent = this.values[3 * upperIdx][i];
                    let outTangent = this.values[3 * lowerIdx + 2][i];
                    value.push((2 * f3 - 3 * f2 + 1) * v0 + td * (f3 - 2 * f2 + fraction) * outTangent +
                        (-2 * f3 + 3 * f2) * v1 + td * (f3 - f2) * inTangent);
                }
                break;
            default: value = [];
        }

        // Normalize rotation quaternions
        if (this.type == AnimationType.ROTATION) {
            let length = Math.sqrt(dot(value, value));
            for (let i = 0; i < 4; i++) {
                value[i] /= length;
            }
        }

        return value;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setLooping(looping) {
        this.looping = looping;
    }

    getName() {
        return this.name;
    }

}