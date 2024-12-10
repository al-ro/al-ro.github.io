import { gl } from "./canvas.js"

/**
 * Class to hold and bind vertex indices
 */
class Indices {

	/**
	 * WebGLBuffer object
	 */
	buffer;

	/**
	 * gl.UNSIGNED_BYTE | gl.UNSIGNED_SHORT | gl.UNSIGNED_INT
	 */
	type;

	length;

	// Trying to delete an already deleted buffer has no effect.
	destroy() {
		gl.deleteBuffer(this.buffer);
	}

	/**
	 * Create WebGLBuffer object with passed data
	 * @param {ArrayBuffer} data JS array buffer
	 * @param {gl.UNSIGNED_BYTE | gl.UNSIGNED_SHORT | gl.UNSIGNED_INT} type GLEnum of data size
	 */
	constructor(data, type) {
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

		this.type = type;
		this.length = data.byteLength / data.BYTES_PER_ELEMENT;
	}

	bind() {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer);
	}

	getType() {
		return this.type;
	}

}

export { Indices }
