import { programRepository } from "../programRepository.js"

export class Material {

	/** Names of all attributes supported by the material */
	attributes = [];

	program;

	instanced = false;
	timestamped = false;
	needsEnvironmentTexture = false;

	constructor() { }

	destroy() { }

	initializeProgram(attributes, geometry) {
		if (this.program == null) {
			this.program = programRepository.getProgram(this, geometry, attributes);
			this.bindUniformBlocks();
			this.getUniformHandles();
		}
	}

	bindUniforms() { }

	bindUniformBlocks() { }

	setPipeline() { }
}
