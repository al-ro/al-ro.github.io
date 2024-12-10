import { gl } from "./canvas.js"
import { AlphaModes, RenderPass } from "./enums.js"

function rendersInPass(renderPass, material) {
	switch (renderPass) {
		case RenderPass.TRANSMISSIVE: return material.hasTransmission;
		case RenderPass.TRANSPARENT: return material.alphaMode == AlphaModes.BLEND;
		case RenderPass.OPAQUE: return !material.hasTransmission && material.alphaMode != AlphaModes.BLEND;
		case RenderPass.ALWAYS: return true;
		default: return false;
	}
}

export function render(renderPass, mesh, environment = null) {

	if (!(mesh != null && mesh.material != null && mesh.geometry != null && !mesh.material.program.delete)) {
		return;
	}

	if (!rendersInPass(renderPass, mesh.material)) {
		return;
	}

	if (mesh.material.doubleSided) {
		gl.disable(gl.CULL_FACE);
	} else {
		gl.enable(gl.CULL_FACE);
	}

	gl.useProgram(mesh.material.program.program);
	mesh.bindVAO();

	mesh.material.modelMatrix = mesh.worldMatrix;
	mesh.material.normalMatrix = mesh.normalMatrix;

	if (mesh.material.needsEnvironmentTexture && environment != null) {
		mesh.material.environmentTexture = environment.cubeMap;
	}

	mesh.material.bindUniforms();

	if (mesh.geometry.hasIndices) {
		if (mesh.geometry.instanced) {
			gl.drawElementsInstanced(
				mesh.geometry.primitiveType,
				mesh.geometry.length,
				mesh.geometry.indices.type,
				0,
				mesh.geometry.instances
			);
		} else {
			gl.drawElements(mesh.geometry.primitiveType, mesh.geometry.length, mesh.geometry.indices.type, 0);
		}
	} else {
		gl.drawArrays(mesh.geometry.primitiveType, 0, mesh.geometry.length);
	}

	mesh.unbindVAO();
}