import {Attribute} from "./attribute.js"
import {Geometry} from "./geometry.js";
import {gl} from "./canvas.js";

// TODO: Reduce to vec2
const vertexData = new Float32Array([
  -1.0,  1.0, 0.0,  // top left
  -1.0, -1.0, 0.0,  // bottom left
   1.0,  1.0, 0.0,  // top right
   1.0, -1.0, 0.0   // bottom right
]);

const geometryParams = {
  attributes: new Map(),
  length: 4,
  primitiveType: gl.TRIANGLE_STRIP
};

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

const descriptor = {
  target: gl.ARRAY_BUFFER,
  componentType: gl.FLOAT,
  componentCount: 3,
  normalized: false,
  byteStride: 0,
  offset: 0
};

geometryParams.attributes.set("POSITION", new Attribute("POSITION", buffer, descriptor));

function getScreenspaceQuad(){
  //return new Geometry({primitiveType: gl.TRIANGLE_STRIP, vertices: vertexData, length: 4});
  return new Geometry(geometryParams);
}

export {getScreenspaceQuad}
