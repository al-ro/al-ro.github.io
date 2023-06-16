var canvas = document.getElementById("canvas_1");
//import 'https://greggman.github.io/webgl-lint/webgl-lint.js';
import 'https://greggman.github.io/webgl-memory/webgl-memory.js';

const enums = {
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
  SCALE: "scale"
}

const RenderPass = {
  /** Opaque material draw*/
  OPAQUE: "OPAQUE",
  /** Composite on the scene using transmission */
  TRANSMISSIVE: "TRANSMISSIVE",
  /** Alpha blending */
  TRANSPARENT: "TRANSPARENT"
}

/** 
 * A factor to multiply the canvas dimensions with. 
 * Values > 1.0 give supersampling as the canvas is interpolated with CSS. 
 * Values < 1.0 produce lower resolution images stretched across the viewport.
*/
var canvasMultiplier = 2.0;

let w = canvas.clientWidth;

canvas.width = w * canvasMultiplier;
canvas.height = (canvas.width / 1.6);

/**
 * Initialize WebGL context
 * Antialias flag is not guaranteed to actually antialias anything
 * https://www.khronos.org/registry/webgl/specs/latest/1.0/
 * "The depth, stencil and antialias attributes, when set to true, 
 * are requests, not requirements. The WebGL implementation should 
 * make a best effort to honor them. When any of these attributes 
 * is set to false, however, the WebGL implementation must not 
 * provide the associated functionality."
 */
var gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) {
  console.error("Unable to initialize WebGL2 context.");
}

gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

//const ext = gl.getExtension('GMAN_debug_helper');
const extMEM = gl.getExtension('GMAN_webgl_memory');

const extFloatLinear = gl.getExtension('OES_texture_float_linear');
if (!extFloatLinear) {
  console.error("OES_texture_float_linear is not available. No fallback.");
}
const extFloatBuffer = gl.getExtension('EXT_color_buffer_float');
if (!extFloatBuffer) {
  console.error("EXT_color_buffer_float is not available. No fallback.");

}

export { canvas, gl, canvasMultiplier, enums, extMEM, InterpolationType, AnimationType, RenderPass }
