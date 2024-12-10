import { gl } from "./canvas.js"
import { UniformBufferBindPoints } from "./enums.js"
export class Camera {

	position = [0, 0, 1];
	target = [0, 0, 0];
	distance = 1;

	viewDirection = [0, 0, -1];
	rightDirection = [1, 0, 0];
	pitch = 0;
	yaw = 0;

	fov = 45;
	aspect = 1;
	up = [0, 1, 0];
	zNear = 0.1;
	zFar = 1.0;

	perspectiveMatrix;
	cameraMatrix;
	viewMatrix;

	// Frustum planes where xyz is normal and w is offset
	left = [0, 0, 0, 0];
	right = [0, 0, 0, 0];
	bottom = [0, 0, 0, 0];
	top = [0, 0, 0, 0];
	near = [0, 0, 0, 0];
	far = [0, 0, 0, 0];

	exposure = 1.0;

	// [mat4, mat4, mat4]
	matrixUniformBuffer;
	matrixUniformArray = new Float32Array(48);

	// [vec3, float, float] rest unused
	fragmentUniformBuffer;
	fragmentUniformArray = new Float32Array(8);

	constructor(pitch, yaw, distance, target, up, fov, aspect, zNear, zFar) {
		this.pitch = pitch;
		this.yaw = yaw;

		this.distance = distance;
		this.target = target;
		this.up = up;

		this.fov = fov;
		this.aspect = aspect;
		this.zNear = zNear;
		this.zFar = zFar;

		this.updatePosition([0, 0]);

		this.setProjectionMatrix();
		this.setCameraMatrix();
		this.setViewMatrix();

		this.matrixUniformBuffer = gl.createBuffer();
		gl.bindBufferBase(gl.UNIFORM_BUFFER, UniformBufferBindPoints.CAMERA_MATRICES, this.matrixUniformBuffer);
		this.fragmentUniformBuffer = gl.createBuffer();
		gl.bindBufferBase(gl.UNIFORM_BUFFER, UniformBufferBindPoints.CAMERA_UNIFORMS, this.fragmentUniformBuffer);
		this.uploadUniformBuffers();
	}

	updatePosition(delta) {
		let yawChange = (delta[0] * 0.01) % (2.0 * Math.PI);
		this.yaw -= yawChange;

		let pitchChange = (delta[1] * 0.01) % (2.0 * Math.PI);
		this.pitch += pitchChange;

		this.yaw = mod(this.yaw, 2.0 * Math.PI);
		this.pitch = Math.max(0.01, Math.min(Math.PI - 0.01, this.pitch));

		this.position[0] = Math.cos(this.yaw) * Math.sin(this.pitch);
		this.position[1] = Math.cos(this.pitch);
		this.position[2] = Math.sin(this.yaw) * Math.sin(this.pitch);

		this.position = normalize(this.position);
		this.position[0] *= this.distance;
		this.position[1] *= this.distance;
		this.position[2] *= this.distance;

		this.position = add(this.position, this.target);
	}

	updateDistance(distance) {
		this.distance = distance;
		this.updatePosition([0, 0]);
	}

	setProjectionMatrix() {
		this.projectionMatrix = m4.perspective(this.fov, this.aspect, this.zNear, this.zFar);
	}

	setCameraMatrix() {
		this.cameraMatrix = m4.lookAt(this.position, this.target, this.up);
	}

	setViewMatrix() {
		this.viewMatrix = m4.inverse(this.cameraMatrix);
	}

	update() {
		this.setProjectionMatrix();
		this.setCameraMatrix();
		this.setViewMatrix();
		this.calculateFrustumPlanes();
		this.uploadUniformBuffers();
	}

	/**
	 * Upload camera data into GPU buffers
	 */
	uploadUniformBuffers() {
		gl.bindBuffer(gl.UNIFORM_BUFFER, this.matrixUniformBuffer);
		this.matrixUniformArray.set(this.viewMatrix, 0);
		this.matrixUniformArray.set(this.projectionMatrix, 16);
		this.matrixUniformArray.set(this.cameraMatrix, 32);
		gl.bufferData(gl.UNIFORM_BUFFER, this.matrixUniformArray, gl.DYNAMIC_DRAW);

		gl.bindBuffer(gl.UNIFORM_BUFFER, this.fragmentUniformBuffer);
		this.fragmentUniformArray.set(this.position, 0);
		this.fragmentUniformArray.set([this.exposure], 3);
		this.fragmentUniformArray.set([this.fov], 4);
		gl.bufferData(gl.UNIFORM_BUFFER, this.fragmentUniformArray, gl.DYNAMIC_DRAW);

		gl.bindBuffer(gl.UNIFORM_BUFFER, null);
	}

	// Return whether any part of the AABB is inside or overlaps the camera frustum
	insideFrustum(min, max) {
		let corners = getAABBFromExtent(min, max);

		// Record the largest dot product of all corners with all planes
		let maxDotProducts = [-1, -1, -1, -1, -1, -1];
		for (let i = 0; i < 8; i++) {
			maxDotProducts[0] = Math.max(maxDotProducts[0], m4.dot([this.left[0], this.left[1], this.left[2]], corners[i]) + this.left[3]);
			maxDotProducts[1] = Math.max(maxDotProducts[1], m4.dot([this.right[0], this.right[1], this.right[2]], corners[i]) + this.right[3]);
			maxDotProducts[2] = Math.max(maxDotProducts[2], m4.dot([this.bottom[0], this.bottom[1], this.bottom[2]], corners[i]) + this.bottom[3]);
			maxDotProducts[3] = Math.max(maxDotProducts[3], m4.dot([this.top[0], this.top[1], this.top[2]], corners[i]) + this.top[3]);
			maxDotProducts[4] = Math.max(maxDotProducts[4], m4.dot([this.near[0], this.near[1], this.near[2]], corners[i]) + this.near[3]);
			maxDotProducts[5] = Math.max(maxDotProducts[5], m4.dot([this.far[0], this.far[1], this.far[2]], corners[i]) + this.far[3]);
		}

		// AABB is is inside or overlaps the camera frustum if there are no planes of the frustum where all 
		// corners of the AABB are on the negative side of the plane normal
		return maxDotProducts.filter(x => x < 0).length == 0;
	}

	/**
	 * Calculate the frustum planes in world space from the combined view and projection matrices
	 * using the Gribb/Hartmann method
	 * https://www8.cs.umu.se/kurser/5DV051/HT12/lab/plane_extraction.pdf
	 * https://stackoverflow.com/questions/12836967/extracting-view-frustum-planes-gribb-hartmann-method
	 * 
	 * Plane normals are not normalized
	 */
	calculateFrustumPlanes() {
		let mat = m4.multiply(this.projectionMatrix, this.viewMatrix);
		for (let i = 0; i < 4; i++) {
			// 4th and 1st rows
			this.left[i] = mat[3 + i * 4] + mat[i * 4];
			this.right[i] = mat[3 + i * 4] - mat[i * 4];

			// 4th and 2nd rows
			this.bottom[i] = mat[3 + i * 4] + mat[1 + i * 4];
			this.top[i] = mat[3 + i * 4] - mat[1 + i * 4];

			// 4th and 3rd rows
			this.near[i] = mat[3 + i * 4] + mat[2 + i * 4];
			this.far[i] = mat[3 + i * 4] - mat[2 + i * 4];
		}
	}

}

