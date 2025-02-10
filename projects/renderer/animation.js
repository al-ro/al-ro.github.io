/**
 * Animation of models corresponding to PropertyAnimation objects sharing a name
 */
export class Animation {

  /**
  * A multiplier for time to control animation speed
  */
  speed = 1.0;

  /**
  * Starting time for animation to play completely when toggled
  */
  start = 0.0;

  /**
   * Whether animation resets to the beginning after finishing
   */
  looping = true;

  /**
   * Identifier from GLTF file or generated automatically
   */
  name;

  /**
   * Whether animation is played
   */
  active = false;

  /**
   * Array of individual TRS and weights animations
   */
  propertyAnimations = [];

  /**
  * @param {String} name
  */
  constructor(name) {
    this.name = name;
  }

  addPropertyAnimation(propertyAnimation) {
    this.propertyAnimations.push(propertyAnimation);
  }

  setSpeed(speed) {
    this.speed = speed;
    for (const animation of this.propertyAnimations) {
      animation.speed = speed;
    }
  }

  setLooping(looping) {
    this.looping = looping;
    for (const animation of this.propertyAnimations) {
      animation.looping = looping;
    }
  }

  isActive() {
    return this.active;
  }

  setActive(state, time) {
    state ? this.enable(time) : this.disable();
  }

  enable(time) {
    this.start = time;
    this.active = true;
  }

  disable() {
    this.active = false;
  }

  destroy() {
    this.propertyAnimations = [];
  }
}