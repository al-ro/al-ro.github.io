var canvas = document.getElementById("canvas_1");

// A factor to multiply the canvas dimensions with. Values > 1.0 give MSAA as the canvas is interpolated with CSS. Values < 1.0 produce lower resolution images stretched across the viewport.
var canvasMultiplier = 2.0;

let w = canvas.clientWidth;
let h = canvas.width/1.6;

canvas.width = w * canvasMultiplier;
canvas.height = (canvas.width / 1.6);

// Initialize the GL context
// Antialias flag is not guaranteed to actually antialias anything
var gl = canvas.getContext('webgl', {antialias: true});
if(!gl){
  console.error("Unable to initialize WebGL.");
}

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

const extFPT = gl.getExtension("OES_texture_float");
if (!extFPT) {
  console.error("Could not load OES_texture_float. No fallback.");
}

const extFPTL = gl.getExtension("OES_texture_float_linear");
if (!extFPT) {
  console.error("Could not load OES_texture_float_linear. No fallback.");
}

export {canvas, gl, canvasMultiplier}
