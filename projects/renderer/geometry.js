import {gl, extINS} from "./canvas.js"
import {Attribute} from "./attribute.js"

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
  hasColours = false;

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

  vertexAttribute;
  indexAttribute;
  normalAttribute;
  uvAttribute;
  tangentAttribute;
  colourAttribute;

  orientationAttribute;
  offsetAttribute;
  scaleAttribute;

  modelMatrix = m4.create();
  normalMatrix = m4.create();

  constructo(geometryData){

    this.setAttributes(geometryData.attributes);

    this.length = geometryData.length;
    if(geometryData.hasOwnProperty("indices") && geometryData.indices){
      this.hasIndices = true;
      this.indexType = geometryData.indexType;
    }

    if(geometryData.hasOwnProperty("primitiveType") && geometryData.primitiveType != null){
      this.primitiveType = geometryData.primitiveType;
    }
    console.log(this);
  }

  setAttributes(attributes){
    for(const attribute of attributes){
      switch(attribute.name){
        case "POSITION":
          this.positionAttribute = attribute;
          break
        case "NORMAL":
          this.hasNormals = true;
          this.normalAttribute = attribute;
          break
        case "TANGENT":
          this.hasTangents = true;
          this.tangentAttribute = attribute;
          break
        case "TEXCOORD_0":
          this.hasUVs = true;
          this.uvAttribute = attribute;
          break
        case "TEXCOORD_1":
          this.hasUVs = true;
          this.uvAttribute = attribute;
          break
        case "COLOR_0":
          this.hasColours = true;
          this.colourAttribute = attribute;
          break
        case "INSTANCE_IDX":
          this.hasIDs = true;
          this.instanceIndexAttribute = attribute;
          break
        case "INSTANCE_ORIENTATION":
          this.hasOrientation = true;
          this.orientationAttribute = attribute;
          break
        case "INSTANCE_SCALE":
          this.hasScales = true;
          this.scaleAttribute = attribute;
          break
        case "INSTANCE_OFFSET":
          this.hasOffsets = true;
          this.offsetAttribute = attribute;
          break
        default:
          console.error("Unknown attribute: ", attribute);
      }
    }
  }
 
  enableBuffers(handles){

    // ---------- Mandatory vertex data ----------

    if(handles.hasOwnProperty("positionHandle")){
      this.positionAttribute.enableBuffer(handles.positionHandle);
    }else{
      console.error("ERROR: No property \"positionHandle\" provided.");
    }

    // ---------- Optional attributes ----------

    if(this.hasIndices){
      this.indices.enableBuffer();
    }

    if(handles.hasOwnProperty("positionHandle")){
      this.positionAttribute.enableBuffer(handles.positionHandle);
    }else{
      console.error("ERROR: geometry does not have vertex normals.");
    }

    if(handles.hasOwnProperty("vertexNormalHandle")){
      if(this.hasNormals){
        this.normalAttribute.enableBuffer(handles.vertexNormalHandle);
      }else{
        console.error("ERROR: geometry does not have vertex normals.");
      }
    }

    if(handles.hasOwnProperty("vertexTangentHandle")){
      if(this.hasTangents){
        this.tangentAttribute.enableBuffer(handles.vertexTangentHandle);
      }else{
        console.error("ERROR: geometry does not have vertex tangents.");
      }
    }

    if(handles.hasOwnProperty("vertexUVHandle")){
      if(this.hasUVs){
        this.uvAttribute.enableBuffer(handles.vertexUVHandle);
      }else{
        console.error("ERROR: geometry does not have vertex UVs.");
      }}

    if(handles.hasOwnProperty("vertexColourHandle")){
      if(this.hasColours){
        this.colourAttribute.enableBuffer(handles.vertexColourHandle);
      }else{
        console.error("ERROR: geometry does not have vertex colours.");
      }
    }

    // ---------- Instanced geometry attributes ----------

    if(handles.hasOwnProperty("orientationHandle")){
      if(this.hasOrientations){
        this.orientationAttribute.bindBuffer(handles.orientationHandle);
        extINS.vertexAttribDivisorANGLE(handles.orientationHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance orientations.");
      }
    }

    if(handles.hasOwnProperty("offsetHandle")){
      if(this.hasOffsets){
        this.offsetAttribute.bindBuffer(handles.offsetHandle);
        extINS.vertexAttribDivisorANGLE(handles.offsetHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance offsets.");
      }
    }

    if(handles.hasOwnProperty("scaleHandle")){
      if(this.hasScales){
        this.scaleAttribute.bindBuffer(handles.scaleHandle);
        extINS.vertexAttribDivisorANGLE(handles.scaleHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance scales.");
      }
    }

  }

  constructor(geometryData){

    this.geometryData = geometryData;

    if(!geometryData.hasOwnProperty("vertices")){
      console.error("ERROR: no property \"vertices\" provided for geometry.");
    }

    if(!geometryData.hasOwnProperty("length")){
      console.error("ERROR: no property \"length\" provided for geometry.");
    }

    this.vertices = geometryData.vertices;
    this.length = geometryData.length;

    if(geometryData.hasOwnProperty("indices") && geometryData.indices){
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

    if(geometryData.hasOwnProperty("primitiveType") && geometryData.primitiveType != null){
      this.primitiveType = geometryData.primitiveType;
    }

    if(geometryData.hasOwnProperty("normals") && geometryData.normals){
      this.hasNormals = true;
      this.normals = geometryData.normals;
    }

    if(geometryData.hasOwnProperty("uvs") && geometryData.uvs){
      this.hasUVs = true;
      this.uvs = geometryData.uvs;
    }

    if(geometryData.hasOwnProperty("tangents") && geometryData.tangents){
      this.hasTangents = true;
      this.tangents = geometryData.tangents;
    }

    if(geometryData.hasOwnProperty("instances")){
      this.instanced = true;
      this.instances = geometryData.instances;
    }

    if(this.instanced){
      if(geometryData.hasOwnProperty("orientations")){
        this.hasOrientations = true;
        this.orientations = geometryData.orientations;
      }

      if(geometryData.hasOwnProperty("offsets")){
        this.hasOffsets = true;
        this.offsets = geometryData.offsets;
      }

      if(geometryData.hasOwnProperty("scales")){
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

    if(handles.hasOwnProperty("positionHandle")){
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

    if(handles.hasOwnProperty("vertexNormalHandle")){
      if(this.hasNormals){
        gl.enableVertexAttribArray(handles.vertexNormalHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(handles.vertexNormalHandle, 3, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have vertex normals.");
      }
    }

    if(handles.hasOwnProperty("vertexUVHandle")){
      if(this.hasUVs){
        gl.enableVertexAttribArray(handles.vertexUVHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(handles.vertexUVHandle, 2, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have UVs.");
      }
    }

    if(handles.hasOwnProperty("vertexTangentHandle")){
      if(this.hasTangents){
        gl.enableVertexAttribArray(handles.vertexTangentHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
        gl.vertexAttribPointer(handles.vertexTangentHandle, 4, gl.FLOAT, false, 0, 0);
      }else{
        console.error("ERROR: geometry does not have tangents.");
      }
    }

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

    if(handles.hasOwnProperty("offsetHandle")){
      if(this.hasOffsets){
        gl.enableVertexAttribArray(handles.offsetHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.vertexAttribPointer(handles.offsetHandle, 3, gl.FLOAT, false, 0, 0);
        extINS.vertexAttribDivisorANGLE(handles.offsetHandle, 1);
      }else{
        console.error("ERROR: geometry does not have instance offsets.");
      }
    }

    if(handles.hasOwnProperty("scaleHandle")){
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
