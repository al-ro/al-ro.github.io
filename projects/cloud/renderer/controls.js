import { canvas, gl, canvasMultiplier } from "./canvas.js"
export class Controls {

  isPointerDown = false;
  lastPosition = [0, 0];

  pointerDelta = [0, 0];

  maxDistance = 1000.0;

  resolutionMultiplier = canvasMultiplier;

  camera;

  eventCache = [];
  prevDiff = -1;

  constructor(camera) {
    this.camera = camera;

    //https://stackoverflow.com/questions/49091584/javascript-es6-addeventlistener-inside-class
    canvas.addEventListener('pointerdown', this.pointerDown.bind(this));
    canvas.addEventListener('pointerup', this.pointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.pointerUp.bind(this));
    canvas.addEventListener('pointercancel', this.pointerUp.bind(this));
    canvas.addEventListener('pointerout', this.pointerUp.bind(this));
    canvas.addEventListener('pointermove', this.pointerMove.bind(this));
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

  pointerDown(event) {
    this.eventCache.push(event);
    this.lastPosition = this.getPosition(canvas, event);
  }

  removeEvent(event) {
    const index = this.eventCache.findIndex(
      (cachedEv) => cachedEv.pointerId === event.pointerId,
    );
    this.eventCache.splice(index, 1);
  }

  pointerUp(event) {
    this.pointerDelta = [0, 0];
    this.removeEvent(event);

    if (this.eventCache.length < 2) {
      this.prevDiff = -1;
    }
  }

  pointerMove(event) {
    const index = this.eventCache.findIndex(
      (cachedEv) => cachedEv.pointerId === event.pointerId,
    );
    this.eventCache[index] = event;

    if (this.eventCache.length === 2) {

      const curDiff = Math.hypot(
        this.eventCache[0].clientX - this.eventCache[1].clientX,
        this.eventCache[0].clientY - this.eventCache[1].clientY);

      if (this.prevDiff > 0) {
        let dist = this.camera.distance;
        dist += (this.prevDiff - curDiff) * 0.01;
        dist = Math.min(Math.max(0.0001, dist), this.maxDistance);
        this.camera.updateDistance(dist);
      }

      this.prevDiff = curDiff;

    } else {

      if (event.buttons > 0) {
        let position = this.getPosition(canvas, event);
        this.pointerDelta[0] = this.lastPosition[0] - position[0];
        this.pointerDelta[1] = this.lastPosition[1] - position[1];

        this.camera.updatePosition(this.pointerDelta);

        this.lastPosition = position;
      }
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

