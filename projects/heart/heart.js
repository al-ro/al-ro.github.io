const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    //|| navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
    );

if(mobile){
  canvas_1.width = 720;
  canvas_1.height = 450;
}
var ctx = canvas_1.getContext("2d");
var body = [];

var scale = canvas_1.width/canvas_1.scrollWidth;
document.getElementById('canvas_1').style.cursor = "none";


var mouse_pos_x = canvas_1.width/2;
var mouse_pos_y = canvas_1.height/2;
var delta = 1;
var step = 0;
var loop = 0;
var line = 0;
var lineMax = 60;
var lineMin = 20;

if(mobile){
  lineMax = 20;
  lineMin = 5;
}

var TWO_PI = 2 * Math.PI;
var t = 0;
var animate = true;
var op = 1;

var bodyLength = 20;

function getPos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX * scale - rect.left,
      y: evt.touches[0].clientY * scale - rect.top
  };
}

canvas_1.addEventListener('mouseleave', mouse_leave);
canvas_1.addEventListener('mousemove', mouse_track);

canvas_1.addEventListener("touchend", touch_end);
canvas_1.addEventListener("touchcancel", touch_cancel);
canvas_1.addEventListener("touchmove", touch_move);

function touch_move(event) {
  event.preventDefault();
  animate = false;
  if((Math.abs(mouse_pos_x - event.touches[0].clientX) > delta) || (Math.abs(mouse_pos_y - event.touches[0].clientY) > delta)){
    mouse_pos_x = getPos(canvas_1, event).x;
    mouse_pos_y = getPos(canvas_1, event).y;
  }
}
function touch_end(event) {
  animate = true;
}
function touch_cancel(event) {
  animate = true;
}

function mouse_leave(){
  animate = true;
}

function mouse_track(event) {
  animate = false;
  if((Math.abs(mouse_pos_x - event.clientX) > delta) || (Math.abs(mouse_pos_y - event.clientY) > delta)){
    mouse_pos_x = event.offsetX * scale;
    mouse_pos_y = event.offsetY * scale;
  }
}


//Colours from:
//https://krazydad.com/tutorials/makecolors.php
var red = [];
var grn = [];
var blu = [];

center = 128;
width = 127;
frequency1 = 0.3;
frequency2 = 0.3;
frequency3 = 0.3;

phase1 = 0;
phase2 = 2;
phase3 = 4;

for (s = 0; s < bodyLength; s++) {
  red[s] = Math.round(Math.sin(frequency1*s + phase1) * width + center);
  grn[s] = Math.round(Math.sin(frequency2*s + phase2) * width + center);
  blu[s] = Math.round(Math.sin(frequency3*s + phase3) * width + center);
}

size = Math.min(canvas_1.width, canvas_1.height)/50;
//See below
var startX = canvas_1.width/2 + size * (16 * Math.sin(0) * Math.sin(0) * Math.sin(0));
var startY = 0.95*canvas_1.height - (canvas_1.height/2 + ( size *( 13 * Math.cos(0)  - 5 * Math.cos(0) - 2 * Math.cos(0) - Math.cos(0))));

for (i = 0; i < bodyLength; i++) {
  var b = {
    x: startX,
    y: startY
  };
  body.push(b);
}

//********************** DRAW **********************
function draw() {

  ctx.fillStyle = "rgb(29,32,32)";
  ctx.fillRect(0,0,canvas_1.width,canvas_1.height);

  scale = canvas_1.width/canvas_1.scrollWidth;

  t += 0.08;
  t = t % TWO_PI;

  if(line <= lineMin){
    op = 1;
    line = lineMin+1;
  }
  if(line >= lineMax){
    op = -1;
    line = lineMax-1;
  }

  loop++;
  if(loop == 5){
    step++;
    step = step % bodyLength;
    loop = 0;
  }

  line = op + line;

  if(animate){
    size = Math.min(canvas_1.width, canvas_1.height)/50;
    //Heart curve from:
    //http://mathworld.wolfram.com/HeartCurve.html
    mouse_pos_x = canvas_1.width/2 + size * (16 * Math.sin(t) * Math.sin(t) * Math.sin(t));
    mouse_pos_y = 0.95 * canvas_1.height - (canvas_1.height/2 + ( size * ( 13 * Math.cos(t)  - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))));
  }

  for (i = (body.length-1); i > 0; i--) {
    body[i].x = body[i-1].x;
    body[i].y = body[i-1].y;
  } 
  body[0].x = mouse_pos_x;
  body[0].y = mouse_pos_y;

  ctx.lineWidth = line; 
  ctx.strokeStyle = "rgb("+red[step]+","+grn[step]+","+blu[step]+")";
  ctx.fillStyle = "rgb("+red[step]+","+grn[step]+","+blu[step]+")";

  //Draw leading circle
  ctx.beginPath();
  ctx.arc((body[0].x), (body[0].y), line/2, 0, TWO_PI);
  ctx.fill();

  //Draw line
  ctx.beginPath();
  ctx.moveTo(body[0].x, body[0].y);

  for(s = 0; s < body.length - 2; s++){

    //Bezier curve along points taken from: 
    //http://stackoverflow.com/questions/7054272/how-to-draw-smooth-curve-through-n-points-using-javascript-html5-canvas_1

    var xc = (body[s].x + body[s+1].x) / 2;
    var yc = (body[s].y + body[s+1].y) / 2;
    ctx.quadraticCurveTo(body[s].x, body[s].y, xc, yc);
  }
  ctx.stroke();

  //Draw trailing circle
  ctx.beginPath();
  ctx.arc(xc, yc, line/2, 0, TWO_PI);
  ctx.fill();

  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
