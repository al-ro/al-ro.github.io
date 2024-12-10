
/**
 * Mesh is a basic drawable which combines a Geometry and a Material.
 * Upon construction, the Mesh will complete the Geometry and Material objects
 * by creating a VAO, matching the geometry data to shader location and 
 * creating the appropriate WebGL program.
 */

import { gl } from "./canvas.js"
import { Node } from "./node.js"
import { DepthMaterial } from "./materials/depthMaterial.js"
export class Mesh extends Node {

	vao;
	geometry;
	material;

	// Original material the mesh was created with
	originalMaterial;

	// Depth pre-pass material
	depthMaterial;

	cull = true;

	instanced = false;

	normalMatrix = m4.create();

	// The 8 corners of the AABB of the untransformed mesh
	aabb = [];

	// The extent of the transformed mesh. Must be kept updated when transforming
	min;
	max;

	// Optional morph target weights
	weights = [];
	idleWeights = [];
	hasWeights = false;

	constructor(parameters) {

		super(parameters);

		if (parameters.weights != null) {
			this.weights = parameters.weights;
			this.hasWeights = true;
		}

		this.geometry = parameters.geometry;
		this.aabb = getAABBFromExtent(this.geometry.min, this.geometry.max);

		this.originalMaterial = parameters.material;

		this.instanced = this.geometry.instanced;

		this.setMaterial(parameters.material);
	}

	setMaterial(material) {

		this.material = material;

		let activeAttributes = [];
		// Determine intersection of geometry and material attributes
		for (const attribute of this.material.attributes) {
			if (this.geometry.attributes.has(attribute)) {
				activeAttributes.push(attribute);
			}
		}

		this.material.initializeProgram(activeAttributes, this.geometry);

		if (this.geometry.morphTarget != null && this.material.supportsMorphTargets) {
			this.material.enableMorphTargets();
		}

		if (this.material.supportsSkin && !this.material.hasSkin && this.skin != null) {
			this.material.enableSkin();
		}

		for (const attribute of activeAttributes) {
			this.geometry.attributes.get(attribute).handle = this.material.program.getAttribLocation(attribute);
		}

		this.createVAO(activeAttributes);
	}

	setOutput(output) {
		this.material.setOutput(output);
	}

	displayOriginalMaterial() {
		this.setMaterial(this.originalMaterial);
	}

	setDepthMaterial() {
		if (this.depthMaterial == null) {
			this.depthMaterial = new DepthMaterial({
				baseColorFactor: this.originalMaterial.baseColorFactor,
				baseColorTexture: this.originalMaterial.baseColorTexture,
				baseColorTextureUV: this.originalMaterial.baseColorTextureUV,
				alphaMode: this.originalMaterial.alphaMode,
				alphaCutoff: this.originalMaterial.alphaCutoff,
				doubleSided: this.originalMaterial.doubleSided
			});
		}
		this.setMaterial(this.depthMaterial);
	}

	destroy() {
		if (this.geometry != null) {

			this.bindVAO();
			this.geometry.destroy();
			this.unbindVAO();

			gl.deleteVertexArray(this.vao);
			this.geometry = null;
		}

		if (this.originalMaterial != null) {
			this.originalMaterial.destroy();
			this.originalMaterial = null;
		}

		if (this.material != null) {
			this.material.destroy();
			this.material = null;
		}

		if (this.depthMaterial != null) {
			this.depthMaterial.destroy();
			this.depthMaterial = null;
		}
	}

	createVAO(activeAttributes) {
		if (this.vao == null) {
			this.vao = gl.createVertexArray();
		}

		this.bindVAO();
		this.geometry.enableBuffers(activeAttributes);
		this.unbindVAO();
	}

	bindVAO() {
		gl.bindVertexArray(this.vao);
	}

	unbindVAO() {
		gl.bindVertexArray(null);
	}

	doubleSided() {
		return this.material.doubleSided;
	}

	setMin() {
		let min = [1e10, 1e10, 1e10];
		for (const corner of this.aabb) {
			let transformedCorner = m4.transformPoint(this.worldMatrix, corner);
			for (let i = 0; i < 3; i++) {
				min[i] = Math.min(transformedCorner[i], min[i]);
			}
		}
		this.min = min;
	}

	setMax() {
		let max = [-1e10, -1e10, -1e10];
		for (const corner of this.aabb) {
			let transformedCorner = m4.transformPoint(this.worldMatrix, corner);
			for (let i = 0; i < 3; i++) {
				max[i] = Math.max(transformedCorner[i], max[i]);
			}
		}
		this.max = max;
	}

	/**
	 * Override of Node function to update min and max data
	 * Combine ancestor transforms, local matrix and animation matrix
	 */
	updateWorldMatrix() {
		this.worldMatrix = m4.multiply(this.parentMatrix, this.localMatrix);
		this.normalMatrix = m4.transpose(m4.inverse(this.worldMatrix));
		this.setMin();
		this.setMax();
		this.updateChildren();
	}

	/**
	 * Override of Node function to animate morph targets
	 */
	animate(time, name) {
		if (this.animations.get(name) != null) {
			if (this.animations.get(name).size > 0) {
				this.localMatrix = this.getAnimatedTransform(time, name);
				if (this.hasWeights) {
					this.animateWeights(time, name);
				}
				this.updateWorldMatrix();
			}
		}
		for (const child of this.children) {
			child.animate(time);
		}
	}


	setIdle() {
		this.setIdleWeights();
		this.setIdleTransform();
		for (const child of this.children) {
			child.setIdle();
		}
	}

	/**
	 * Get morph target weight values at the given time
	 * @param {number} time 
	 * @returns array of weights
	 */
	animateWeights(time, name) {
		const weights = this.animations.get(name).get("weights");
		if (weights != null) {
			this.weights = weights.getValue(time);
		}
	}

	isMesh() {
		return true;
	}

	setIdleWeights() {
		if (this.idleWeights.length < 1) {
			this.idleWeights = new Array(this.weights.length).fill(0);
		}
		this.weights = this.idleWeights;
	}

}
