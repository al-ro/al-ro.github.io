import {gl} from "./canvas.js";
import {download} from "./download.js"

function createAndSetupTexture() {
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

function createAndSetupCubemap() {
  let cubeMapSize = 1;

  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
 
  for(let i = 0; i < 6; i++){
    const target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;

    const level = 0;
    const internalFormat = gl.RGBA32F;
    const width = cubeMapSize;
    const height = cubeMapSize;
    const format = gl.RGBA;
    const type = gl.FLOAT;

    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

  }

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}


//
/**
 * Initialize a texture and load an image.
 * When the image finished loading copy it into the texture.
 * @param {string} url URL to data
 * @param {AbortSignal} signal abort signal
 * @returns WebGL Texture object
 */
function loadTexture(url, signal = null) {

  let texture = gl.createTexture();

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;

  // Initialize texture with a grey pixel
  const pixel = new Uint8Array([128, 128, 128, 255]);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const image = new Image();
  let objectURL;

  image.onload = function() {
    if(texture != null && gl.isTexture(texture)){
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      URL.revokeObjectURL(objectURL);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  };

  download(url, "blob", signal).then(data => {
    if(!!data){
      objectURL = URL.createObjectURL(data);
      image.src = objectURL;
    }
  }).catch(e => {
    console.error("Error fetching image: ", e.message);
  });

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

export {loadTexture, createAndSetupTexture, createAndSetupCubemap}
