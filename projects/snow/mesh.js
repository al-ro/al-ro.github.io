// Mesh is a basic drawable which combines a Geometry and a Material.
// Upon construction, the Mesh will complete the Geometry and Material objects
// by creating a VAO, matching the geometry data to shader location and 
// creating the appropriate WebGL program.
// Calls to render() will activate the program, bind VAOs, uniforms, textures and call the 
// appropriate draws function depending on the geometry (indexed, instanced, primitives)

import {gl, extVAO, extINS} from "./canvas.js"

export class Mesh{

  vao;
  geometry;
  material;
  instanced = false;

  constructor(geometry, material){
    this.geometry = geometry;
    this.material = material;

    this.instanced = this.geometry.instanced;

    this.material.createProgram(geometry.geometryData, material);
    this.material.getParameterHandles(geometry.geometryData);

    if(this.instanced){
      this.material.getInstanceParameterHandles();
    }

    this.createVAO();
  }

  createVAO(){
    this.vao = extVAO.createVertexArrayOES();

    this.bindVAO();

    let handles = this.material.getHandles();
    this.geometry.enableBuffers(handles);

    this.unbindVAO();
  }

  bindVAO(){
    extVAO.bindVertexArrayOES(this.vao);
  }

  unbindVAO(){ 
    extVAO.bindVertexArrayOES(null);
  }

  doubleSided(){
    return this.material.doubleSided;
  }

  render(camera, time){

    if(this.material.doubleSided){
      gl.disable(gl.CULL_FACE);
    }else{
      gl.enable(gl.CULL_FACE);
    }

    gl.useProgram(this.material.getProgram().program);
    this.bindVAO(); 
    this.material.bindParameters(camera, this.geometry, time);
    if(this.geometry.hasIndices){
      if(this.geometry.instanced){
        extINS.drawElementsInstancedANGLE(this.geometry.primitiveType, 
            this.geometry.length, 
            this.geometry.indexType, 
            0, 
            this.geometry.instances);
      }else{
        gl.drawElements(this.geometry.primitiveType, this.geometry.length, this.geometry.indexType, 0);
      }
    }else{
      gl.drawArrays(this.geometry.primitiveType, 0, this.geometry.length);
    }
    this.unbindVAO();
  }

}
