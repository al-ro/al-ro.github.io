var canvas = document.getElementById("canvas_1");
//import 'https://greggman.github.io/webgl-lint/webgl-lint.js';
import 'https://greggman.github.io/webgl-memory/webgl-memory.js';

const enums = {
  OPAQUE: "opaque",
  BLEND: "blend",
  MASK: "mask",
}

// A factor to multiply the canvas dimensions with. Values > 1.0 give MSAA as the canvas is interpolated with CSS. Values < 1.0 produce lower resolution images stretched across the viewport.
var canvasMultiplier = 2.0;

let w = canvas.clientWidth;
let h = canvas.width/1.6;

canvas.width = w * canvasMultiplier;
canvas.height = (canvas.width / 1.6);

// Initialize the GL context
// Antialias flag is not guaranteed to actually antialias anything
// https://www.khronos.org/registry/webgl/specs/latest/1.0/
// "The depth, stencil and antialias attributes, when set to true, are requests, not requirements. The WebGL implementation should make a best effort to honor them. When any of these attributes is set to false, however, the WebGL implementation must not provide the associated functionality."
var gl = canvas.getContext('webgl', {antialias: true});
if(!gl){
  console.error("Unable to initialize WebGL.");
}

gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

//const ext = gl.getExtension('GMAN_debug_helper');
const extMEM = gl.getExtension('GMAN_webgl_memory');

const extVAO = gl.getExtension("OES_vertex_array_object");
if (!extVAO) {
  console.error("Could not load OES_vertex_array_object. No fallback.");
}

const extINS = gl.getExtension("ANGLE_instanced_arrays");
if (!extINS) {
  console.error("Could not load ANGLE_instanced_arrays. No fallback.");
}

const extIND = gl.getExtension("OES_element_index_uint");
if (!extINS) {
  console.error("Could not load OES_element_index_uint. No fallback.");
}

const extDFD = gl.getExtension("OES_standard_derivatives");
if (!extDFD) {
  console.error("Could not load OES_standard_derivatives. No fallback.");
}

const extLOD = gl.getExtension("EXT_shader_texture_lod");
if (!extDFD) {
  console.error("Could not load EXT_shader_texture_lod. No fallback.");
}

const extFPT = gl.getExtension("OES_texture_float");
if (!extFPT) {
  console.error("Could not load OES_texture_float. No fallback.");
}

const extFPTL = gl.getExtension("OES_texture_float_linear");
if (!extFPT) {
  console.error("Could not load OES_texture_float_linear. No fallback.");
}

export {canvas, gl, canvasMultiplier, enums, extVAO, extINS, extDFD, extMEM}
