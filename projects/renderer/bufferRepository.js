// For GLTF Buffer and BufferView handling
// We maintain a repository of unique buffers to properly use interleaved data.
// There are edge cases where multiple BufferViews overlap in which case there
// there will be data duplication. This does not violate the standard and it's
// not easily addressed.

import {gl} from "./canvas.js"

class BufferRepository{

  buffers = new Map();

  constructor(){}

  // Return buffer corresponding to passed index and range 
  // If one does not exist, create it, enter it to the map
  // and return it.

  // parameters
  //  index
  //  byteOffset
  //  byteLength
  //  data
  //  target
  //  usage
  getBuffer(parameters){

    // Create an index combining buffer index and region
    const id = parameters.index + ", " + parameters.byteOffset + ", " + parameters.byteLength;

    if(this.buffers.has(id)){
      return this.buffers.get(id);
    } 
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(parameters.target, buffer);
    gl.bufferData(parameters.target, parameters.data, parameters.usage);

    this.buffers.set(id, buffer);

    return buffer; 
  }
}

export {BufferRepository}
