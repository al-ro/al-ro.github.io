import {gl} from "./canvas.js"
import {m4} from "./m4.js"

export class Geometry{

  geometyData;

  length;

  hasIndices = false;
  hasUVs = false;

  indexType = gl.UNSIGNED_SHORT;
  primitiveType = gl.TRIANGLES;

  vertices;
  uvs;

  vertexBuffer;
  uvBuffer;

  modelMatrix = m4.create();

  constructor(geometryData){

    this.geometryData = geometryData;

    if(geometryData.vertices == null){
      console.error("ERROR: no property \"vertices\" provided for geometry.");
    }

    if(!geometryData.length == null){
      console.error("ERROR: no property \"length\" provided for geometry.");
    }

    this.vertices = geometryData.vertices;
    this.length = geometryData.length;

    if(geometryData.primitiveType != null){
      this.primitiveType = geometryData.primitiveType;
    }

    if(geometryData.uvs != null){
      this.hasUVs = true;
      this.uvs = geometryData.uvs;
    }

    this.createBuffers();
  }

  createBuffers(){
    // ---------- Mandatory vertex data ----------

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    // ---------- Optional atutributes ----------

    if(this.hasUVs){
      this.uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    }
  }

  enableBuffers(handles){

    // ---------- Mandatory vertex data ----------

    if(handles.positionHandle != null){
      gl.enableVertexAttribArray(handles.positionHandle);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(handles.positionHandle, 3, gl.FLOAT, false, 0, 0);
    }else{
      console.error("ERROR: No property \"positionHandle\" provided.");
    }

    // ---------- Optional attributes ----------

    if(handles.vertexUVHandle != null){
      if(this.hasUVs){
        gl.enableVertexAttribArray(handles.vertexUVHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(handles.vertexUVHandle, 2, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have UVs.");
      }
    }
  }

  setVertexBuffer(vertexBuffer){
    this.vertexBuffer = vertexBuffer;
  }

  getVertexBuffer(){
    return this.vertexBuffer;
  }

  setUVBuffer(uvBuffer){
    this.uvBuffer = uvBuffer;
  }

  getUVBuffer(){
    return this.uvBuffer;
  }

  setModelMatrix(modelMatrix){
    this.modelMatrix = modelMatrix;
  }

  getModelMatrix(){
    return this.modelMatrix;
  }

}
