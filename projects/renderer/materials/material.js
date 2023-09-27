import { programRepository } from "../programRepository.js"

export class Material {

  attributeHandles = {};

  /** Names of all attributes supported by the material */
  attributes = [];

  program;

  instanced = false;
  supportsMorphTargets = false;
  supportsSkin = false;
  hasSkin = false;
  needsEnvironmentTexture = false;
  needsBRDFLUT = false;

  modelMatrix = m4.create();
  normalMatrix = m4.create();

  constructor() { }

  destroy() { }

  initializeProgram(attributes, morphTargets) {
    if (this.program == null) {
      this.program = programRepository.getProgram(this, attributes, morphTargets);
      this.bindUniformBlocks();
      this.getUniformHandles();
    }
  }

  bindUniforms() { }

  bindUniformBlocks() { }

  isInstanced() {
    return this.instanced;
  }

  setPipeline() { }
}
