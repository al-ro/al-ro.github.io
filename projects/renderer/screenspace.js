import {Geometry} from "./geometry.js";
import {gl} from "./canvas.js";

const vertexData = new Float32Array([
    -1.0,  1.0, 0.0,  // top left
    -1.0, -1.0, 0.0,  // bottom left
     1.0,  1.0, 0.0,  // top right
     1.0, -1.0, 0.0   // bottom right
]);

function getScreenspaceQuad(){
  return new Geometry({primitiveType: gl.TRIANGLE_STRIP, vertices: vertexData, length: 4});
}

export {getScreenspaceQuad}
