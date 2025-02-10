import { download } from "./download.js"
import { gl } from "./canvas.js"
import { UniformBufferBindPoints } from "./enums.js"
import { createAndSetupCubemap } from "./texture.js"
import { EnvironmentMaterial } from "./materials/environmentMaterial.js"
import { Mesh } from "./mesh.js";
import { getScreenspaceQuad } from "./screenspace.js";
import { createAndSetupTexture } from "./texture.js"

import { loadHDR } from "./hdrpng.js"
import { getSphericalHarmonicsMatrices, getBRDFIntegrationTexture, getCubeMapConvolution, convertToCubeMap } from "./iblUtils.js";

class Environment {
  /**
   * Type of the file passed in
   * "cubemap" or "hdr"
   */
  type = "cubemap";

  // Internal representation is a cube map
  cubeMap;

  camera;

  environmentMaterial;
  environmentMesh;

  shMatrices;

  brdfIntegrationTexture;

  updateHDR = false;

  loadFlags = [false, false, false, false, false, false];

  // [mat4, mat4, mat4]
  shUniformBuffer;
  shArray = new Float32Array(3 * 16);

  constructor(parameters) {

    let path = parameters.path;
    this.camera = parameters.camera;

    if (!path) {
      console.error("Environment must be created with a file path. Parameters: ", parameters);
    }

    this.cubeMap = createAndSetupCubemap();

    this.environmentMaterial = new EnvironmentMaterial(this.cubeMap, this.camera, this);
    this.environmentMesh = new Mesh({ geometry: getScreenspaceQuad(), material: this.environmentMaterial });
    this.environmentMesh.cull = false;

    this.shMatrices = { red: m4.create(), green: m4.create(), blue: m4.create() };
    this.setupBRDFIntegrationTexture();

    this.type = parameters.type;

    if (this.type == "cubemap") {
      this.setupCubemap(path);
    } else if (this.type == "hdr") {
      this.setHDR(path);
    } else {
      console.log("Unknown or missing environment map type: ", this.type);
    }

    this.shUniformBuffer = gl.createBuffer();
    gl.bindBufferBase(gl.UNIFORM_BUFFER, UniformBufferBindPoints.SPHERICAL_HARMONICS, this.shUniformBuffer);
    this.uploadSHMatrices();

  }

  generateIBLData() {
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
    this.updateHDR = false;
  }

  updateFace = function (i, obj) {
    obj.loadFlags[i] = true;
  }

  setupCubemap(path) {

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);

    let obj = this;

    for (let i = 0; i < 6; i++) {
      const image = new Image();
      image.onload = function () {
        const target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;

        const level = 0;
        const internalFormat = gl.RGB;
        const format = gl.RGB;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(target, level, internalFormat, format, type, image);

        obj.updateFace(i, obj);
      }

      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      image.src = path;
    }
  }

  setHDR(path) {

    download(path, "arrayBuffer").then(data => {

      let hdr = loadHDR(new Uint8Array(data));

      let texture = createAndSetupTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, hdr.width, hdr.height, 0, gl.RGB, gl.FLOAT, hdr.dataFloat);

      let type = hdr.width == hdr.height ? "angular" : "equirectangular";

      convertToCubeMap(texture, this.cubeMap, type);
      gl.deleteTexture(texture);

      this.generateIBLData();

    });
  }

  calculateSHMatrices() {
    this.shMatrices = getSphericalHarmonicsMatrices(this.cubeMap);
    this.uploadSHMatrices();
  }

  /**
   * Copy spherical harmonics matrices into the uniform buffer on the GPU
   */
  uploadSHMatrices() {
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.shUniformBuffer);
    this.shArray.set(this.shMatrices.red, 0);
    this.shArray.set(this.shMatrices.green, 16);
    this.shArray.set(this.shMatrices.blue, 32);
    gl.bufferData(gl.UNIFORM_BUFFER, this.shArray, gl.STATIC_DRAW);

    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  convoluteCubeMap() {
    this.cubeMap = getCubeMapConvolution(this.cubeMap);
  }

  setupBRDFIntegrationTexture() {
    this.brdfIntegrationTexture = getBRDFIntegrationTexture();
  }

  getSHMatrices() {
    return this.shMatrices;
  }

  getCubeMap() {
    return this.cubeMap;
  }

  getMesh() {
    return this.environmentMesh;
  }
}

export { Environment }
