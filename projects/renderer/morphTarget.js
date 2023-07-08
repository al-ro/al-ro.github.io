import { Attribute } from "./attribute.js";

/**
 * Morph targets supported by the renderer
 * 
 * [POSITION, NORMAL, TANGENT]
 */
const supportedMorphTargets = [
  "POSITION",
  "NORMAL",
  "TANGENT"
];


/**
 * A morph target consisting of attributes
 */
class MorphTarget {

  /**
   * Map of Attribute objects of the morph target
   */
  attributes;

  /**
   * Optional minimum extent of attribute data
   */
  min;

  /**
   * Optional maximum extent of attribute data
   */
  max;

  hasPositionTarget = false;

  /**
   * 
   * @param {Map<string, Attribute>} attributes map of Attribute objects
   */
  constructor(attributes) {
    this.attributes = attributes;
    if (this.attributes.has("POSITION")) {
      this.hasPositionTarget = true;
      this.min = this.attributes.get("POSITION").getMin();
      this.max = this.attributes.get("POSITION").getMax();
    }
  }

  destroy() {
    this.attributes.forEach((attribute) => {
      attribute.destroy();
      attribute = null;
    });
    this.attributes = [];
  }

  enableBuffers(name) {
    if (this.attributes.has(name)) {
      this.attributes.get(name).enableBuffer();
    }
  }

  hasPosition() {
    return this.hasPositionTarget;
  }

  getAttributes() {
    return this.attributes;
  }

  getMin() {
    return this.min;
  }

  getMax() {
    return this.max;
  }

}

export { supportedMorphTargets, MorphTarget }
