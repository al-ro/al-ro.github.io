import { render } from "./renderCall.js"

export class Scene {
    // Array of all root nodes in the scene
    nodes = [];

    // A linear array of all drawable meshes in the scene
    meshes = [];

    constructor(nodes) {
        if (nodes != null) {
            this.nodes = nodes;
        }
        this.generateMeshList();
    }

    animate(time) {
        for (const node of this.nodes) {
            node.animate(time);
        }
    }

    render(renderPass, camera, time) {
        for (const mesh of this.meshes) {
            render(renderPass, mesh, camera, time);
        }
    }

    setBackgroundTexture(texture) {
        for (const mesh of this.meshes) {
            if (mesh != null && mesh.material != null && mesh.material.hasTransmission) {
                mesh.material.setBackgroundTexture(texture);
            }
        }
    }

    // Traverse all nodes in the scene and collect drawable meshes into an array
    generateMeshList() {
        this.meshes = [];
        for (const node of this.nodes) {
            this.collectMeshes(node);
        }
    }

    // Push node into meshes array if it is drawable and evaluate all child nodes
    collectMeshes(node) {
        if (node.isMesh) {
            this.meshes.push(node);
        }
        for (const child of node.getChildren()) {
            this.collectMeshes(child);
        }
    }

    getNodes() {
        return this.nodes;
    }

    add(node) {
        this.nodes.push(node);
        this.generateMeshList();
    }

    remove(node) {
        const index = this.nodes.indexOf(node);
        this.generateMeshList();
        return this.nodes.splice(index, 1);
    }

    clear() {
        this.nodes = [];
        this.meshes = [];
    }
}