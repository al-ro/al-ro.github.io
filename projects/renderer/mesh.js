// Mesh is a basic drawable which combines a Geometry and a Material.
// Upon construction, the Mesh will complete the Geometry and Material objects
// by creating a VAO, matching the geometry data to shader location and 
// creating the appropriate WebGL program.
// Calls to render() will activate the program, bind VAOs, uniforms, textures and call the 
// appropriate draws function depending on the geometry (indexed, instanced, primitives)

import {gl, extVAO, extINS} from "./canvas.js"
import {Node} from "./node.js"

export class Mesh extends Node{

  vao;
  geometry;
  material;
  instanced = false;
  activeAttributes = [];

  normalMatrix = m4.create();

  constructor(geometry, material, params){

    super(params);

    this.geometry = geometry;
    this.material = material;

    this.instanced = this.geometry.instanced;


    // Determine intersection of geometry and material attributes
    for(const attribute of this.material.getAttributes()){
      if(this.geometry.attributes.has(attribute)){
        this.activeAttributes.push(attribute);
      }
    }

    this.material.createProgram(this.activeAttributes);
    this.material.getParameterHandles();

    for(const attribute of this.activeAttributes){
      const handle = this.material.program.getAttribLocation(attribute);
      this.geometry.attributes.get(attribute).setHandle(handle);
    }

    if(this.instanced){
      this.material.getInstanceParameterHandles();
    }

    this.createVAO();
  }

  destroy(){
    if(this.geometry != null){

      this.bindVAO();
      this.geometry.destroy();
      this.unbindVAO();

      extVAO.deleteVertexArrayOES(this.vao);
      this.geometry = null;
    }

    if(this.material != null){
      this.material.destroy();
      this.material = null;
    }
  }

  createVAO(){
    this.vao = extVAO.createVertexArrayOES();

    this.bindVAO();

    this.geometry.enableBuffers(this.activeAttributes);

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

    if(!(this.material != null && this.geometry != null)){
      return;
    }

    if(this.material.doubleSided){
      gl.disable(gl.CULL_FACE);
    }else{
      gl.enable(gl.CULL_FACE);
    }

    gl.useProgram(this.material.getProgram().program);
    this.bindVAO(); 

    if(camera != null){
      this.material.bindMatrices({
        projectionMatrix: camera.getProjectionMatrix(),
        viewMatrix: camera.getViewMatrix(),
        modelMatrix: this.getModelMatrix(),
        normalMatrix: this.getNormalMatrix()
      });
    }

    if(this.material.needsCamera){
      this.material.setCamera(camera);
    }

    if(this.material.needsTime){
      this.material.setTime(time);
    }

    this.material.bindParameters();

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

  getNormalMatrix(){
    m4.invert(this.normalMatrix, this.modelMatrix)
    m4.transpose(this.normalMatrix, this.normalMatrix)
    return this.normalMatrix;
  }

  getMin(){
    return m4.transformVector(this.modelMatrix, this.geometry.getMin());
  }

  getMax(){
    return m4.transformVector(this.modelMatrix, this.geometry.getMax());
  }

}
