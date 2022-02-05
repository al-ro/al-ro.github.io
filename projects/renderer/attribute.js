import {gl} from "./canvas.js"

const supportedAttributes = [
  "POSITION",
  "NORMAL",
  "TANGENT",
  "TEXCOORD_0",
  "TEXCOORD_1",
  "COLOR_0"
];

// Create, enable and bind vertex attribute.
// Buffers are supplied externally as multiple attributes 
// may refer to the same gl buffer when using interleaved data.
class Attribute{

  // gl.Buffer object
  buffer;

  // One of supportedAttributes
  name;

  // Location in program
  handle;

  // Object holding variables needed to describe buffer data
  //  target
  //  componentType
  //  componentCount
  //  normalized
  //  stride
  //  offset
  descriptor;

  constructor(name, buffer, descriptor){
    this.name = name;
    this.buffer = buffer;
    this.descriptor = descriptor;
  }

  setBuffer(handle){
    this.handle = handle;
  }

  setBuffer(buffer){
    this.buffer = buffer;
  }

  enableBuffer(){
    if(this.handle != null){
      console.error("Handle is not defined: ", this);
    }else{
      gl.enableVertexAttribArray(this.handle);
      gl.bindBuffer(this.descriptor.target, this.buffer);
      gl.vertexAttribPointer(handle, this.descriptor.componentCount, this.descriptor.componentType, this.descriptor.normalized, this.descriptor.stride, this.descriptor.offset);
    }
  }

  getName(){
    return this.name;
  }

}

export {supportedAttributes, Attribute}
