import {Geometry} from "./geometry.js";
import {gl} from "./canvas.js";

var vertexData = new Float32Array([
    -1.0,  1.0, 0.0,	// top left
    -1.0, -1.0, 0.0,	// bottom left
     1.0,  1.0, 0.0,	// top right
     1.0, -1.0, 0.0	// bottom right
]);

var uvData = new Float32Array([
    0.0, 1.0,	// top left
    0.0, 0.0,	// bottom left
    1.0, 1.0,	// top right
    1.0, 0.0	// bottom right
]);

function getScreenspaceQuad(){
  return new Geometry({primitiveType: gl.TRIANGLE_STRIP, vertices: vertexData, uvs: uvData, length: 4});
}

export {getScreenspaceQuad}
