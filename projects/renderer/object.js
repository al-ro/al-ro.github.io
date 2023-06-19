/**
 * An Object is an element or model in the scene which has a local Node graph containing drawable Mesh primitives.
 */

import { render } from "./renderCall.js"
import { Node } from "./node.js"

export class Object {
    // The root of the local Node graph which is used to transform the object placement
    node;
    // A flat array of all drawable Meshes
    primitives = [];

    // Combined AABB dimensions of all primitives. Must update when animating or transforming.
    minExtent = [-1, -1, -1];
    maxExtent = [1, 1, 1];

    constructor(children) {
        this.node = new Node({ children: children });
    }

    animate(time) {
        this.node.animate(time);
        this.calculateAABB();
    }

    getPrimitiveCount() {
        return this.primitives.length;
    }

    // Traverse all nodes in the scene and collect drawable meshes into an array
    generatePrimitiveList() {
        this.primitives = [];
        for (const child of this.node.getChildren()) {
            this.collectPrimitives(child);
        }
    }

    // Push node into primitives array if it is drawable and evaluate all child nodes
    collectPrimitives(node) {
        if (node.isMesh()) {
            this.primitives.push(node);
        }
        for (const child of node.getChildren()) {
            this.collectPrimitives(child);
        }
    }

    render(renderPass, camera, time, cullCamera) {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        for (const primitive of this.primitives) {
            render(renderPass, primitive, camera, time, cullCamera);
        }
    }

    // Override the default PBR material of all primitives
    setMaterial(material) {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        for (const primitive of this.primitives) {
            if (material != null) {
                primitive.setOverrideMaterial(material);
                primitive.displayOverrideMaterial();
            } else {
                primitive.displayOriginalMaterial();
            }
        }
    }

    setOutput(output) {
        for (const primitive of this.primitives) {
            primitive.setOutput(output);
        }
    }

    setBackgroundTexture(texture) {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        for (const primitive of this.primitives) {
            if (primitive != null && primitive.material != null && primitive.material.hasTransmission) {
                primitive.material.setBackgroundTexture(texture);
            }
        }
    }

    getScale() {
        let localMatrix = this.node.getLocalMatrix();

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);
        return S[0];
    }

    setScale(scale) {
        let localMatrix = this.node.getLocalMatrix();

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        this.setTRS(T, R, scale);
    }

    setPosition(position) {
        let localMatrix = this.node.getLocalMatrix();

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        this.setTRS(position, R, S);
    }

    setRotation(rotation) {
        let localMatrix = this.node.getLocalMatrix();

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        this.setTRS(T, rotation, S);
    }

    setTRS(T, R, S) {
        let matrix = m4.compose(T, R, S);
        this.node.setLocalMatrix(matrix);
        this.node.updateWorldMatrix();
        this.calculateAABB();
    }

    destroy() {
        this.node.destroy();
    }

    calculateAABB() {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        let min = [1e20, 1e20, 1e20];
        let max = [-1e20, -1e20, -1e20];
        for (const mesh of this.primitives) {
            let meshMin = mesh.getMin();
            let meshMax = mesh.getMax();
            for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i], meshMin[i]);
                max[i] = Math.max(max[i], meshMax[i]);
            }
        }
        this.minExtent = min;
        this.maxExtent = max;
    }
    getMin() {
        return this.minExtent;
    }
    getMax() {
        return this.maxExtent;
    }
}