// Mesh is a basic drawable which combines a Geometry and a Material.
// Upon construction, the Mesh will complete the Geometry and Material objects
// by creating a VAO, matching the geometry data to shader location and 
// creating the appropriate WebGL program.
// Calls to render() will activate the program, bind VAOs, uniforms, textures and call the 
// appropriate draws function depending on the geometry (indexed, instanced, primitives)

import {dynamicAttributes} from "./attribute.js";
import {gl} from "./canvas.js"
import {Node} from "./node.js"

export class Mesh extends Node{

  vao;
  geometry;
  material;

  // Meshes can display an override material while retaining their original one
  originalMaterial;
  overrideMaterial;

  instanced = false;
  activeAttributes = [];

  normalMatrix = m4.create();

  constructor(geometry, material, params){

    super(params);

    this.geometry = geometry;

    this.originalMaterial = material;
    this.overrideMaterial = material;

    this.instanced = this.geometry.instanced;

    this.setMaterial(material);
  }

  setMaterial(material){

    this.material = material;

    let attributesToGenetate = [];
    this.activeAttributes = [];
    // Determine intersection of geometry and material attributes
    for(const attribute of this.material.getAttributes()){
      if(this.geometry.getAttributes().has(attribute)){
        this.activeAttributes.push(attribute);
      }else{
        if(dynamicAttributes.includes(attribute)){
          attributesToGenetate.push(attribute);
        }
      }
    }

    // Generate dynamic attributes if needed
    for(const name of attributesToGenetate){
      console.log("Generate: ", name);
      let attribute;
      switch(name){
        case "BARYCENTRIC": attribute = this.geometry.calculateBarycentric("BARYCENTRIC"); break;
        default: attribute = null;
      }
      if(!!attribute){
        this.geometry.addAttribute(attribute);
        this.activeAttributes.push(name);
      }
    }

    this.material.createProgram(this.activeAttributes);
    this.material.getParameterHandles();

    for(const attribute of this.activeAttributes){
      const handle = this.material.program.getAttribLocation(attribute);
      this.geometry.getAttributes().get(attribute).setHandle(handle);
    }
    this.createVAO();
  }

  setOverrideMaterial(material){
    this.overrideMaterial = material;
  }

  setOutput(output){
    this.material.setOutput(output);
  }

  displayOverrideMaterial(){
    this.setMaterial(this.overrideMaterial);
  }

  displayOriginalMaterial(){
    this.setMaterial(this.originalMaterial);
  }

  destroy(){
    if(this.geometry != null){

      this.bindVAO();
      this.geometry.destroy();
      this.unbindVAO();

      gl.deleteVertexArray(this.vao);
      this.geometry = null;
    }

    if(this.material != null){
      this.material.destroy();
      this.material = null;
    }
  }

  createVAO(){
    if(this.vao == null){
      this.vao = gl.createVertexArray();
    }

    this.bindVAO();

    this.geometry.enableBuffers(this.activeAttributes);

    this.unbindVAO();
  }

  bindVAO(){
    gl.bindVertexArray(this.vao);
  }

  unbindVAO(){ 
    gl.bindVertexArray(null);
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

    this.animate(time);

    if(this.material.needsTime){
      this.material.setTime(time);
    }

    this.material.bindParameters();

    if(this.geometry.hasIndices){
      if(this.geometry.instanced){
        gl.drawElementsInstanced(this.geometry.getPrimitiveType(), 
            this.geometry.getLength(), 
            this.geometry.getIndices().getType(), 
            0, 
            this.geometry.instances);
      }else{
        gl.drawElements(this.geometry.getPrimitiveType(), this.geometry.getLength(), this.geometry.getIndices().getType(), 0);
      }
    }else{
      gl.drawArrays(this.geometry.getPrimitiveType(), 0, this.geometry.getLength());
    }

    this.unbindVAO();
  }

  getNormalMatrix(){
    return m4.transpose(m4.inverse(this.getModelMatrix()));
  }

  getMin(){
    return m4.transformPoint(this.getModelMatrix(), this.geometry.getMin());
  }

  getMax(){
    return m4.transformPoint(this.getModelMatrix(), this.geometry.getMax());
  }

  isMesh(){
    return true;
  }

}
