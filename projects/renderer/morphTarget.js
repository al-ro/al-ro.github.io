import { gl } from "./canvas.js";

/**
 * Morph targets supported by the renderer
 * [POSITION, NORMAL, TANGENT]
 */
const supportedMorphTargets = [
	"POSITION",
	"NORMAL",
	"TANGENT"
];

/** Morphed attributes data */
class MorphTarget {

	/** Optional minimum extent of attribute data */
	min;

	/** Optional maximum extent of attribute data */
	max;

	/** Texture which holds the morph target attribute data */
	texture;

	/** Morphed attribute names mapped to their position in the interleaved data */
	morphedAttributePositions;

	/** Number of morph targets */
	count;

	/**
	 * @param {{texture: WebGLTexture, morphedAttributePositions: Map<string, number>, min: number[], max: number[], count: number}} parameters
	 */
	constructor(parameters) {
		this.min = parameters.min;
		this.max = parameters.max;
		this.texture = parameters.texture;
		this.morphedAttributePositions = parameters.morphedAttributePositions;
		this.count = parameters.count
	}

	destroy() {
		this.min = null;
		this.max = null;
		this.morphedAttributePositions = null;
		gl.deleteTexture(this.texture);
	}
}

export { supportedMorphTargets, MorphTarget }