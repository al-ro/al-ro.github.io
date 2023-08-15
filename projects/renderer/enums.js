const AlphaModes = {
  OPAQUE: "opaque",
  BLEND: "blend",
  MASK: "mask",
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
  CAMERA_MATRICES: 0,
  CAMERA_UNIFORMS: 1,
  SPHERICAL_HARMONICS: 2
}

export { AlphaModes, InterpolationType, AnimationType, RenderPass, UniformBufferBindPoints }
