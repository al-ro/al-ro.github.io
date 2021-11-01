// Mesh is a basic drawable which combines a Geometry and a Material.
// Upon construction, the Mesh will complete the Geometry and Material objects
// by creating a VAO, matching the geometry data to shader location and 
// creating the appropriate WebGL program.
// Calls to render() will activate the program, bind VAOs, uniforms, textures and call the 
// appropriate draws function depending on the geometry (indexed, instanced, primitives)

import {gl} from "./canvas.js"

export class Mesh{

  geometry;
  material;

  constructor(geometry, material){
    this.geometry = geometry;
    this.material = material;

    this.material.createProgram(geometry.geometryData, material);
    this.material.getParameterHandles(geometry.geometryData);
  }


  bind(){
    let handles = this.material.getHandles();
    this.geometry.enableBuffers(handles);
  }

  render(time){
    gl.useProgram(this.material.getProgram().program);
    this.bind(); 
    this.material.bindParameters(this.geometry, time);
    gl.drawArrays(this.geometry.primitiveType, 0, this.geometry.length);
  }

}
