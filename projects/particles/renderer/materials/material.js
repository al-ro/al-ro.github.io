import { programRepository } from "../programRepository.js"

export class Material {

  /** Names of all attributes supported by the material */
  attributes = [];

  program;

  timestamped = false;
  doubleSided = false;

  supportsMorphTargets = false;
  hasMorphTargets = false;

  supportsSkin = false;
  hasSkin = false;

  needsEnvironmentTexture = false;
  needsBRDFLUT = false;

  modelMatrix = m4.create();
  normalMatrix = m4.create();

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
