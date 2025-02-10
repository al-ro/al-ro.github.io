/**
 * For GLTF Buffer and BufferView handling
 * We maintain a repository of unique buffers to properly use interleaved data.
 * There are edge cases where multiple BufferViews overlap in which case there
 * there will be data duplication. This does not violate the standard and it's
 * not easily addressed.
 */

import { gl } from "./canvas.js"

/**
 * Class which holds unique WebGLBuffer objects to avoid storing the repeatedly referenced
 * data multiple times
 */
class BufferRepository {

  /**
   * Map of WebGLBuffer objects where the key is "index, byteOffset, byteLength" of the underlying data
   */
  buffers = new Map();

  constructor() { }

  /**
   * If attribute has been attached to a VAO, it must be bound
   * for the deletion to work. Otherwise it fails silently
   *
   * Trying to delete an already deleted buffer has no effect
   */
  destroy() {
    this.buffers.forEach((buffer) => {
      gl.deleteBuffer(buffer);
    });
    this.buffers = new Map();
  }

  /**
   * Return buffer corresponding to passed index and range
   *
   * If one does not exist, create it, enter it to the map
   * and return it
   * @param {{index: number,
   *          byteOffset: number,
   *          byteLength: number,
   *          data: ArrayBuffer,
   *          target: gl.ARRAY_BUFFER | gl.ELEMENT_ARRAY_BUFFER,
   *          usage: gl.STATIC_DRAW | gl.DYNAMC_DRAW,
   *          sparseInfo: string}} parameters
   * @returns WebGLBuffer
   */
  getBuffer(parameters) {

    // Create an index combining buffer index and region
    let id = [parameters.index, parameters.byteOffset, parameters.byteLength].join(', ');

    // Include sparse information to differentiate base and constructed buffers
    if (!!parameters.sparseInfo && parameters.sparseInfo != "") {
      id += ", " + parameters.sparseInfo;
    }

    if (this.buffers.has(id)) {
      return this.buffers.get(id);
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(parameters.target, buffer);
    gl.bufferData(parameters.target, parameters.data, parameters.usage);

    this.buffers.set(id, buffer);

    return buffer;
  }
}

export { BufferRepository }
