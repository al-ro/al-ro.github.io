import {gl} from "./canvas.js"
import {createAndSetupCubemap} from "./texture.js"
import {EnvironmentMaterial} from "./materials/environmentMaterial.js"
import {Mesh} from "./mesh.js";
import {getScreenspaceQuad} from "./screenspace.js";
import {getSphericalHarmonicsMatrices, getBRDFIntegrationMap, getCubeMapConvolution} from "./iblUtils.js";

class Environment{
  // Type of the file passed in
  type = "cubemap"; // "cubemap" or "equirectangular"
  
  path = "";
  
  // Internal representation is a cube map
  cubeMap;

  environmentMaterial;
  environmentMesh;
  
  shRedMatrix = m4.create();
  shGrnMatrix = m4.create();
  shBluMatrix = m4.create();

  shMatrices;

  brdfIntegrationMap;

  loadFlags = [false, false, false, false, false];

  constructor(path){

    if(!path){
      console.error("Environment must be created with a file path. Parameter: ", path);
    }

    this.cubeMap = createAndSetupCubemap();

    this.environmentMaterial = new EnvironmentMaterial(this.cubeMap);
    this.environmentMesh = new Mesh(getScreenspaceQuad(), this.environmentMaterial);  

    this.shMatrices = {red: this.shRedMatrix, green: this.shGrnMatrix, blue: this.shBluMatrix};
    this.setupCubemap(path);
    this.setupBRDFIntegrationMap();
  }

  generateIBLData(){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    this.calculateSHMatrices();
    this.convoluteCubeMap();
    this.loadFlags = [false, false, false, false, false];
  }

  updateFace = function(i, obj){
    obj.loadFlags[i] = true;
  }

  needsUpdate(){
    return this.loadFlags.every(function(x){return x;});
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
