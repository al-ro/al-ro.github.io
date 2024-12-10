import { gl } from "./canvas.js";
import { download } from "./download.js"

function createAndSetupTexture() {
	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	return texture;
}

function createAndSetup3DTexture(wrapMode = gl.CLAMP_TO_EDGE) {
	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_3D, texture);

	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, wrapMode);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, wrapMode);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, wrapMode);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	return texture;
}

function createAndSetupCubemap() {

	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

	for (let i = 0; i < 6; i++) {
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
	}

	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	return texture;
}

/**
 * Initialize a texture and load an image.
 * When the image finished loading copy it into the texture.
 * @param {{url: string,
 *          signal: AbortSignal,
 *          format: gl.RGBA | gl.RGB }} parameters
 * @returns WebGL Texture object
 */
function loadTexture(parameters) {

	let signal = null;
	if (parameters.signal != null) {
		signal = parameters.signal;
	}

	let format = gl.RGBA;
	if (parameters.format != null) {
		format = parameters.format;
	}

	let texture = gl.createTexture();

	const internalFormat = format;
	const srcFormat = format;
	const srcType = gl.UNSIGNED_BYTE;

	// Initialize texture with a grey pixel
	const pixel = new Uint8Array([128, 128, 128, 255]);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, srcFormat, srcType, pixel);
	gl.bindTexture(gl.TEXTURE_2D, null);

	const image = new Image();
	let objectURL;

	image.onload = function () {
		if (texture != null && gl.isTexture(texture)) {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, srcFormat, srcType, image);

			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

			URL.revokeObjectURL(objectURL);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	};

	download(parameters.url, "blob", signal).then(data => {
		if (!!data) {
			objectURL = URL.createObjectURL(data);
			image.src = objectURL;
		}
	}).catch(e => {
		console.error("Error fetching image: ", e.message);
	});

	return texture;
}

export { loadTexture, createAndSetupTexture, createAndSetupCubemap, createAndSetup3DTexture }
