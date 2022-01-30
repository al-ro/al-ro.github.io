// A convenience class which describes an attribute buffer layout

export class Descriptor{
  
  // ARRAY_BUFFER for vertex attributes or ELEMENT_ARRAY_BUFFER for indices
  target;

  // gl.BYTE, gl.SHORT, gl.UNSIGNED_INT, gl.UNSIGNED_SHORT, gl.FLOAT
  componentType;

  // 1, 2, 3, 4, 9 or 16 depending on data structure
  componentCount;

  // Whether data should be normalized before use
  normalized;
 
  // Number of bytes from the start of the buffer where this attribute starts
  offset;
  
  // Number of bytes between the elements of this attribute
  stride;

  // gl.STATIC_DRAW or gl.DYNAMIC_DRAW
  usage;

  constructor(params){
    this.target = params.target;
    this.componentType = params.componentType;
    this.componentCount = params.componentCount;
    this.normalized = params.normalized;
    this.offset = params.offset;
    this.stride = params.stride;
    this.usage = params.usage;
  }
}
