import { gl } from "./canvas.js"

/**
 * Attibutes supported by the renderer
 * 
 * [POSITION, NORMAL, TANGENT, TEXCOORD_0, TEXCOORD_1, COLOR_0, JOINTS_0, WEIGHTS_0]
 */
const supportedAttributes = [
	"POSITION",
	"TEXCOORD_0"
];


/**
 * Create, enable and bind vertex attribute.
 * Buffers are supplied externally as multiple attributes 
 * may refer to the same WebGLBuffer when using interleaved data.
 */
class Attribute {

	/**
	 * WebGLBuffer object
	 */
	buffer;

	/**
	 * One of supportedAttributes
	 */
	name;

	/**
	 * CPU-side ArrayBuffer
	 */
	data;

	/**
	 * Location in program
	 */
	handle;

	/** 
	 * Object holding variables describing buffer data
	*/
	descriptor;

	/**
	 * Optional minimum extent of attribute data
	 */
	min;

	/**
	 * Optional maximum extent of attribute data
	 */
	max;

	/**
	 * If attribute has been attached to a VAO, it must be bound
	 * for the deletion to work. Otherwise it fails silently.
	 * Trying to delete an already deleted buffer has no effect.
	 */

	destroy() {
		gl.deleteBuffer(this.buffer);
		this.data = null;
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {WebGLBuffer} buffer 
	 * @param {{target: gl.ARRAY_BUFFER | gl.ELEMENT_ARRAY_BUFFER,
	 *          componentType: gl.UNSIGNED_BYTE | gl.UNSIGNED_SHORT | gl.UNSIGNED_INT,
	 *          componentCount: number,
	 *          normalized: boolean,
	 *          byteStride: number,
	 *          offset: number,
	 *          count: number,
	 *          min?: number[],  
	 *          max?: number[]}} descriptor 
	 */
	constructor(name, buffer, data, descriptor) {
		this.name = name;
		this.buffer = buffer;
		this.data = data;
		this.descriptor = descriptor;

		if (descriptor.min != null) {
			this.min = descriptor.min;
		}

		if (descriptor.max != null) {
			this.max = descriptor.max;
		}

	}

	enableBuffer() {
		if (this.handle == null) {
			console.error("Handle is not defined: ", this);
		} else {
			gl.enableVertexAttribArray(this.handle);
			gl.bindBuffer(this.descriptor.target, this.buffer);
			gl.vertexAttribPointer(
				this.handle,
				this.descriptor.componentCount,
				this.descriptor.componentType,
				this.descriptor.normalized,
				this.descriptor.byteStride,
				this.descriptor.offset
			);
		}
	}
}

export { supportedAttributes, Attribute }
