import { Attribute } from "./attribute.js"
import { gl } from "./canvas.js"

/**
 * A class for vertex data, primitive type and associated attributes
 */
export class Geometry {

  length;

  instanced = false;

  hasIndices = false;

  primitiveType = gl.TRIANGLES;

  attributes;
  indices;

  /**
   * 
   * @param {{attributes: Attribute, length: int, indices?: Indices, primitiveType?: enum}} geometryData 
   */
  constructor(geometryData) {

    this.attributes = geometryData.attributes;

    this.length = geometryData.length;

    if (geometryData.indices != null) {
      this.hasIndices = true;
      this.indices = geometryData.indices;
    }

    if (geometryData.primitiveType != null) {
      this.primitiveType = geometryData.primitiveType;
    }

  }

  destroy() {
    this.attributes.forEach((attribute) => {
      attribute.destroy();
      attribute = null;
    });
    if (this.hasIndices) {
      this.indices.destroy();
    }
  }

  enableBuffers(attributeNames) {
    for (const name of attributeNames) {
      if (this.attributes.has(name)) {
        this.attributes.get(name).enableBuffer();
      } else {
        console.error("Attribute " + name + " does not exist in geometry: ", this);
      }
    }

    if (this.hasIndices) {
      this.indices.bind();
    }

  }

  /**
   * Add an attribute to the geometry.
   * @param {Attribute} attribute
   */
  addAttribute(attribute) {
    this.attributes.set(attribute.getName(), attribute);
  }

  /**
   * Remove a named attribute from the geometry
   * @param {string} name
   */
  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  getMin() {
    return this.attributes.get("POSITION").getMin();
  }

  getMax() {
    return this.attributes.get("POSITION").getMax();
  }

  getPrimitiveType() {
    return this.primitiveType;
  }

  getAttributes() {
    return this.attributes;
  }

  getIndices() {
    return this.indices;
  }

  getLength() {
    return this.length;
  }

  /*
      // ---------- Instanced geometry attributes ----------
  
      if(handles.orientationHandle != null){
        if(this.hasOrientations){
          gl.enableVertexAttribArray(handles.orientationHandle);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.orientationBuffer);
          gl.vertexAttribPointer(handles.orientationHandle, 4, gl.FLOAT, false, 0, 0);
          extINS.vertexAttribDivisorANGLE(handles.orientationHandle, 1);
        }else{
          console.error("ERROR: geometry does not have instance orientations.");
        }
      }
  
  */

}
