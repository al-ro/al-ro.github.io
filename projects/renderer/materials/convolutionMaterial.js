import { gl } from "../canvas.js"
import { Material } from './material.js'
import { getVertexSource, getFragmentSource } from './convolutionMaterial.glsl.js'

export class ConvolutionMaterial extends Material {

	environmentCubeMap;
	cubeMapHandle;

	roughness;
	roughnessHandle;

	cameraMatrix
	cameraMatrixHandle;

	constructor(environmentCubeMap) {

		super();

		this.attributes = ["POSITION"];

		if (!environmentCubeMap) {
			console.error("ConvolutionMaterial must be created with a cube map. Parameter: ", environmentCubeMap);
		}
		this.environmentCubeMap = environmentCubeMap;
	}

	getVertexShaderSource(parameters) {
		return getVertexSource();
	}

	getFragmentShaderSource() {
		return getFragmentSource();
	}

	getUniformHandles() {
		this.cubeMapHandle = this.program.getUniformLocation('environmentCubeMap');
		this.roughnessHandle = this.program.getUniformLocation('roughness');
		this.cameraMatrixHandle = this.program.getUniformLocation('cameraMatrix');
	}

	bindUniforms() {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.environmentCubeMap);
		gl.uniform1i(this.cubeMapHandle, 0);

		gl.uniform1f(this.roughnessHandle, this.roughness);
		gl.uniformMatrix4fv(this.cameraMatrixHandle, false, this.cameraMatrix);
	}

	setCameraMatrix(cameraMatrix) {
		this.cameraMatrix = cameraMatrix;
	}

}
