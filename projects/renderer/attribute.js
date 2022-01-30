import {gl} from "./canvas.js"

// Create, enable and bind vertex attribute or indices. 
// Buffers are supplied externally as multiple attributes 
// may refer to the same gl buffer when using interleaved data.
export class Attribute{

  // gl buffer object
  buffer;

  // POSITION, NORMAL, TANGENT, TEXCOORD_0, TEXCOORD_1, COLOR_0, INDEX,
  // INSTANCE_IDX, INSTANCE_SCALE, INSTANCE_ORIENTATION, INSTANCE_OFFSET
  name;

  descriptor;

  constructor(name, buffer, descriptor){
    this.name = name;
    this.buffer = buffer;
    this.descriptor = descriptor;
  }

  setBuffer(buffer){
    this.buffer = buffer;
  }

  enableBuffer(handle){
    if(this.descriptor.target == gl.ELEMENT_ARRAY_BUFFER){
      gl.bindBuffer(this.descriptor.target, this.buffer);
    }else{
      gl.enableVertexAttribArray(handle);
      gl.bindBuffer(this.descriptor.target, this.buffer);
      gl.vertexAttribPointer(handle, this.descriptor.componentCount, this.descriptor.componentType, this.descriptor.normalized, this.descriptor.stride, this.descriptor.offset);
    }
  }

  getName(){
    return this.name;
  }

}
