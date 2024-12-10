const AlphaModes = {
	OPAQUE: "OPAQUE",
	BLEND: "BLEND",
	MASK: "MASK",
}

const InterpolationType = {
	LINEAR: "LINEAR",
	STEP: "STEP",
	CUBICSPLINE: "CUBICSPLINE"
}

const AnimationType = {
	TRANSLATON: "translation",
	ROTATION: "rotation",
	SCALE: "scale",
	WEIGHTS: "weights"
}

const MaterialType = {
	PBR: "PBR",
	DEPTH: "DEPTH",
	NORMAL: "NORMAL",
	AMBIENT: "AMBIENT",
	TEXTURE: "TEXTURE",
	UV: "UV",
	LAMBERT: "LAMBERT"
}

const RenderPass = {
	/** Opaque material draw*/
	OPAQUE: "OPAQUE",
	/** Composite on the scene using transmission */
	TRANSMISSIVE: "TRANSMISSIVE",
	/** Alpha blending */
	TRANSPARENT: "TRANSPARENT",
	/** Custom conditionals */
	ALWAYS: "ALWAYS"
}

const UniformBufferBindPoints = {
	/** View, projection and camera matrices */
	CAMERA_MATRICES: 0,
	/** Position, exposure and FOV */
	CAMERA_UNIFORMS: 1,
	/** Red, green and blue matrices for diffuse IBL */
	SPHERICAL_HARMONICS: 2
}

export { AlphaModes, InterpolationType, AnimationType, RenderPass, UniformBufferBindPoints, MaterialType }
