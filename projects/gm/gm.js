var ctx = canvas_1.getContext("2d");
canvas_1.width = window.innerWidth;
canvas_1.height = window.innerHeight;

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

var speed = 40;

var TWO_PI = 2 * Math.PI;

var w = 50;
var h = 50;
var onGround = false;
var keyPressed = true;

var character = {

  x_pos: 100,
  y_pos: 100,
  x_vel: 0,
  y_vel: 0,
  width: h,
  hwidth: w/2,
  height: h,
  hheight: h/2

};

function keyDown(event) {
  keyPressed = true;
  switch (event.keyCode) {
    case 37:
      event.preventDefault();
      character.x_vel = -speed;
      break;
    case 38:
      event.preventDefault();
      if(onGround){
        character.y_vel = -1.5*speed;
      }
      break;
    case 39:
      event.preventDefault();
      character.x_vel = speed;
      break;
    case 40:
      event.preventDefault();
      //character.y_vel = speed;
      break;
  }
}

function keyUp(event) {
  switch (event.keyCode) {
    case 37:
    case 39:
      keyPressed = false;
      if(onGround){
        character.x_vel = 0;
      }
      break;
    case 38:
    case 40:
      if(onGround){
        character.y_vel = 0;
      }
      break;
  }
}

window.addEventListener("keydown", keyDown);
window.addEventListener("keypress", keyDown);
window.addEventListener("keyup", keyUp);


function move(){
  character.y_vel += 6;
  character.x_pos += character.x_vel;
  character.y_pos += character.y_vel;

  if(character.x_pos + character.hwidth > canvas_1.width){
    character.x_pos = canvas_1.width-character.hwidth;
  }
  if(character.x_pos - character.hwidth < 0){
    character.x_pos = character.hwidth;
  }
  if(character.y_pos + character.hheight > canvas_1.height){
    character.y_pos = canvas_1.height-character.hheight;
    character.y_vel = 0;
    if(!keyPressed){
      character.x_vel /= 2;
    }
    onGround = true;
  }else{ 
    onGround = false;
  }
  if(character.y_pos - character.hheight < 0){
    character.y_pos = character.hheight;
  }

}

function draw() {
  move();
  canvas_1.width = window.innerWidth;
  canvas_1.height = window.innerHeight;

  ctx.strokeStyle = "rgb(255,255,255)";
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.fillRect(character.x_pos-character.hwidth, character.y_pos-character.hheight, character.width, character.height);
  ctx.stroke();

  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);

