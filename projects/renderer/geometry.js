import { Attribute } from "./attribute.js"
import { gl } from "./canvas.js"
import { MorphTarget } from "./morphTarget.js";

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

  // Extent of untransformed geometry vertices
  min = null;
  max = null;

  /**
   * Optional array of MorphTarget objects which can be used for vertex animation
   */
  morphTargets;

  /**
   * 
   * @param {{
   * attributes: Map<string,Attribute>, 
   * length: int, 
   * indices?: Indices, 
   * primitiveType?: enum, 
   * morphTargets?: MorphTarget[]} geometryData 
   */
  constructor(geometryData) {

    this.attributes = geometryData.attributes;
    if (!!geometryData.morphTargets) {
      this.morphTargets = geometryData.morphTargets.slice(0, 6);
    }

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

    if (this.morphTargets != null) {
      for (let morphTarget of this.morphTargets) {
        morphTarget.destroy();
        morphTarget = null;
      };
    }
  }

  /**
   * 
   * @param {string[]} attributeNames active attributes for drawable mesh
   */
  enableBuffers(attributeNames, enableMorphTargets = false) {
    for (const name of attributeNames) {
      if (this.attributes.has(name)) {
        this.attributes.get(name).enableBuffer();
      } else {
        console.error("Attribute " + name + " does not exist in geometry: ", this);
      }
      if (enableMorphTargets) {
        if (this.morphTargets != null) {
          for (const morphTarget of this.morphTargets) {
            morphTarget.enableBuffers(name);
          }
        }
      }
    }
    if (this.hasIndices) {
      this.indices.bind();
    }
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

  getMorphTargets() {
    return this.morphTargets;
  }

  getIndices() {
    return this.indices;
  }

  getLength() {
    return this.length;
  }

}
