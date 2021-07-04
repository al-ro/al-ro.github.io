// Functions and arrays to create, store and manage IBL related data such as 
// environment map convolution and spherical harmonics.

import {gl} from "./canvas.js"
import {SphericalHarmonicsMaterial} from "./materials/sphericalHarmonicsMaterial.js"
import {getScreenspaceQuad} from "./screenspace.js"
import {Mesh} from "./mesh.js"

function getSphericalHarmonicsMatrices(cubeMap){
  // Generate R, G and B matrices to represent the spherical harmonics (SH) of a cube map
  // Read the values from the colour attachment and copy them into m4 matrices
  // Return an object with the matrices for ambient lighting shading

  let shRedMatrix;
  let shGrnMatrix;
  let shBluMatrix;

  let quad = getScreenspaceQuad();
  let shMaterial = new SphericalHarmonicsMaterial(cubeMap);
  let mesh = new Mesh(quad, shMaterial);

  // Create a 4x3 framebuffer and render into it using the SH material
  let frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 3, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  mesh.render(null, 0);

  var pixels = new Uint8Array(3*4*4);
  gl.readPixels(0, 0, 4, 3, gl.RGBA, gl.UNSIGNED_BYTE, pixels); 

  for(let mat = 0; mat < 3; mat++){
    let matrix = [];
    for(let column = 0; column < 4; column++){
      for(let row = 0; row < 4; row++){
        let idx = mat * 16 + column * 4 + row;
        matrix.push(pixels[idx]/255);
      }
    }
    switch(mat) {
      case 0:
        shRedMatrix = matrix;
        break;
      case 1:
        shGrnMatrix = matrix;
        break;
      default:
        shBluMatrix = matrix;
    }
  }
  console.log(shRedMatrix);
  console.log(shGrnMatrix);
  console.log(shBluMatrix);

  return {red: shRedMatrix, green: shGrnMatrix, blue: shBluMatrix};
}

export {getSphericalHarmonicsMatrices}
