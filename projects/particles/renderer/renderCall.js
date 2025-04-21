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

  if (!(mesh != null && mesh.material != null && mesh.geometry != null && !mesh.material.program.delete && mesh.material.program.valid)) {
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

  if (mesh.instanced) {

    if (mesh.geometry.hasIndices) {
      gl.drawElementsInstanced(
        mesh.geometry.primitiveType,
        mesh.geometry.length,
        mesh.geometry.indices.type,
        0,
        mesh.instances
      );
    } else {
      gl.drawArraysInstanced(
        mesh.geometry.primitiveType,
        0,
        mesh.geometry.length,
        mesh.instances
      );
    }
  } else {

    if (mesh.geometry.hasIndices) {
      gl.drawElements(mesh.geometry.primitiveType, mesh.geometry.length, mesh.geometry.indices.type, 0);
    } else {
      gl.drawArrays(mesh.geometry.primitiveType, 0, mesh.geometry.length);
    }
  }

  mesh.unbindVAO();
}