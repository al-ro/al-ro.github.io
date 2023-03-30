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

/** 
 * A factor to multiply the canvas dimensions with. 
 * Values > 1.0 give supersampling as the canvas is interpolated with CSS. 
 * Values < 1.0 produce lower resolution images stretched across the viewport.
*/
var canvasMultiplier = 2.0;

let w = canvas.clientWidth;
let h = canvas.width / 1.6;

canvas.width = w * canvasMultiplier;
canvas.height = (canvas.width / 1.6);

/* 
  Initialize WebGL context
  Antialias flag is not guaranteed to actually antialias anything
  https://www.khronos.org/registry/webgl/specs/latest/1.0/
    "The depth, stencil and antialias attributes, when set to true, 
    are requests, not requirements. The WebGL implementation should 
    make a best effort to honor them. When any of these attributes 
    is set to false, however, the WebGL implementation must not 
    provide the associated functionality."
*/
var gl = canvas.getContext('webgl2', {antialias: true});
if(!gl){
  console.error("Unable to initialize WebGL.");
}

gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

//const ext = gl.getExtension('GMAN_debug_helper');
const extMEM = gl.getExtension('GMAN_webgl_memory');

gl.getExtension('OES_texture_float_linear');
gl.getExtension('EXT_color_buffer_float')

export {canvas, gl, canvasMultiplier, enums, extMEM, InterpolationType, AnimationType}
