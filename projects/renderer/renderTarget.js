import { gl } from "./canvas.js"

/**
 * Wrapper for GL FrameBuffer with attached textures
 */
export class RenderTarget {

	colorTexture;
	depthTexture;
	frameBuffer;

	constructor(colorTexture, depthTexture) {
		this.frameBuffer = gl.createFramebuffer();
		if (colorTexture != null) {
			this.colorTexture = colorTexture;
			this.attachTexture(colorTexture, gl.COLOR_ATTACHMENT0);
		}
		if (depthTexture != null) {
			this.depthTexture = depthTexture;
			this.attachTexture(depthTexture, gl.DEPTH_ATTACHMENT);
		}
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
			console.log("Render target framebuffer incomplete:", this);
		}
	}

	destroy() {
		gl.deleteFramebuffer(frameBuffer);
	}

	setColorTexture(texture) {
		this.colorTexture = texture;
		this.attachTexture(texture, gl.COLOR_ATTACHMENT0);
	}

	setDepthTexture(texture) {
		this.depthTexture = texture;
		this.attachTexture(texture, gl.DEPTH_ATTACHMENT);
	}

	setSize(width, height) {
		if (this.colorTexture != null) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
		if (this.depthTexture != null) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	}

	bind() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	}

	attachTexture(texture, attachment) {
		this.bind();
		gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, texture, 0);
	}

}
