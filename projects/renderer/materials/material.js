import { programRepository } from "../programRepository.js"

export class Material {

  /** Names of all attributes supported by the material */
  attributes = [];

  program;

  instanced = false;

  supportsMorphTargets = false;
  hasMorphTargets = false;
  morphTexture;

  supportsSkin = false;
  hasSkin = false;
  skinTexture;

  needsEnvironmentTexture = false;
  needsBRDFLUT = false;

  modelMatrix = m4.create();
  normalMatrix = m4.create();

  skinTextureHandle;
  morphTargetTextureHandle;
  morphTargetParametersHandle;
  morphTargetWeightsHandle;

  constructor() { }

  destroy() { }

  initializeProgram(attributes, geometry) {
    if (this.program == null) {
      this.program = programRepository.getProgram(this, geometry, attributes);
      this.bindUniformBlocks();
      this.getUniformHandles();
    }
  }

  enableSkin() {
    if (!this.hasSkin && this.program != null && this.supportsSkin) {
      this.hasSkin = true;
      this.skinTextureHandle = this.program.getOptionalUniformLocation('jointMatricesTexture');
    }
  }

  enableMorphTargets() {
    if (!this.hasMorphTargets && this.program != null && this.supportsMorphTargets) {
      this.hasMorphTargets = true;
      this.morphTargetTextureHandle = this.program.getOptionalUniformLocation('morphTargetTexture');
      this.morphTargetWeightsHandle = this.program.getOptionalUniformLocation('morphTargetWeights');
    }
  }

  bindUniforms() { }

  bindUniformBlocks() { }

  setPipeline() { }
}
