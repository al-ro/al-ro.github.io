import {gl, extINS} from "./canvas.js"

export class Geometry{

  geometyData;

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

  indexType = gl.UNSIGNED_SHORT;
  primitiveType = gl.TRIANGLES;

  vertices;
  indices;
  normals;
  uvs;
  tangents;

  vertexBuffer;
  indexBuffer;
  normalBuffer;
  uvBuffer;
  tangentBuffer;

  orientations;
  offsets;
  scales;
  IDs;

  orientationBuffer;
  offsetBuffer;
  scaleBuffer;
  idBuffer;

  modelMatrix = m4.create();
  normalMatrix;

  constructor(geometryData){

    this.geometryData = geometryData;

    if(geometryData.vertices == null){
      console.error("ERROR: no property \"vertices\" provided for geometry.");
    }

    if(geometryData.length == null){
      console.error("ERROR: no property \"length\" provided for geometry.");
    }

    this.vertices = geometryData.vertices;
    this.length = geometryData.length;

    if(geometryData.indices != null){
      this.hasIndices = true;
      this.indices = geometryData.indices;
      if(this.indices.BYTES_PER_ELEMENT == 1){
        this.indexType = gl.UNSIGNED_BYTE;
      } 
      if(this.indices.BYTES_PER_ELEMENT == 4){
        this.indexType = gl.UNSIGNED_INT;
      } 
    }else{
      //console.log("GEOMETRY NOT INDEXED. VERTEX COUNT: ", this.vertices.length/3);
      this.length = this.vertices.length/3;
    }

    if(geometryData.primitiveType != null){
      this.primitiveType = geometryData.primitiveType;
    }

    if(geometryData.normals != null){
      this.hasNormals = true;
      this.normals = geometryData.normals;
    }

    if(geometryData.uvs != null){
      this.hasUVs = true;
      this.uvs = geometryData.uvs;
    }

    if(geometryData.tangents != null){
      this.hasTangents = true;
      this.tangents = geometryData.tangents;
    }

    if(geometryData.instances != null){
      this.instanced = true;
      this.instances = geometryData.instances;
    }

    if(this.instanced){
      if(geometryData.orientations != null){
        this.hasOrientations = true;
        this.orientations = geometryData.orientations;
      }

      if(geometryData.offsets != null){
        this.hasOffsets = true;
        this.offsets = geometryData.offsets;
      }

      if(geometryData.scales != null){
        this.hasScales = true;
        this.scales = geometryData.scales;
      }
    }

    this.createBuffers();
  }

  createBuffers(){
    // ---------- Mandatory vertex data ----------

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    // ---------- Optional attributes ----------

    if(this.hasIndices){
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    }

    if(this.hasNormals){
      this.normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    }

    if(this.hasUVs){
      this.uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    }

    if(this.hasTangents){
      this.tangentBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.tangents, gl.STATIC_DRAW);
    }

    // ---------- Instanced geometry attributes ----------

    if(this.instanced){
      if(this.hasOrientations){
        this.orientationBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.orientationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.orientations, gl.DYNAMIC_DRAW);
      }

      if(this.hasOffsets){
        this.offsetBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.offsets, gl.DYNAMIC_DRAW);
      }

      if(this.hasScales){
        this.scaleBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.scales, gl.DYNAMIC_DRAW);
      }
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

    if(this.hasIndices){
      // Index buffer is always constantly structured and not accessible from the shader
      // Therefore we don't have a handle and don't call vertexAttribPointer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }

    if(handles.vertexNormalHandle != null){
      if(this.hasNormals){
        gl.enableVertexAttribArray(handles.vertexNormalHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(handles.vertexNormalHandle, 3, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have vertex normals.");
      }
    }

    if(handles.vertexUVHandle != null){
      if(this.hasUVs){
        gl.enableVertexAttribArray(handles.vertexUVHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(handles.vertexUVHandle, 2, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have UVs.");
      }
    }

    if(handles.vertexTangentHandle != null){
      if(this.hasTangents){
        gl.enableVertexAttribArray(handles.vertexTangentHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
        gl.vertexAttribPointer(handles.vertexTangentHandle, 4, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have tangents.");
      }
    }

    // ---------- Instanced geometry attributes ----------

    if(handles.orientationHandle != null){
      if(this.hasOrientations){
        gl.enableVertexAttribArray(handles.orientationHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.orientationBuffer);
        gl.vertexAttribPointer(handles.orientationHandle, 4, gl.FLOAT, false, 0, 0);
        extINS.vertexAttribDivisorANGLE(handles.orientationHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance orientations.");
      }
    }

    if(handles.offsetHandle != null){
      if(this.hasOffsets){
        gl.enableVertexAttribArray(handles.offsetHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.vertexAttribPointer(handles.offsetHandle, 3, gl.FLOAT, false, 0, 0);
        extINS.vertexAttribDivisorANGLE(handles.offsetHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance offsets.");
      }
    }

    if(handles.scaleHandle != null){
      if(this.hasScales){
        gl.enableVertexAttribArray(handles.scaleHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer);
        gl.vertexAttribPointer(handles.scaleHandle, 3, gl.FLOAT, false, 0, 0);
        extINS.vertexAttribDivisorANGLE(handles.scaleHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance scales.");
      }
    }

  }

  setVertexBuffer(vertexBuffer){
    this.vertexBuffer = vertexBuffer;
  }

  getVertexBuffer(){
    return this.vertexBuffer;
  }

  setIndexBuffer(indexBuffer){
    this.indexBuffer = indexBuffer;
  }

  getIndexBuffer(){
    return this.indexBuffer;
  }

  setNormalBuffer(normalBuffer){
    this.normalBuffer = normalBuffer;
  }

  getNormalBuffer(){
    return this.normalBuffer;
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

  setNormalMatrix(normalMatrix){
    this.normalMatrix = normalMatrix;
  }

  getNormalMatrix(){
    return this.normalMatrix;
  }

}
