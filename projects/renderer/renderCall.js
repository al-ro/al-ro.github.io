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

export function render(renderPass, mesh, camera, environment, cullCamera) {

  if (!(mesh != null && mesh.material != null && mesh.geometry != null)) {
    return;
  }

  if (!rendersInPass(renderPass, mesh.material)) {
    return;
  }

  if (mesh.cullingEnabled()) {
    if (cullCamera == null) {
      cullCamera = camera;
    }
    if (cullCamera != null && !cullCamera.insideFrustum(mesh.min, mesh.max)) {
      return;
    }
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

  if (mesh.hasWeights && mesh.material.supportsMorphTargets) {
    mesh.material.setWeights(mesh.weights);
  }

  if (mesh.hasSkin() && mesh.skin != null) {
    mesh.skin.update();
  }

  if (mesh.material.needsEnvironmentTexture && environment != null) {
    mesh.material.environmentTexture = environment.cubeMap;
  }

  if (mesh.material.needsBRDFLUT && environment != null && mesh.material.brdfIntegrationTexture == null) {
    mesh.material.brdfIntegrationTexture = environment.brdfIntegrationTexture;
  }

  if (mesh.hasSkin() && mesh.material.supportsSkin && mesh.skin != null) {
    mesh.material.skinTexture = mesh.skin.texture;
  }

  mesh.material.bindUniforms();

  if (mesh.geometry.hasIndices) {
    if (mesh.geometry.instanced) {
      gl.drawElementsInstanced(mesh.geometry.primitiveType,
        mesh.geometry.length,
        mesh.geometry.indices.type,
        0,
        mesh.geometry.instances);
    } else {
      gl.drawElements(mesh.geometry.primitiveType, mesh.geometry.length, mesh.geometry.indices.type, 0);
    }
  } else {
    gl.drawArrays(mesh.geometry.primitiveType, 0, mesh.geometry.length);
  }

  mesh.unbindVAO();
}