import {canvas, gl, canvasMultiplier} from "./canvas.js"
export class Controls{

  isMouseDown = false;
  lastPosition = [0, 0];

  mouseDelta = [0, 0];

  maxDistance = 1000.0;

  camera;

  constructor(camera){
    this.camera = camera;

    //https://stackoverflow.com/questions/49091584/javascript-es6-addeventlistener-inside-class
    canvas.addEventListener('mousedown', this.mouseDown.bind(this));
    canvas.addEventListener('mouseup', this.mouseUp.bind(this));
    canvas.addEventListener('mousemove', this.mouseMove.bind(this));
    canvas.addEventListener('wheel', this.onScroll.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));
  }

  getPos(canvas, evt){
    let rect = canvas.getBoundingClientRect();
    return [evt.clientX - rect.left, evt.clientY - rect.top];
  }

  mouseDown(event){
    this.isMouseDown = true;
    this.lastPosition = this.getPos(canvas, event);
  }

  mouseUp(event){
    this.isMouseDown = false;
    this.mouseDelta = [0, 0];
  }

  mouseMove(event){
    if(this.isMouseDown){
      let pos = this.getPos(canvas, event);
      this.mouseDelta[0] = this.lastPosition[0] - pos[0];
      this.mouseDelta[1] = this.lastPosition[1] - pos[1];

      this.camera.updatePosition(this.mouseDelta);

      this.lastPosition = pos;
    }
  }

  onScroll(event){
    event.preventDefault();
    let dist = this.camera.distance;
    dist += event.deltaY * 0.025;
    dist = Math.min(Math.max(0.0001, dist), this.maxDistance);
    this.camera.updateDistance(dist);
  }


  //************** User movement **************
  forward = false;
  backward = false;
  left = false;
  right = false;
  
  keyDown(e){
    if(e.keyCode == 38 || e.keyCode == 40){
      e.preventDefault();
    }
    if(e.keyCode == 87 || e.keyCode == 38) {
      this.forward = true;
    }
    if(e.keyCode == 83 || e.keyCode == 40) {
      this.backward = true;
    }
    if(e.keyCode == 65 || e.keyCode == 37) {
      this.left = true;
    }
    if(e.keyCode == 68 || e.keyCode == 39) {
      this.right = true;
    }
  };

  keyUp(e){
    if(e.keyCode == 87 || e.keyCode == 38) {
      this.forward = false;
    }
    if(e.keyCode == 83 || e.keyCode == 40) {
      this.backward = false;
    }
    if(e.keyCode == 65 || e.keyCode == 37) {
      this.left = false;
    }
    if(e.keyCode == 68 || e.keyCode == 39) {
      this.right = false;
    }
  };

  move(dT){

    let speed = 800.0;
    let viewDirection = this.camera.viewDirection;
    let rightDirection = this.camera.rightDirection;
    let pos = this.camera.position;

    if(this.forward){
      pos[0] += dT * speed * viewDirection[0];
      pos[1] += dT * speed * viewDirection[1];
      pos[2] += dT * speed * viewDirection[2];
    }
    if(this.backward){
      pos[0] -= dT * speed * viewDirection[0];
      pos[1] -= dT * speed * viewDirection[1];
      pos[2] -= dT * speed * viewDirection[2];
    }
    if(this.left){
      pos[0] += dT * speed * rightDirection[0];
      pos[1] += dT * speed * rightDirection[1];
      pos[2] += dT * speed * rightDirection[2];
    }
    if(this.right){
      pos[0] -= dT * speed * rightDirection[0];
      pos[1] -= dT * speed * rightDirection[1];
      pos[2] -= dT * speed * rightDirection[2];
    }

    //this.camera.setPosition(pos);

  }


  onWindowResize(){
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if(!isInFullscreen()){
      h = w / 1.6;
    }
    canvas.width = w * canvasMultiplier;
    canvas.height = h * canvasMultiplier;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    this.camera.setAspect(gl.canvas.clientWidth / gl.canvas.clientHeight);
  }
}

