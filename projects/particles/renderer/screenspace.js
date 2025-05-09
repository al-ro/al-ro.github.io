// Create two triangles in NDC space which spans [-1, -1] and where y points down

import { Attribute } from "./attribute.js"
import { Geometry } from "./geometry.js";
import { gl } from "./canvas.js";

/**
 * Use 3D vertices for compatibility with camera matrices and the rest of the code
 * z is set to 0 which is the near plane of the space and corresponds to the screen area
 */
const vertexData = new Float32Array([
  -1.0, 1.0, 0.0,  // top left
  -1.0, -1.0, 0.0,  // bottom left
  1.0, 1.0, 0.0,  // top right
  1.0, -1.0, 0.0   // bottom right
]);

const uvData = new Float32Array([
  0.0, 0.0,  // top left
  0.0, 1.0,  // bottom left
  1.0, 0.0,  // top right
  1.0, 1.0   // bottom right
]);

// Triangle strip from vertices ABCD are drawn as [ABC, BCD]
const geometryParams = {
  attributes: new Map(),
  length: 4,
  primitiveType: gl.TRIANGLE_STRIP
};

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

const vertexDescriptor = {
  target: gl.ARRAY_BUFFER,
  componentType: gl.FLOAT,
  componentCount: 3,
  normalized: false,
  byteStride: 0,
  offset: 0,
  min: [-1, -1, 0],
  max: [1, 1, 0]
};

const uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);

const uvDescriptor = {
  target: gl.ARRAY_BUFFER,
  componentType: gl.FLOAT,
  componentCount: 2,
  normalized: false,
  byteStride: 0,
  offset: 0
};

geometryParams.attributes.set("POSITION", new Attribute("POSITION", vertexBuffer, vertexData, vertexDescriptor));
geometryParams.attributes.set("TEXCOORD_0", new Attribute("TEXCOORD_0", uvBuffer, uvData, uvDescriptor));


const triangleVertexData = new Float32Array([
  0.0, 1.0, 0.0,                // top
  -0.866025403785, -0.5, 0.0,   // bottom left
  0.866025403785, -0.5, 0.0      // bottom right
]);
/*
const triangleUVData = new Float32Array([
  0.0, 0.0,  // top left
  0.0, 1.0,  // bottom left
  1.0, 0.0  // top right
]);
*/

// Triangle
const triangleParams = {
  attributes: new Map(),
  length: 3,
  primitiveType: gl.TRIANGLE_STRIP
};

const triangleVertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertexData, gl.STATIC_DRAW);

const triangleVertexDescriptor = {
  target: gl.ARRAY_BUFFER,
  componentType: gl.FLOAT,
  componentCount: 3,
  normalized: false,
  byteStride: 0,
  offset: 0,
  min: [-1, -1, 0],
  max: [1, 1, 0]
};

/*
const triangleUVBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, triangleUVBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleUVData, gl.STATIC_DRAW);

const triangleUVDescriptor = {
  target: gl.ARRAY_BUFFER,
  componentType: gl.FLOAT,
  componentCount: 2,
  normalized: false,
  byteStride: 0,
  offset: 0
};
*/

triangleParams.attributes.set("POSITION", new Attribute("POSITION", triangleVertexBuffer, triangleVertexData, triangleVertexDescriptor));

//triangleParams.attributes.set("TEXCOORD_0", new Attribute("TEXCOORD_0", triangleUVBuffer, triangleUVData, triangleUVDescriptor));

function getScreenspaceQuad() {
  return new Geometry(geometryParams);
}

function getSingleTriangle() {
  return new Geometry(triangleParams);
}

export { getScreenspaceQuad, getSingleTriangle }
