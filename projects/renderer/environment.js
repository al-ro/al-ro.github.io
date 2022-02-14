import {gl} from "./canvas.js"
import {createAndSetupCubemap} from "./texture.js"
import {EnvironmentMaterial} from "./materials/environmentMaterial.js"
import {Mesh} from "./mesh.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {createAndSetupTexture} from "./texture.js"
import {getSphericalHarmonicsMatrices, getBRDFIntegrationMap, getCubeMapConvolution, convertToCubeMap} from "./iblUtils.js";

class Environment{
  // Type of the file passed in
  type = "cubemap"; // "cubemap" or "hdr"

  path = "";

  // Internal representation is a cube map
  cubeMap;

  hdr;

  camera;

  environmentMaterial;
  environmentMesh;

  shRedMatrix = m4.create();
  shGrnMatrix = m4.create();
  shBluMatrix = m4.create();

  shMatrices;

  brdfIntegrationMap;

  hdrLoaded = false;

  loadFlags = [false, false, false, false, false, false];

  constructor(parameters){

    let path = parameters.path;
    this.camera = parameters.camera;

    if(!path){
      console.error("Environment must be created with a file path. Parameter: ", parameters);
    }

    this.cubeMap = createAndSetupCubemap();

    this.environmentMaterial = new EnvironmentMaterial(this.cubeMap, this.camera, this);
    this.environmentMesh = new Mesh(getScreenspaceQuad(), this.environmentMaterial);  

    this.shMatrices = {red: this.shRedMatrix, green: this.shGrnMatrix, blue: this.shBluMatrix};
    this.setupBRDFIntegrationMap();

    this.type = parameters.type;

    if(this.type == "cubemap"){
      this.setupCubemap(path);
    }else if(this.type == "hdr"){
      this.setupHDR(path);
    }else{
      console.log("Unknown or missing environement map type: ", this.type);
    }

  }

  generateIBLData(){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    this.convoluteCubeMap();
    this.calculateSHMatrices();

    this.loadFlags = [false, false, false, false, false, false];
    this.hdrLoaded = false;
  }

  updateFace = function(i, obj){
    obj.loadFlags[i] = true;
  }

  needsUpdate(){
    if(this.type == "cubemap"){
      return this.loadFlags.every(function(x){return x;});
    }else if(this.type == "hdr"){
      return this.hdrLoaded;
    }
  }

  setupCubemap(path){

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);

    let obj = this;

    for(let i = 0; i < 6; i++){
      const image = new Image();
      image.onload = function(){
        const target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;

        const level = 0;
        const internalFormat = gl.RGBA;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(target, level, internalFormat, format, type, image);

        obj.updateFace(i, obj);
      }

      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      image.src = path;
    }
  }

  setupHDR(path){
    this.HDR = new HDRImage();

    let obj = this;

    this.HDR.onload = function() {
      console.log("HDR loading done");
      let texture = createAndSetupTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1024, 512, 0, gl.RGB, gl.FLOAT, obj.HDR.dataFloat);
      convertToCubeMap(texture, obj.cubeMap, obj.camera);
      obj.hdrLoaded = true;
    }
    this.HDR.src = path;
  }

  calculateSHMatrices(){
    this.shMatrices = getSphericalHarmonicsMatrices(this.cubeMap);
  }

  convoluteCubeMap(){
    this.cubeMap = getCubeMapConvolution(this.cubeMap);
  }

  setupBRDFIntegrationMap(){
    this.brdfIntegrationMap = getBRDFIntegrationMap();
  }

  getSHMatrices(){
    return this.shMatrices;
  }

  getCubeMap(){
    return this.cubeMap;
  }

  getBRDFIntegrationMap(){
    return this.brdfIntegrationMap;
  }

  render(camera, time){
    gl.depthMask(false);
    this.environmentMesh.render(camera, time);
  }
}

export {Environment}
