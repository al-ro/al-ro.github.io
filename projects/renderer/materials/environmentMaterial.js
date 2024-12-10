import { gl } from "../canvas.js"
import { UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './environmentMaterial.glsl.js'

export class EnvironmentMaterial extends Material {

	cubeMapHandle;
	cubeMap;

	resolutionHandle;

	constructor(cubeMap) {

		super();

		this.attributes = ["POSITION"];

		if (cubeMap != null) {
			this.cubeMap = cubeMap;
		} else {
			console.error("Environment material must be created with a cube map texture. Parameter: ", cubeMap);
		}

	}

	getVertexShaderSource(parameters) {
		return getVertexSource();
	}

	getFragmentShaderSource() {
		return getFragmentSource();
	}

	bindUniformBlocks() {
		this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
		this.program.bindUniformBlock("cameraUniforms", UniformBufferBindPoints.CAMERA_UNIFORMS);
	}

	getUniformHandles() {
		this.cubeMapHandle = this.program.getUniformLocation('environmentCubeMap');
		this.resolutionHandle = this.program.getUniformLocation('resolution');
	}

	bindUniforms() {
		gl.uniform2f(this.resolutionHandle, gl.canvas.width, gl.canvas.height);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMap);
		gl.uniform1i(this.cubeMapHandle, 0);
	}
}
