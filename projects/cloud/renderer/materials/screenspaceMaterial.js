import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './screenspaceMaterial.glsl.js'

export class ScreenspaceMaterial extends Material {

	textureHandle;
	texture;

	constructor(texture) {

		super();

		this.attributes = ["POSITION", "TEXCOORD_0"];

		if (texture == null) {
			console.error("ScreenspaceMaterial requires a texture during construction. Provided: ", texture);
		}

		this.texture = texture;
	}

	getVertexShaderSource(parameters) {
		return getVertexSource(parameters);
	}

	getFragmentShaderSource() {
		return getFragmentSource();
	}

	getUniformHandles() {
		this.textureHandle = this.program.getUniformLocation('tex');
	}

	bindUniforms() {

		// Tell WebGL we want to affect texture unit 0
		gl.activeTexture(gl.TEXTURE0);

		// Bind the texture to texture unit 0
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		// Tell the shader we bound the texture to texture unit 0
		gl.uniform1i(this.textureHandle, 0);
	}

}
