import {gl, extINS} from "./canvas.js"
import {Attribute, supportedAttributes} from "./attribute.js"
import {Indices} from "./indices.js"

export class Geometry{

  length;

  instanced = false;
  // Instead of using a model matrix per instance, we will have a shared model matrix uniform
  // and a vec4 quaternion for orientation, vec3 for offsets and vec3 for scale. This saves
  // 6 floats per instance.
  hasOrientations = false;
  hasOffsets = false;
  hasScales = false;

  // Per instance int.
  hasIDs = false;

  instances = 1;

  hasIndices = false;
  hasNormals = false;
  hasUVs = false;
  hasTangents = false;
  hasColours = false;

  indexType = gl.UNSIGNED_SHORT;
  primitiveType = gl.TRIANGLES;

  orientations;
  offsets;
  scales;
  IDs;

  orientationBuffer;
  offsetBuffer;
  scaleBuffer;
  idBuffer;

  orientationAttribute;
  offsetAttribute;
  scaleAttribute;

  attributes;

  modelMatrix = m4.create();
  normalMatrix = m4.create();

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
 
  enableBuffers(handles){
    let geo = this;
    handles.forEach((value, key) => {
      if(geo.attributes.has(value)){
        geo.attributes.get(value).enableBuffer();
      }else{
        console.error("Attribute " + value + " does not exist in geometry: ", geo);
      }
    });

    if(this.hasIndices){
      this.indices.bind();
    }

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

  setModelMatrix(modelMatrix){
    this.modelMatrix = modelMatrix;
  }

  getModelMatrix(){
    return this.modelMatrix;
  }

  setNormalMatrix(normalMatrix){
    this.normalMatrix = normalMatrix;
  }

  getNormalMatrix(){
    return this.normalMatrix;
  }

}
