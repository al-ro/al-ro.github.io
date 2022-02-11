import {gl, extINS} from "./canvas.js"
import {Attribute, supportedAttributes} from "./attribute.js"
import {Indices} from "./indices.js"

export class Geometry{

  length;

  instanced = false;

  hasIndices = false;

  indexType = gl.UNSIGNED_SHORT;
  primitiveType = gl.TRIANGLES;

  attributes;
  indices;

  // geometryData
  //  attributes
  //  length
  //  indices
  //  primitiveType
  constructor(geometryData){

    this.attributes = geometryData.attributes;

    this.length = geometryData.length;

    if(geometryData.hasOwnProperty("indices") && geometryData.indices != null){
      this.hasIndices = true;
      this.indices = geometryData.indices;
      this.indexType = geometryData.indices.getType();
    }

    if(geometryData.hasOwnProperty("primitiveType") && geometryData.primitiveType != null){
      this.primitiveType = geometryData.primitiveType;
    }

  }

  destroy(){
    this.attributes.forEach((attribute) => {
        attribute.destroy();
        attribute = null;
    });  
    if(this.hasIndices){
      this.indices.destroy();
    }
  } 

  enableBuffers(attributes){
    let geo = this;
    for(const attribute of attributes){
      if(geo.attributes.has(attribute)){
        geo.attributes.get(attribute).enableBuffer();
      }else{
        console.error("Attribute " + attribute + " does not exist in geometry: ", geo);
      }
    }
    
    if(this.hasIndices){
      this.indices.bind();
    }

  }

  getMin(){
    return this.attributes.get("POSITION").getMin();
  }

  getMax(){
    return this.attributes.get("POSITION").getMax();
  }
/*
    // ---------- Instanced geometry attributes ----------

    if(handles.hasOwnProperty("orientationHandle")){
      if(this.hasOrientations){
        gl.enableVertexAttribArray(handles.orientationHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.orientationBuffer);
        gl.vertexAttribPointer(handles.orientationHandle, 4, gl.FLOAT, false, 0, 0);
        extINS.vertexAttribDivisorANGLE(handles.orientationHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance orientations.");
      }
    }

*/

}
