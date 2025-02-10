/**
 * A class which contains all individual Objects placed in a scene
 */

export class Scene {
  /**
   * Elements in the scene
   */
  objects = [];

  primitiveCount = 0;

  constructor(objects) {
    if (objects != null) {
      this.objects = objects;
    }
    for (const object of this.objects) {
      this.primitiveCount += object.getPrimitiveCount();
    }
  }

  animate(time) {
    for (const object of this.objects) {
      object.animate(time);
    }
  }

  setIdle() {
    for (const object of this.objects) {
      object.setIdle();
    }
  }

  getAnimations() {
    let animations = [];
    for (const object of this.objects) {
      animations = animations.concat(object.animations);
    }
    return animations;
  }

  renderDepthPrepass(camera) {
    for (const object of this.objects) {
      object.renderDepthPrepass(camera);
    }
  }

  render(renderPass, camera, environment, cullCamera) {
    for (const object of this.objects) {
      object.render(renderPass, camera, environment, cullCamera);
    }
  }

  /**
   * Set the generated background texture which is used to render transmission effects
   * @param {Texture} texture
   */
  setBackgroundTexture(texture) {
    for (const object of this.objects) {
      object.setBackgroundTexture(texture);
    }
  }

  /**
   * Add a new element to the scene
   * @param {Object | Object[]} objects Single instance or an array of Objects
   */
  add(objects) {
    if (Array.isArray(objects)) {
      for (const object of objects) {
        this.objects.push(object);
        this.primitiveCount += object.getPrimitiveCount();
      }
    } else {
      this.objects.push(objects);
      this.primitiveCount += objects.getPrimitiveCount();
    }
  }

  /**
   * Remove referenced Object from the scene
   * @param {Object} object
   * @returns Removed element
   */
  remove(object) {
    const index = this.nodes.indexOf(object);
    this.primitiveCount -= object.getPrimitiveCount();
    return this.objects.splice(index, 1);
  }

  /**
   * Empty the scene
   */
  clear() {
    for (const object of this.objects) {
      object.destroy();
    }
    this.objects = [];
    this.primitiveCount = 0;
  }
}