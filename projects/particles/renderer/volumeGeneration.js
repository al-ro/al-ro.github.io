import { createAndSetupTexture, createAndSetup3DTexture } from "./texture.js";
import { RenderPass } from "./enums.js";
import { getScreenspaceQuad } from "./screenspace.js";
import { RenderTarget } from "./renderTarget.js";
import { Mesh } from "./mesh.js";
import { render } from "./renderCall.js";
import { gl } from "./canvas.js";
import { NoiseMaterial } from "./materials/noiseMaterial.js";

// Render to a single channel 3D texture
function renderTo3DTexture(width, materialClass) {

  // Main texture where the scene is rendered
  let renderTexture = createAndSetupTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, width, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  let renderTarget = new RenderTarget(renderTexture, null, gl.RGBA8, gl.RGBA);

  let quad = getScreenspaceQuad();
  let material = new materialClass();
  let mesh = new Mesh({ geometry: quad, material: material });
  mesh.cull = false;

  let data = new Uint8Array(width * width * width);
  let pixels = new Uint8Array(4 * width * width);
  let pixelsRed = new Uint8Array(width * width);

  renderTarget.setSize(width, width);
  renderTarget.bind();
  gl.viewport(0, 0, width, width);
  gl.depthFunc(gl.ALWAYS);

  let offset = 0;
  for (let i = 0; i < width; i++) {
    material.slice = i / width;
    render(RenderPass.OPAQUE, mesh);

    // Ideally we would render to a single channel texture and then read it but this is not universally supported
    // https://webgl2fundamentals.org/webgl/lessons/webgl-readpixels.html
    gl.readPixels(0, 0, width, width, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    for (let j = 0; j < width * width; j++) {
      pixelsRed[j] = pixels[4 * j];
    }

    data.set(pixelsRed, offset);
    offset += pixelsRed.length;
  }

  gl.deleteTexture(renderTexture);
  renderTarget.destroy();

  // Create 3D texture
  let texture = createAndSetup3DTexture(materialClass == NoiseMaterial ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, width, width, width, 0, gl.RED, gl.UNSIGNED_BYTE, data);

  return texture;
}

export { renderTo3DTexture }