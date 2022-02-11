import {gl} from "./canvas.js"

// Create and enable indices.
class Indices{

  // gl.Buffer object
  buffer;

  // gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT, gl.UNSIGNED_INT
  type;

  // Trying to delete an already deleted buffer has no effect.
  destroy(){
    gl.deleteBuffer(this.buffer);
  }

  constructor(data, type){
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    this.type = type;
  }

  bind(){
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer);
  }

  getType(){
    return this.type;
  }

}

export {Indices}
