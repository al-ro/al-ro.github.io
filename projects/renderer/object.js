/**
 * An Object is an element or model in the scene which has a local Node graph containing drawable Mesh primitives.
 */

import { render } from "./renderCall.js"
import { Node } from "./node.js"
import { RenderPass, MaterialType } from "./enums.js";
import { AlphaModes } from "./enums.js";
import { AmbientMaterial } from "./materials/ambientMaterial.js";
import { NormalMaterial } from "./materials/normalMaterial.js";
import { LambertMaterial } from "./materials/lambertMaterial.js";
import { UVMaterial } from "./materials/uvMaterial.js";
import { TextureMaterial } from "./materials/textureMaterial.js";
import { getDefaultTexture } from "./texture.js";

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
				primitive.setDepthMaterial();
				render(RenderPass.ALWAYS, primitive, camera, null, null);
				primitive.setMaterial(material);
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

	/**
	 * @param {MaterialType} type material
	 */
	setMaterial(type) {

		if (this.primitives.length < 1) {
			this.generatePrimitiveList();
		}
		for (const primitive of this.primitives) {
			switch (type) {
				case MaterialType.AMBIENT: primitive.setMaterial(new AmbientMaterial()); break;
				case MaterialType.NORMAL: primitive.setMaterial(new NormalMaterial()); break;
				case MaterialType.LAMBERT: primitive.setMaterial(new LambertMaterial); break;
				case MaterialType.UV: primitive.setMaterial(new UVMaterial()); break;
				case MaterialType.TEXTURE: primitive.setMaterial(new TextureMaterial(getDefaultTexture())); break;
				case MaterialType.DEPTH: primitive.setDepthMaterial(); break;
				default: primitive.displayOriginalMaterial(); break;

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

		if (!Array.isArray(scale)) {
			scale = [scale, scale, scale];
		}

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
			if (mesh.skin != null) {
				let skinMin = mesh.skin.min;
				let skinMax = mesh.skin.max;
				for (let i = 0; i < 3; i++) {
					meshMin[i] = Math.min(skinMin[i], meshMin[i]);
					meshMax[i] = Math.max(skinMax[i], meshMax[i]);
				}
			}
			for (let i = 0; i < 3; i++) {
				min[i] = Math.min(min[i], meshMin[i]);
				max[i] = Math.max(max[i], meshMax[i]);
			}
		}
		this.min = min;
		this.max = max;
	}

}