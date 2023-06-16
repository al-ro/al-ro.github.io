export class Object {
    // Root nodes of local scene graph
    nodes = [];

    // All drawable meshes
    primitives = [];

    // Traverse all nodes in the scene and collect drawable meshes into an array
    generateMeshList() {
        this.primitives = [];
        for (const node of this.nodes) {
            this.collectPrimitives(node);
        }
    }

    // Push node into primitives array if it is drawable and evaluate all child nodes
    collectPrimitives(node) {
        if (node.isMesh) {
            this.primitives.push(node);
        }
        for (const child of node.getChildren()) {
            this.collectPrimitives(child);
        }
    }

    setMaterial(material) {
        for (const mesh of this.primitives) {
            mesh.setMaterial(material);
        }
    }
}