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

export function render(renderPass, mesh, camera, time, cullCamera) {

  if (!(mesh != null && mesh.getMaterial() != null && mesh.getGeometry() != null)) {
    return;
  }

  if (!rendersInPass(renderPass, mesh.getMaterial())) {
    return;
  }

  if (mesh.cullingEnabled()) {
    if (cullCamera == null) {
      cullCamera = camera;
    }
    if (cullCamera != null && !cullCamera.insideFrustum(mesh.getMin(), mesh.getMax())) {
      return;
    }
  }

  if (mesh.getMaterial().doubleSided) {
    gl.disable(gl.CULL_FACE);
  } else {
    gl.enable(gl.CULL_FACE);
  }

  gl.useProgram(mesh.getMaterial().getProgram().program);
  mesh.bindVAO();

  if (camera != null) {
    mesh.getMaterial().bindMatrices({
      projectionMatrix: camera.getProjectionMatrix(),
      viewMatrix: camera.getViewMatrix(),
      modelMatrix: mesh.getWorldMatrix(),
      normalMatrix: mesh.getNormalMatrix()
    });
  }

  if (mesh.getMaterial().needsCamera) {
    mesh.getMaterial().setCamera(camera);
  }

  if (mesh.getMaterial().needsTime) {
    mesh.getMaterial().setTime(time);
  }

  if (mesh.hasWeights && mesh.getMaterial().supportsMorphTargets) {
    mesh.getMaterial().setWeights(mesh.getWeights());
  }
  mesh.getMaterial().bindParameters();

  if (mesh.getGeometry().hasIndices) {
    if (mesh.getGeometry().instanced) {
      gl.drawElementsInstanced(mesh.getGeometry().getPrimitiveType(),
        mesh.getGeometry().getLength(),
        mesh.getGeometry().getIndices().getType(),
        0,
        mesh.getGeometry().instances);
    } else {
      gl.drawElements(mesh.getGeometry().getPrimitiveType(), mesh.getGeometry().getLength(), mesh.getGeometry().getIndices().getType(), 0);
    }
  } else {
    gl.drawArrays(mesh.getGeometry().getPrimitiveType(), 0, mesh.getGeometry().getLength());
  }

  mesh.unbindVAO();
}