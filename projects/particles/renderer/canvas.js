var canvas = document.getElementById("canvas_1");
//import '../../../utility/webgl-lint.js';
//import '../../../utility/webgl-memory.js';

/**
 * A factor to multiply the canvas dimensions with.
 * Values > 1.0 give supersampling as the canvas is interpolated with CSS.
 * Values < 1.0 produce lower resolution images stretched across the viewport.
*/
var canvasMultiplier = 1.0;

let w = canvas.clientWidth;

canvas.width = w * canvasMultiplier;
canvas.height = (canvas.width / 1.6);

/**
 * Initialize WebGL context
 */
var gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) {
  console.error("Unable to initialize WebGL2 context.");
}

gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

//const debugExt = gl.getExtension('GMAN_debug_helper');
//debugExt.setConfiguration({warnUndefinedUniforms: false});

const extMEM = gl.getExtension('GMAN_webgl_memory');

const extFloatLinear = gl.getExtension('OES_texture_float_linear');
if (!extFloatLinear) {
  console.error("OES_texture_float_linear is not available. No fallback.");
}

const extFloatBuffer = gl.getExtension('EXT_color_buffer_float');
if (!extFloatBuffer) {
  console.error("EXT_color_buffer_float is not available. No fallback.");
}

export { canvas, gl, canvasMultiplier, extMEM }
