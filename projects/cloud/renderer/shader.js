import { gl } from "./canvas.js"

/**
 * Generate hash defines to toggle specific parts of shaders according to
 * geometry and material data
 * @param {Material} material Material object
 * @param {string[]} attributes array of vertex attribute names
 * @returns prefix for shader string
 */
function getDefinePrefix(material, attributes) {

	var prefix = "#version 300 es \n// " + material.constructor.name + " \n";

	if (material.timestamped) {
		let time = new Date();
		prefix += "\n// Created: " + time.toLocaleString() + ":" + time.getMilliseconds() + "\n\n";
	}

	prefix += "precision highp float;\n";

	if (attributes.includes("TEXCOORD_0")) {
		prefix += "#define HAS_UV_0 \n";
	}

	if (material.hasTransmission) {
		prefix += "#define HAS_TRANSMISSION \n";
	}

	return prefix;
}

function compileShader(shaderSource, shaderType) {

	var shader = gl.createShader(shaderType);

	gl.shaderSource(shader, shaderSource);
	try {
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			// Print the error followed by the source with line numbers
			throw "Shader compile failed with: " + gl.getShaderInfoLog(shader) +
			"\n <------ Shader source ------> \n" + shaderSource.split('\n').map((line, index) => { return "" + (index + 1) + "\t" + line; }).join('\n');
		}
	} catch (error) {
		console.error(error);
	}

	return shader;
}

export { compileShader, getDefinePrefix }
