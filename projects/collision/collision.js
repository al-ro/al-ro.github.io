const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
    );

var ctx = canvas_1.getContext("2d");
var discs = [];
var walls = [];

if(mobile){
  canvas_1.width = 770;
  canvas_1.height = 400;
}
var w_ = canvas_1.width;
var h_ = canvas_1.height;
var scale = w_/canvas_1.scrollWidth;

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}
var frame = 0;
var discCount = 13;

//gravity
var g_const = 9.8;

//time
var time = Date.now();
var dt;

//coefficient of restitution
var restitution = 0.5;

var TWO_PI = 2 * Math.PI;

var wall_x_offset = canvas_1.width * 0.15;
var wall_y_offset = canvas_1.height * 0.15;
var wall_width = canvas_1.width * 0.85;
var wall_height = canvas_1.height * 0.85;

var wall_A = {x_0: wall_x_offset, y_0: wall_y_offset, x_1: wall_width, y_1: wall_y_offset};
var wall_B = {x_0: wall_width, y_0: wall_height, x_1: wall_x_offset,y_1: wall_height};
var wall_C = {x_0: wall_x_offset, y_0: wall_height, x_1: wall_x_offset, y_1: wall_y_offset};
var wall_D = {x_0: wall_width, y_0: wall_y_offset, x_1: wall_width, y_1: wall_height};
var wall_E = {x_0: wall_width, y_0: wall_y_offset, x_1: wall_width, y_1: wall_height};
var wall_F = {x_0: wall_width, y_0: wall_y_offset, x_1: wall_width, y_1: wall_height};

walls.push(wall_A);
walls.push(wall_B);
walls.push(wall_C);
walls.push(wall_D);
walls.push(wall_E);
walls.push(wall_F);

var rotation_speed = 0.02;
var degree = Math.PI / walls.length;
var max_radius = Math.min(canvas_1.width, canvas_1.height)/15;

canvas_1.addEventListener("mousedown", mouse_down);
canvas_1.addEventListener("mousemove", mouse_move);
canvas_1.addEventListener("mouseup", mouse_up);

var rotate = false;
var gravity_on = true;
//dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this,'rotate');
gui.add(this,'gravity_on');
gui.close();

var drag = false;
var active_node = -1;
var mouse_pos_x;
var mouse_pos_y;
var mouse_last_x;
var mouse_last_y;

function mouse_down(event){
  drag = true;

  active_node = -1;
  mouse_pos_x = event.offsetX * scale;
  mouse_pos_y = event.offsetY * scale;
  for(i = 0; i < discCount; i++){
    if (dist(mouse_pos_x - discs[i].x, mouse_pos_y - discs[i].y) < discs[i].radius){
      active_node = i;
      break;
    }
  }
}
var drag = false;
function mouse_move(event){

  mouse_last_x = mouse_pos_x;
  mouse_last_y = mouse_pos_y;
  mouse_pos_x = event.offsetX * scale;
  mouse_pos_y = event.offsetY * scale;
  var dx = mouse_pos_x - mouse_last_x;
  var dy = mouse_pos_y - mouse_last_y;
  if(drag){
    if(active_node != -1){
      discs[active_node].x += dx;
      discs[active_node].y += dy;
      discs[active_node].x_vel = dx/scale;
      discs[active_node].y_vel = dy/scale;
    }
  }
}

function mouse_up(event){
  drag = false;
  active_node = -1;
}


for (i = 0; i < discCount; i++) {
  var r = Math.max(10, max_radius - i*2);
  var disc = {
    x: canvas_1.width/2+i,
    y: canvas_1.height/2+i,
    radius: r,
    x_vel: 1 + ((discCount - i) / 5),
    y_vel: 1 + (discCount - i) / 5,
    mass: 10 * r
  };
  discs.push(disc);
}

var n_x = walls.map(function(i) {
  return -(i.y_1 - i.y_0) / length(i.x_1 - i.x_0, i.y_1 - i.y_0);
});
var n_y = walls.map(function(i) {
  return (i.x_1 - i.x_0) / length(i.x_1 - i.x_0, i.y_1 - i.y_0);
});

function keyDown(event) {

  switch(event.keyCode) {
    case 37:  rotation_speed = -0.017; break;
    case 39:  rotation_speed = 0.017; break;
  };
}

function keyUp(event) {
  rotation_speed = 0.02;
}

window.addEventListener("keydown", keyDown);
window.addEventListener("keypress", keyDown);
window.addEventListener("keyup", keyUp);

function move() {
  for (i = 0; i < discCount; i++) {
    if (discs[i].x < discs[i].radius) {
      discs[i].x = discs[i].radius;
      discs[i].x_vel = -discs[i].x_vel;
    }
    if (discs[i].y < discs[i].radius) {
      discs[i].y = discs[i].radius;
      discs[i].y_vel = -discs[i].y_vel;
    }
    if (discs[i].x > canvas_1.width - discs[i].radius) {
      discs[i].x = canvas_1.width - discs[i].radius;
      discs[i].x_vel = -discs[i].x_vel;
    }
    if (discs[i].y > canvas_1.height - discs[i].radius) {
      discs[i].y = canvas_1.height - discs[i].radius;
      discs[i].y_vel = -discs[i].y_vel;
    }
    if(i != active_node){
      discs[i].x += discs[i].x_vel;
      discs[i].y += discs[i].y_vel;
    }
  }
}

function rotate_walls(d) {
  var centre_x = canvas_1.width/2;
  var centre_y = canvas_1.height/2;

  var ellipse_width = Math.max(canvas_1.width, canvas_1.height) / 4;
  var ellipse_height = canvas_1.height / 2;

  for (i = 0; i < walls.length; i++) {

    var offset_start = (i + 1) * TWO_PI / walls.length;
    var offset_end = ((i + 1) * TWO_PI / walls.length) - TWO_PI / (walls.length);

    walls[i].x_0 = centre_x - (ellipse_width * Math.cos(d + offset_start));
    walls[i].y_0 = centre_y + (ellipse_height * Math.sin(d + offset_start));

    walls[i].x_1 = centre_x - (ellipse_width * Math.cos(d + offset_end));
    walls[i].y_1 = centre_y + (ellipse_height * Math.sin(d + offset_end));

    n_x[i] = -(walls[i].y_1 - walls[i].y_0) / length(walls[i].x_1 - walls[i].x_0, walls[i].y_1 - walls[i].y_0);
    n_y[i] = (walls[i].x_1 - walls[i].x_0) / length(walls[i].x_1 - walls[i].x_0, walls[i].y_1 - walls[i].y_0);
  }
}
function dist(dx, dy){
  return Math.sqrt(dx * dx + dy * dy);
}
function disc_distance(i, j) {
  var dx = discs[j].x - discs[i].x;
  var dy = discs[j].y - discs[i].y;
  return dist(dx, dy);
};

function wall_distance(wx, wy, nx, ny, px, py) {
  // Value of vector scalar product of surface normal and vector from wall to object centre
  return ((px - wx) * nx + (py - wy) * ny);
}

function get_impulse(i, j, point_x, point_y, col_norm_x, col_norm_y, dt) {
  var relative_vel_x = discs[j].x_vel - discs[i].x_vel;
  var relative_vel_y = discs[j].y_vel - discs[i].y_vel;

  return (-(1 + restitution) * (relative_vel_x * col_norm_x + relative_vel_y * col_norm_y)) / (1.0 / discs[i].mass + 1.0 / discs[j].mass);
}

function get_wall_impulse(i, point_x, point_y, col_norm_x, col_norm_y, dt) {
  var relative_vel_x = discs[j].x_vel - discs[i].x_vel;
  //find speed of point on wall
  //return (-(1 + restitution) * Math.abs(relative_vel_x * col_norm_x + relative_vel_y * col_norm_y)) / (1.0 / discs[i].mass + 1.0 / discs[j].mass);
}

function collision(dt) {
  for (i = 0; i < discCount; i++) {
    var inside = true;
    for (j = 0; j < walls.length; j++) {
      var distance = wall_distance(walls[j].x_0, walls[j].y_0, n_x[j], n_y[j], discs[i].x, discs[i].y);
      if (distance < discs[i].radius) {
        inside = false;
        //move directly to right position
        discs[i].x -= n_x[j] * ((distance) - discs[i].radius);
        discs[i].y -= n_y[j] * ((distance) - discs[i].radius);

        var old_x = discs[i].x_vel;
        var old_y = discs[i].y_vel;
        //reflect velocities from normal
        discs[i].x_vel = -(2 * (old_x * n_x[j] + old_y * n_y[j]) * n_x[j] - old_x)*0.9;
        discs[i].y_vel = -(2 * (old_x * n_x[j] + old_y * n_y[j]) * n_y[j] - old_y)*0.9;

      }
    }
  }
  for (i = 0; i < discs.length; i++) {
    for (j = i + 1; j < discs.length; j++){
      if (disc_distance(i, j) < (discs[i].radius + discs[j].radius)) {

        //length of vector connecting two objects
        var magnitude = length(discs[j].x - discs[i].x, discs[j].y - discs[i].y);
        //intersection of two objects
        var overlap = discs[i].radius + discs[j].radius - magnitude;
        //collision normal
        var col_norm_x = (discs[j].x - discs[i].x) / magnitude;
        var col_norm_y = (discs[j].y - discs[i].y) / magnitude;

        //point from centre of first object to collision point
        var to_col_x = (discs[i].radius - overlap / 2) * col_norm_x;
        var to_col_y = (discs[i].radius - overlap / 2) * col_norm_y;

        //collision point
        var point_x = discs[i].x + to_col_x;
        var point_y = discs[i].y + to_col_y;

        magnitude = length(to_col_x, to_col_y);

        if(i != active_node){
          discs[i].x -= (to_col_x / magnitude) * overlap * 0.5;
          discs[i].y -= (to_col_y / magnitude) * overlap * 0.5;
        }

        to_col_x = (discs[j].radius - overlap / 2) * col_norm_x;
        to_col_y = (discs[j].radius - overlap / 2) * col_norm_y;
        magnitude = length(to_col_x, to_col_y);

        if(j != active_node){
          discs[j].x += (to_col_x / magnitude) * overlap * 0.5;
          discs[j].y += (to_col_y / magnitude) * overlap * 0.5;
        }

        //impulse to be applied to both objects
        var impulse = get_impulse(i, j, point_x, point_y, col_norm_x, col_norm_y, dt);
        if(i != active_node){
          discs[i].x_vel -= impulse / discs[i].mass * col_norm_x;
          discs[i].y_vel -= impulse / discs[i].mass * col_norm_y;
        }

        if(j != active_node){
          discs[j].x_vel += impulse / discs[j].mass * col_norm_x;
          discs[j].y_vel += impulse / discs[j].mass * col_norm_y;
        }
      }
    }
  }
}

function gravity(g, dt) {
  for (i = 0; i < discs.length; i++) {
    if(i != active_node){
      discs[i].y_vel += (dt * g);
    }
  }
}
rotation_speed = 0;
degree += rotation_speed;
degree = degree % (TWO_PI);
rotate_walls(degree);
rotation_speed = 0.02;

function draw() {

  scale = w_ / canvas_1.scrollWidth;

  ctx.fillStyle = "rgb(153,153,153)";
  ctx.fillRect(0,0,canvas_1.width,canvas_1.height);

  if(frame < 5){
    for(i = 0; i < discs.length; i++){
      discs[i].x_vel = 0;
      discs[i].y_vel = 0;
    }
  }
  fps = 1000 / (Date.now() - time);

  //fps is lower when the tab is not focused, leading to all sorts of strange results. If unfocused, do nothing.
  if (fps > 10) {
    if(rotate){
      degree += rotation_speed;
      degree = degree % (TWO_PI);
      rotate_walls(degree);
    }

    ctx.strokeStyle = "rgb(255,255,255)";
    dt = 1 / fps;
    collision(dt);
    if(gravity_on){
      gravity(g_const, dt);
    }
    move();
  }
  ctx.lineWidth = 3;
  for (i = 0; i < walls.length; i++) {
    ctx.beginPath();
    ctx.moveTo(walls[i].x_0, walls[i].y_0);
    ctx.lineTo(walls[i].x_1, walls[i].y_1);
    ctx.stroke();
  }

  ctx.fillStyle = "rgb(255,255,255)";
  ctx.lineWidth = 1;

  for (i = 0; i < discs.length; i++) {
    ctx.beginPath();
    ctx.arc(discs[i].x, discs[i].y, discs[i].radius, 0, TWO_PI);
    ctx.fill();
  }
  time = Date.now();
  frame++;
  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
