/**
 * An Object is an element or model in the scene which has a local Node graph containing drawable Mesh primitives.
 */

import { render } from "./renderCall.js"
import { Node } from "./node.js"
import { RenderPass } from "./enums.js";
import { DepthMaterial } from "./materials/depthMaterial.js";
import { AlphaModes } from "./enums.js";

export class Object {
    // The root of the local Node graph which is used to transform the object placement
    node;
    // A flat array of all drawable Meshes
    primitives = [];

    // Combined AABB dimensions of all primitives. Must update when animating or transforming.
    min = [-1, -1, -1];
    max = [1, 1, 1];

    animations = [];

    constructor(children) {
        this.node = new Node({ children: children });
    }

    animate(time) {
        for (const animation of this.animations) {
            if (animation.isActive()) {
                this.node.animate(Math.max(0, time - animation.start), animation.name);
            }
        }
        this.calculateAABB();
    }

    setIdle() {
        this.node.setIdle();
        this.calculateAABB();
    }

    setIdleMatrix(matrix) {
        this.node.idleMatrix = matrix;
    }

    getPrimitiveCount() {
        return this.primitives.length;
    }

    // Traverse all nodes in the scene and collect drawable meshes into an array
    generatePrimitiveList() {
        this.primitives = [];
        for (const child of this.node.children) {
            this.collectPrimitives(child);
        }
    }

    // Push node into primitives array if it is drawable and evaluate all child nodes
    collectPrimitives(node) {
        if (node.isMesh()) {
            this.primitives.push(node);
        }
        for (const child of node.children) {
            this.collectPrimitives(child);
        }
    }


    renderDepthPrepass(camera) {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        for (const primitive of this.primitives) {
            let material = primitive.material;
            if (!material.hasTransmission && material.alphaMode != AlphaModes.BLEND) {
                let depthMaterial = new DepthMaterial({
                    baseColorFactor: material.baseColorFactor,
                    baseColorTexture: material.baseColorTexture,
                    baseColorTextureUV: material.baseColorTextureUV,
                    alphaMode: material.alphaMode,
                    alphaCutoff: material.alphaCutoff,
                    doubleSided: material.doubleSided
                });
                primitive.setMaterial(depthMaterial);
                render(RenderPass.ALWAYS, primitive, camera, null, null);
                primitive.setMaterial(material);
                depthMaterial = null;
            }
        }
    }

    render(renderPass, camera, environment, cullCamera) {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        for (const primitive of this.primitives) {
            render(renderPass, primitive, camera, environment, cullCamera);
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
                primitive.material.backgroundTexture = texture;
            }
        }
    }

    getScale() {
        let localMatrix = this.node.localMatrix;

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);
        return S[0];
    }

    setScale(scale) {
        let localMatrix = this.node.localMatrix;

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        this.setTRS(T, R, scale);
    }

    setTranslation(position) {
        let localMatrix = this.node.localMatrix;

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        this.setTRS(position, R, S);
    }

    setRotation(rotation) {
        let localMatrix = this.node.localMatrix;

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        this.setTRS(T, rotation, S);
    }


    getRotation() {
        let localMatrix = this.node.localMatrix;

        let T = [0, 0, 0];
        let R = [0, 0, 0, 1];
        let S = [1, 1, 1];

        m4.decompose(localMatrix, T, R, S);

        return R;
    }

    setTRS(T, R, S) {
        let matrix = m4.compose(T, R, S);
        this.node.localMatrix = matrix;
        this.node.idleMatrix = matrix;
        this.node.updateWorldMatrix();
        this.calculateAABB();
    }

    destroy() {
        this.node.destroy();
        for (let animation of this.animations) {
            animation = null;
        }
        this.animations = [];
    }

    calculateAABB() {
        if (this.primitives.length < 1) {
            this.generatePrimitiveList();
        }
        let min = [1e20, 1e20, 1e20];
        let max = [-1e20, -1e20, -1e20];
        for (const mesh of this.primitives) {
            let meshMin = mesh.min;
            let meshMax = mesh.max;
            for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i], meshMin[i]);
                max[i] = Math.max(max[i], meshMax[i]);
            }
        }
        this.min = min;
        this.max = max;
    }

}