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
  min = [-1, -1, -1];
  max = [1, 1, 1];

  /**
   * Optional array of MorphTarget objects which can be used for vertex animation
   */
  morphTarget;

  /**
   * 
   * @param {{
   * attributes: Map<string,Attribute>, 
   * length: int, 
   * indices?: Indices, 
   * primitiveType?: enum, 
   * morphTarget?: MorphTarget} parameters 
   */
  constructor(parameters) {

    this.attributes = parameters.attributes;

    this.min = this.attributes.get("POSITION").min;
    this.max = this.attributes.get("POSITION").max;

    if (parameters.morphTarget != null) {
      this.morphTarget = parameters.morphTarget;
    }

    this.length = parameters.length;

    if (parameters.indices != null) {
      this.hasIndices = true;
      this.indices = parameters.indices;
    }

    if (parameters.primitiveType != null) {
      this.primitiveType = parameters.primitiveType;
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

    if (this.morphTarget != null) {
      this.morphTarget.destroy();
      this.morphTarget = null;
    }
  }

  /**
   * @param {string[]} attributeNames active attributes for drawable mesh
   */
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

}
