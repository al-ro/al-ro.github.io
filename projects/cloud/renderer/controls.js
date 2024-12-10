import { canvas, gl, canvasMultiplier } from "./canvas.js"
export class Controls {

	isMouseDown = false;
	lastPosition = [0, 0];

	mouseDelta = [0, 0];

	maxDistance = 1000.0;

	resolutionMultiplier = canvasMultiplier;

	camera;

	constructor(camera) {
		this.camera = camera;

		//https://stackoverflow.com/questions/49091584/javascript-es6-addeventlistener-inside-class
		canvas.addEventListener('mousedown', this.mouseDown.bind(this));
		canvas.addEventListener('mouseup', this.mouseUp.bind(this));
		canvas.addEventListener('mousemove', this.mouseMove.bind(this));
		canvas.addEventListener('wheel', this.onScroll.bind(this));
		window.addEventListener('resize', this.onWindowResize.bind(this), false);
	}

	setMultiplier(multiplier) {
		this.resolutionMultiplier = multiplier;
		this.onWindowResize();
	}

	getPosition(canvas, evt) {
		let rect = canvas.getBoundingClientRect();
		return [evt.clientX - rect.left, evt.clientY - rect.top];
	}

	mouseDown(event) {
		this.isMouseDown = true;
		this.lastPosition = this.getPosition(canvas, event);
	}

	mouseUp(event) {
		this.isMouseDown = false;
		this.mouseDelta = [0, 0];
	}

	mouseMove(event) {
		if (this.isMouseDown) {
			let position = this.getPosition(canvas, event);
			this.mouseDelta[0] = this.lastPosition[0] - position[0];
			this.mouseDelta[1] = this.lastPosition[1] - position[1];

			this.camera.updatePosition(this.mouseDelta);

			this.lastPosition = position;
		}
	}

	onScroll(event) {
		event.preventDefault();
		let dist = this.camera.distance;
		dist += event.deltaY * 0.001;
		dist = Math.min(Math.max(0.0001, dist), this.maxDistance);
		this.camera.updateDistance(dist);
	}

	setPageLayout(w, h) {
		let canvasOverlay = document.getElementById("canvas_overlay");
		canvasOverlay.style.width = w + "px";
		canvasOverlay.style.height = h + "px";
		canvasOverlay.style.bottom = h + "px";
		canvasOverlay.style.visibility = "hidden";

		let canvasContainer = document.getElementById("canvas_container");
		canvasContainer.style.height = h + "px";
	}

	onWindowResize() {
		var w = canvas.clientWidth;
		var h = canvas.clientHeight;
		if (!isInFullscreen()) {
			h = w / 1.6;
		}
		canvas.width = w * this.resolutionMultiplier;
		canvas.height = h * this.resolutionMultiplier;

		this.setPageLayout(w, h);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	}
}

