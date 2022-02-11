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
  //  byteStride
  //  offset
  //  min (optional)
  //  max (optional)
  descriptor;

  // Optional min/max values of data in buffer. Used for bounding box.
  min;
  max;

  // If attribute has been attached to a VAO, it must be bound
  // for the deletion to work. Otherwise it fails silently.
  // Trying to delete an already deleted buffer has no effect.
  destroy(){
    gl.deleteBuffer(this.buffer);
  }

  constructor(name, buffer, descriptor){
    this.name = name;
    this.buffer = buffer;
    this.descriptor = descriptor;

    if(descriptor.hasOwnProperty("min") && descriptor.min != null){
      this.min = descriptor.min;
    }

    if(descriptor.hasOwnProperty("max") && descriptor.max != null){
      this.max = descriptor.max;
    }

  }

  setHandle(handle){
    this.handle = handle;
  }

  setBuffer(buffer){
    this.buffer = buffer;
  }

  enableBuffer(){
    if(this.handle == null){
      console.error("Handle is not defined: ", this);
    }else{
      gl.enableVertexAttribArray(this.handle);
      gl.bindBuffer(this.descriptor.target, this.buffer);
      gl.vertexAttribPointer(this.handle, this.descriptor.componentCount, this.descriptor.componentType, this.descriptor.normalized, this.descriptor.byteStride, this.descriptor.offset);
    }
  }

  getName(){
    return this.name;
  }

  getMin(){
    return this.min;
  }

  getMax(){
    return this.max;
  }

}

export {supportedAttributes, Attribute}
