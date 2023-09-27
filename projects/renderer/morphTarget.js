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

  /**
   * 
   * @param {Map<string, Attribute>} attributes map of Attribute objects
   */
  constructor(attributes) {
    this.attributes = attributes;
    if (this.attributes.has("POSITION")) {
      this.min = this.attributes.get("POSITION").min;
      this.max = this.attributes.get("POSITION").max;
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

}

export { supportedMorphTargets, MorphTarget }
