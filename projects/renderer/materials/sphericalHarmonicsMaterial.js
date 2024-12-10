import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './sphericalHarmonicsMaterial.glsl.js'

export class SphericalHarmonicsMaterial extends Material {

	cubeMapHandle;
	cubeMap;

	constructor(cubeMap) {

		super();

		this.attributes = ["POSITION"];

		if (!cubeMap) {
			console.error("SphericalHarmonicsMaterial must be created with a cube map texture. Parameter: ", cubeMap);
		}
		this.cubeMap = cubeMap;
	}

	getVertexShaderSource(parameters) {
		return getVertexSource();
	}

	getFragmentShaderSource() {
		return getFragmentSource();
	}

	getUniformHandles() {
		this.cubeMapHandle = this.program.getUniformLocation('environmentCubeMap');
	}

	bindUniforms() {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
		gl.uniform1i(this.cubeMapHandle, 0);
	}

}
