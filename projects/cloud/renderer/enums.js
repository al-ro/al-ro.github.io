const AlphaModes = {
  OPAQUE: "OPAQUE",
  BLEND: "BLEND",
  MASK: "MASK",
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
  CAMERA_UNIFORMS: 1
}

export { AlphaModes, RenderPass, UniformBufferBindPoints }
