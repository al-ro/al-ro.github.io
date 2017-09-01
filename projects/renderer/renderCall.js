import { gl, enums, RenderPass } from "./canvas.js"

function rendersInPass(renderPass, material) {
  switch (renderPass) {
    case RenderPass.TRANSMISSIVE: return material.hasTransmission;
    case RenderPass.TRANSPARENT: return material.alphaMode == enums.BLEND;
    default: return !material.hasTransmission && material.alphaMode != enums.BLEND;
  }
}

export function render(renderPass, mesh, camera, time) {

  if (!(mesh != null && mesh.material != null && mesh.geometry != null)) {
    return;
  }

  if (!rendersInPass(renderPass, mesh.material)) {
    return;
  }

  if (camera != null && !camera.insideFrustum()) {
    return;
  }

  if (mesh.material.doubleSided) {
    gl.disable(gl.CULL_FACE);
  } else {
    gl.enable(gl.CULL_FACE);
  }

  gl.useProgram(mesh.material.getProgram().program);
  mesh.bindVAO();

  if (camera != null) {
    mesh.material.bindMatrices({
      projectionMatrix: camera.getProjectionMatrix(),
      viewMatrix: camera.getViewMatrix(),
      modelMatrix: mesh.getWorldMatrix(),
      normalMatrix: mesh.getNormalMatrix()
    });
  }

  if (mesh.material.needsCamera) {
    mesh.material.setCamera(camera);
  }

  if (mesh.material.needsTime) {
    mesh.material.setTime(time);
  }

  mesh.material.bindParameters();

  if (mesh.geometry.hasIndices) {
    if (mesh.geometry.instanced) {
      gl.drawElementsInstanced(mesh.geometry.getPrimitiveType(),
        mesh.geometry.getLength(),
        mesh.geometry.getIndices().getType(),
        0,
        mesh.geometry.instances);
    } else {
      gl.drawElements(mesh.geometry.getPrimitiveType(), mesh.geometry.getLength(), mesh.geometry.getIndices().getType(), 0);
    }
  } else {
    gl.drawArrays(mesh.geometry.getPrimitiveType(), 0, mesh.geometry.getLength());
  }

  mesh.unbindVAO();
}