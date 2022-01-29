import {gl} from "./canvas.js"

// Create, enable and bind vertex attributes and indices
// TODO: Correct interleaved buffers and multiple attributes sharing the same array region

export class Attribute{

  // gl buffer object
  buffer;

  // ArrayBuffer holding CPU side data
  data;

  // Descriptor for component type, offset and stride
  accessor;

  // 1, 2, 3, 4, 9 or 16 depending on data structure
  componentCount;

  // ARRAY_BUFFER for vertex attributes or ELEMENT_ARRAY_BUFFER for indices
  target = gl.ARRAY_BUFFER;

  // Whether data should be normalized before use
  normalized = false;

  constructor(data, accessor, target){
    this.data = data;
    this.accessor = accessor;

    if(target != null){
      this.target = target;
    }

    if(this.accessor.normalized != null){
      this.normalized = this.accessor.normalized;
    }

    switch (this.accessor.type){
      case "SCALAR":
        this.componentCount = 1;
        break;
      case "VEC2":
        this.componentCount = 2;
        break;
      case "VEC3":
        this.componentCount = 3;
        break;
      case "VEC4":
      case "MAT2":
        this.componentCount = 4;
        break;
      case "MAT3":
        this.componentCount = 9;
        break;
      case "MAT4":
        this.componentCount = 16;
        break;
      default:
        console.error("Unknown type accessor type: ", this.accessor.type);
    }

    this.setData(data);
  }

  setData(data){
    this.data = data;
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, this.data, gl.STATIC_DRAW);
  }

  enableBuffer(handle){
    if(this.target == gl.ELEMENT_ARRAY_BUFFER){
      gl.bindBuffer(this.target, this.buffer);

    }else{
      gl.enableVertexAttribArray(handle);
      gl.bindBuffer(this.target, this.buffer);
      gl.vertexAttribPointer(handle, this.componentCount, this.accessor.componentType, this.normalized, this.accessor.byteStride, 0);
    }
  }

}
