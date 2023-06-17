/**
 * A class which contains all individual Objects placed in a scene
 */

export class Scene {
    /**
     * Elements in the scene
     */
    objects = [];

    constructor(objects) {
        if (objects != null) {
            this.objects = objects;
        }
    }

    animate(time) {
        for (const object of this.objects) {
            object.animate(time);
        }
    }

    render(renderPass, camera, time) {
        for (const object of this.objects) {
            object.render(renderPass, camera, time);
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

    getObjects() {
        return this.objects;
    }

    /**
     * Add a new element to the scene
     * @param {Object | Object[]} objects Single instance or an array of Objects
     */
    add(objects) {
        if (Array.isArray(objects)) {
            for (const object of objects) {
                this.objects.push(object);
            }
        } else {
            this.objects.push(objects);
        }
    }

    /**
     * Remove referenced Object from the scene
     * @param {Object} object 
     * @returns Removed element
     */
    remove(object) {
        const index = this.nodes.indexOf(object);
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
    }
}