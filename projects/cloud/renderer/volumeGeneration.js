import { download } from "./download.js";
import { createAndSetupTexture, createAndSetup3DTexture } from "./texture.js";
import { RenderPass } from "./enums.js";
import { getScreenspaceQuad } from "./screenspace.js";
import { RenderTarget } from "./renderTarget.js";
import { Mesh } from "./mesh.js";
import { render } from "./renderCall.js";
import { gl } from "./canvas.js";
import { NoiseMaterial } from "./materials/noiseMaterial.js";

let dataRepository = new Map();

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


/**
 * Set an 8^3 tile of data at the given coordinates
 * @param {uint_8[]} data dense data array
 * @param {int_32[3]} dimensions tile resolution of domain
 * @param {uint_16[3]} coordinates tile coordinates
 * @param {uint_8[512]} tileData tile data
 */
function setTile(data, dimensions, coordinates, tileData) {

	// The global index in the dense data where the given tile's first element goes
	let idx =
		coordinates[2] * dimensions[0] * 8 * dimensions[1] * 8 * 8 +
		coordinates[1] * 8 * dimensions[0] * 8 +
		coordinates[0] * 8;

	// z-slices of the tile
	for (let z = 0; z < 8; z++) {
		// Incremented idx for current z-slice
		let localIdx = idx;

		// Rows of the tile
		for (let y = 0; y < 8; y++) {
			// Where in the tile the row is
			let tileIdx = z * 8 * 8 + y * 8;

			// Grab a row of 8 values from the tile
			let row = tileData.subarray(tileIdx, tileIdx + 8);

			// Place it in the dense data array
			data.set(row, localIdx);

			// Go forward a row
			localIdx += dimensions[0] * 8;
		}

		// Go up a z-slice
		idx += dimensions[0] * 8 * dimensions[1] * 8;
	}
}

/*
	width					uint16
	height				uint16
	depth					uint16
	count					uint16
	coordinates		uint16[count]
	data					uint8[count]
*/
function getVDBData(path) {

	// Return an already created texture
	if (dataRepository.has(path)) {
		return dataRepository.get(path);
	}

	let vdbTexture = createAndSetup3DTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_3D, vdbTexture);
	gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, 1, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));

	// Insert into repostiory for subsequent calls for same texture
	dataRepository.set(path, vdbTexture);

	download(path, "arrayBuffer").then((data) => {

		const header = new DataView(data);

		let resolution = [
			header.getUint16(0, true),
			header.getUint16(2, true),
			header.getUint16(4, true)
		];

		let nodeCount = header.getUint16(6, true);

		let dimensions = [resolution[0] / 8, resolution[1] / 8, resolution[2] / 8];
		let cloudData = new Uint8Array(resolution[0] * resolution[1] * resolution[2]);

		const coordinates = new Uint16Array(data, 8, 3 * nodeCount);
		const nodeData = new Uint8Array(data, 8 + coordinates.byteLength, 8 * 8 * 8 * nodeCount);

		for (let i = 0; i < nodeCount; i++) {
			setTile(cloudData, dimensions, coordinates.subarray(i * 3, i * 3 + 3), nodeData.subarray(i * 512, i * 512 + 512));
		}

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, vdbTexture);
		gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, resolution[0], resolution[1], resolution[2], 0, gl.RED, gl.UNSIGNED_BYTE, cloudData);
	});

	return vdbTexture;
}

/*
	width					uint16
	height				uint16
	depth					uint16
	count					uint16
	coordinates		uint16[count]
	data					uint8[count]
*/
function convert16bitTo8bit(data) {

	let parts = [];

	const header = new DataView(data);

	let resolution = [
		8 * Math.ceil(header.getUint16(0, true) / 8),
		8 * Math.ceil(header.getUint16(2, true) / 8),
		8 * Math.ceil(header.getUint16(4, true) / 8)
	];

	parts.push(new Uint16Array(resolution));

	let nodeCount = header.getUint32(12, true);

	parts.push(new Uint16Array([nodeCount]));

	const coordinates = new Int32Array(data, 32, 3 * nodeCount);

	// Store UNSIGNED_SHORT instead of SIGNED_INT
	let compressedCoordinates = new Uint16Array(coordinates);

	parts.push(compressedCoordinates);

	const nodeData = new Uint16Array(data, 32 + coordinates.byteLength, 8 * 8 * 8 * nodeCount);

	// Store UNSIGNED_BYTE instead of UNSIGNED_SHORT
	let compressedData = new Uint8Array(nodeData.length);

	for (let i = 0; i < nodeData.length; i++) {
		if (nodeData[i] > 0) {
			let a = nodeData[i] / 65535;
			let x = 255 * a;
			compressedData[i] = x;
		}
	}
	parts.push(compressedData);

	return new Blob(parts);
}

export { renderTo3DTexture, getVDBData }