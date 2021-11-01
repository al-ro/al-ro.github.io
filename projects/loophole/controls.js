import {canvas, gl, canvasMultiplier} from "./canvas.js"
export class Controls{

  constructor(){
    //https://stackoverflow.com/questions/49091584/javascript-es6-addeventlistener-inside-class
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
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
    //this.camera.setAspect(gl.canvas.clientWidth / gl.canvas.clientHeight);
  }
}

