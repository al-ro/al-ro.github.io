/**
 * Functions and arrays to create, store and manage IBL related data such as
 * environment map convolution and spherical harmonics
 */

import { gl } from "./canvas.js"
import { RenderPass } from "./enums.js"
import { SphericalHarmonicsMaterial } from "./materials/sphericalHarmonicsMaterial.js"
import { BRDFMapMaterial } from "./materials/brdfMapMaterial.js"
import { ConvolutionMaterial } from "./materials/convolutionMaterial.js"
import { CubeMapConverterMaterial } from "./materials/cubeMapConverterMaterial.js"
import { getScreenspaceQuad } from "./screenspace.js"
import { Mesh } from "./mesh.js"
import { createAndSetupTexture } from "./texture.js"
import { render } from "./renderCall.js"

//https://www.khronos.org/opengl/wiki/Cubemap_Texture
var viewDirections = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1]];

var upDirections = [
	[0, -1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1],
	[0, -1, 0],
	[0, -1, 0]];

/**
 * Generate R, G and B matrices to represent the spherical harmonics (SH) of a cube map
 * Read the values from the color attachment and copy them into m4 matrices
 * Return an object with the matrices for ambient lighting shading
 * @param {WebGLTexture} cubeMap 
 * @returns 
 */
function getSphericalHarmonicsMatrices(cubeMap) {


	let shRedMatrix;
	let shGrnMatrix;
	let shBluMatrix;

	let shMaterial = new SphericalHarmonicsMaterial(cubeMap);
	let mesh = new Mesh({ geometry: getScreenspaceQuad(), material: shMaterial });
	mesh.cull = false;

	// Create a 4x3 framebuffer and render into it using the SH material
	let frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	gl.viewport(0, 0, 4, 3);

	let texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, 3, 0, gl.RGBA, gl.FLOAT, null);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	render(RenderPass.OPAQUE, mesh);

	var pixels = new Float32Array(3 * 4 * 4);
	gl.readPixels(0, 0, 4, 3, gl.RGBA, gl.FLOAT, pixels);

	gl.deleteFramebuffer(frameBuffer);
	gl.deleteTexture(texture);

	/**
	 * The shader outputs column major data
	 * SH matrices are symmetric so column vs row major are the same
	 */
	for (let mat = 0; mat < 3; mat++) {
		let matrix = [];
		for (let column = 0; column < 4; column++) {
			for (let row = 0; row < 4; row++) {
				let idx = mat * 16 + column * 4 + row;
				matrix.push(pixels[idx]);
			}
		}
		switch (mat) {
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

	//console.log(shRedMatrix);
	//console.log(shGrnMatrix);
	//console.log(shBluMatrix);

	return { red: shRedMatrix, green: shGrnMatrix, blue: shBluMatrix };
}

function convertToCubeMap(sphericalTexture, cubeMap, type = "equirectangular") {

	let texture = createAndSetupTexture();

	let cubeMapConverterMaterial = new CubeMapConverterMaterial(sphericalTexture);
	cubeMapConverterMaterial.textureType = type;
	let mesh = new Mesh({ geometry: getScreenspaceQuad(), material: cubeMapConverterMaterial });
	mesh.cull = false;

	let frameBuffer = gl.createFramebuffer();

	let size = 512;
	gl.viewport(0, 0, size, size);

	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

	for (let face = 0; face < 6; face++) {

		cubeMapConverterMaterial.setCameraMatrix(m4.lookAt([0, 0, 0], viewDirections[face], upDirections[face]));

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		render(RenderPass.OPAQUE, mesh);

		let target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + face;

		gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
		gl.texImage2D(target, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
		gl.copyTexSubImage2D(target, 0, 0, 0, 0, 0, size, size);
	}

	gl.deleteFramebuffer(frameBuffer);
	gl.deleteTexture(texture);

	return cubeMap;
}

/**
 * For each cubemap mipmap level, run a convolution based on roughness
 * Copy result into cubemap faces
 */
function getCubeMapConvolution(cubeMap) {

	let texture = createAndSetupTexture();

	let size;

	let convolutionMaterial = new ConvolutionMaterial(cubeMap);
	let mesh = new Mesh({ geometry: getScreenspaceQuad(), material: convolutionMaterial });
	mesh.cull = false;

	let frameBuffer = gl.createFramebuffer();

	for (let level = 1; level < 6; level++) {

		let roughness = 0.2 * level;
		convolutionMaterial.roughness = roughness;

		size = 512 / Math.pow(2, level);
		gl.viewport(0, 0, size, size);

		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

		for (let face = 0; face < 6; face++) {

			convolutionMaterial.setCameraMatrix(m4.lookAt([0, 0, 0], viewDirections[face], upDirections[face]));

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

			render(RenderPass.OPAQUE, mesh);
			var target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + face;

			gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
			gl.copyTexSubImage2D(target, level, 0, 0, 0, 0, size, size);
		}
	}

	gl.deleteFramebuffer(frameBuffer);
	gl.deleteTexture(texture);

	return cubeMap;
}

function getBRDFIntegrationTexture() {
	let texture = createAndSetupTexture();

	let size = 256;

	let brdfMaterial = new BRDFMapMaterial([size, size]);
	let mesh = new Mesh({ geometry: getScreenspaceQuad(), material: brdfMaterial });
	mesh.cull = false;

	// Create a 256x256 framebuffer and render into it using the BRDF integration material
	let frameBuffer = gl.createFramebuffer();
	gl.viewport(0, 0, size, size);
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	render(RenderPass.OPAQUE, mesh);

	gl.deleteFramebuffer(frameBuffer);

	return texture;
}

export { getSphericalHarmonicsMatrices, getBRDFIntegrationTexture, getCubeMapConvolution, convertToCubeMap }
