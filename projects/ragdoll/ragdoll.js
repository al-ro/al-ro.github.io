//Based on
//https://gamedevelopment.tutsplus.com/tutorials/simulate-tearable-cloth-and-ragdolls-with-simple-verlet-integration--gamedev-519

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

var character_nodes = [];
var character_links = [];
var w_ = canvas_1.width;
var h_ = canvas_1.height;
var scale = w_/canvas_1.scrollWidth;

function dist(x, y) {
  return Math.sqrt(x * x + y * y);
}

var time = Date.now();
var dt = 1 / 60;
var TWO_PI = 2 * Math.PI;

var width = 1;
var height = 1;
var nodeCount = width * height;
var animate = true;

var gravity = 9.8;

var max_dist = 70;
var min_dist = 70;
var iterations = 3;

//Left arm
character_nodes.push({x: 100,y: 100,last_x: 100,last_y: 100,static: false});
character_nodes.push({x: 100,y: 150,last_x: 100,last_y: 150,static: false});
character_nodes.push({x: 100,y: 200,last_x: 100,last_y: 200,static: false});
//Right arm
character_nodes.push({x: 200,y: 100,last_x: 200,last_y: 100,static: false});
character_nodes.push({x: 200,y: 150,last_x: 200,last_y: 150,static: false});
character_nodes.push({x: 200,y: 200,last_x: 200,last_y: 200,static: false});
//Left leg
character_nodes.push({x: 125,y: 200,last_x: 125,last_y: 100,static: false});
character_nodes.push({x: 125,y: 250,last_x: 125,last_y: 250,static: false});
character_nodes.push({x: 125,y: 300,last_x: 125,last_y: 300,static: false});
//Right Leg
character_nodes.push({x: 175,y: 200,last_x: 175,last_y: 200,static: false});
character_nodes.push({x: 175,y: 250,last_x: 175,last_y: 250,static: false});
character_nodes.push({x: 175,y: 300,last_x: 175,last_y: 300,static: false});

//Head
character_nodes.push({x: 150,y: 50,last_x: 150,last_y: 50,static: false});

//Anchors
character_nodes.push({x: 300,y: -10,last_x: 300, last_y: -10,static: true});

//Connect limbs individually
character_links.push({first: 0, second: 1, min: 55, max: 55});
character_links.push({first: 1, second: 2, min: 55, max: 55});
character_links.push({first: 3, second: 4, min: 55, max: 55});
character_links.push({first: 4, second: 5, min: 55, max: 55});
character_links.push({first: 6, second: 7, min: min_dist, max: max_dist});
character_links.push({first: 7, second: 8, min: min_dist, max: max_dist});
character_links.push({first: 9, second: 10, min: min_dist, max: max_dist});
character_links.push({first: 10, second: 11, min: min_dist, max: max_dist});

//Shoulder line
character_links.push({first: 0, second: 3, min: 70, max: 70});
//Pelvis
character_links.push({first: 6, second: 9, min: 50, max: 50});

//Sides
character_links.push({first: 0, second: 6, min: 103, max: 103});
character_links.push({first: 3, second: 9, min: 103, max: 103});
//Cross
character_links.push({first: 0, second: 9, min: 103, max: 103});
character_links.push({first: 3, second: 6, min: 103, max: 103});

//Shoulders to head
character_links.push({first: 0, second: 12, min: 55, max: 55});
character_links.push({first: 3, second: 12, min: 55, max: 55});

//Invisible links between feet and shoulders
character_links.push({first: 0, second: 8, min: 200, max: Infinity});
character_links.push({first: 3, second: 11, min: 200, max: Infinity});

//Invisible link between head and anchor
character_links.push({first: 12, second: 13, min: Math.max(canvas_1.height-250, 200), max: Math.max(canvas_1.height-250, 200)});

function getPos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX * scale - rect.left,
      y: evt.touches[0].clientY * scale - rect.top
  };
}

canvas_1.addEventListener('mousemove', mouse_track);
canvas_1.addEventListener('mouseleave', animate_);
canvas_1.addEventListener('mouseenter', relax_);

canvas_1.addEventListener("touchend", animate_);
canvas_1.addEventListener("touchcancel", animate_);
canvas_1.addEventListener("touchmove", touch_move);

function animate_(){
  animate = true;
  character_links[character_links.length-1].max = Math.max(canvas_1.height-260, 200);
}
function relax_(){
  animate = false;
  character_links[character_links.length-1].min = -Infinity;
  character_links[character_links.length-1].max = Infinity;
}
function touch_move(event) {

  event.preventDefault();
  relax_();
  animate=false;
  mouse_last_x = mouse_pos_x;
  mouse_last_y = mouse_pos_y;
  mouse_pos_x = getPos(canvas_1, event).x;
  mouse_pos_y = getPos(canvas_1, event).y;
  var dx = mouse_pos_x - mouse_last_x;
  var dy = mouse_pos_y - mouse_last_y;

  var dx = mouse_last_x - mouse_pos_x;
  var dy = mouse_last_y - mouse_pos_y;

  dx = Math.sign(dx); 
  dy = Math.sign(dy);
  character_nodes[0].x-=dx; character_nodes[3].x-=dx; character_nodes[6].x-=dx; character_nodes[9].x-=dx;
  character_nodes[0].y-=dy; character_nodes[3].y-=dy; character_nodes[6].y-=dy; character_nodes[9].y-=dy;
}

function mouse_up(event){
  drag = false;
  active_node = -1;
}

var active_node;
var mouse_last_x = 0;
var mouse_last_y = 0;
var mouse_pos_x = 0;
var mouse_pos_y = 0;

var drag = false;

function mouse_track(event) {

  animate = false;
  mouse_last_x = mouse_pos_x;
  mouse_last_y = mouse_pos_y;
  mouse_pos_x = event.offsetX * scale;
  mouse_pos_y = event.offsetY * scale;
  var dx = mouse_pos_x - mouse_last_x;
  var dy = mouse_pos_y - mouse_last_y;

  var dx = mouse_last_x - mouse_pos_x;
  var dy = mouse_last_y - mouse_pos_y;

  dx = Math.sign(dx); 
  dy = Math.sign(dy);
  character_nodes[0].x-=dx; character_nodes[3].x-=dx; character_nodes[6].x-=dx; character_nodes[9].x-=dx;
  character_nodes[0].y-=dy; character_nodes[3].y-=dy; character_nodes[6].y-=dy; character_nodes[9].y-=dy;
}

function resolve_constraints(nds, lnks) {
  var first;
  var second;
  var dx;
  var dy;
  var d;
  var diff;
  var translateX;
  var translateY;

  for (i = 0; i < iterations; i++) {

    //Resolve lax link to anchor
    first = nds[lnks[lnks.length-1].first];
    second = nds[lnks[lnks.length-1].second];
    dx = first.x - second.x;
    dy = first.y - second.y;
    d = Math.sqrt(dx * dx + dy * dy);
    if ((d > lnks[lnks.length-1].max)) {
      diff = (lnks[lnks.length-1].max - d) / d;
      translateX = dx * 0.05 * diff;
      translateY = dy * 0.05 * diff;
      if (!first.static) {
        if (lnks[lnks.length-1].first != active_node) {
          first.x += translateX;
          first.y += translateY;
        }
      }
    }

    //Resolve other links
    for (l = 0; l < lnks.length-1; l++) {
      first = nds[lnks[l].first];
      second = nds[lnks[l].second];
      dx = first.x - second.x;
      dy = first.y - second.y;
      d = Math.sqrt(dx * dx + dy * dy);
      if ((d > lnks[l].max)||(d < lnks[l].min)) {
        diff = (lnks[l].min - d) / d;
        translateX = dx * 0.5 * diff;
        translateY = dy * 0.5 * diff;
        if (!first.static) {
          if (lnks[l].first != active_node) {
            first.x += translateX;
            first.y += translateY;
          }
        }
        if (!second.static) {
          if (lnks[l].second != active_node) {
            second.x -= translateX;
            second.y -= translateY;
          }
        }
      }
    }
  }
}

function move(dt, nds) {
  var x_vel;
  var y_vel;
  var next_x;
  var next_y;
  var accX = 0;
  var accY = gravity;

  for (i = 0; i < nds.length; i++) {
    if (i != active_node) {
      x_vel = nds[i].x - nds[i].last_x + accX * dt;
      y_vel = nds[i].y - nds[i].last_y + accY * dt;
      //If on bottom limit, disable x velocity to simulate friction
      if (nds[i].y > canvas_1.height) {
        x_vel = 0;
      }
      next_x = nds[i].x + x_vel;
      next_y = nds[i].y + y_vel;

      nds[i].last_x = nds[i].x;
      nds[i].last_y = nds[i].y;
      if (!nds[i].static) {
        nds[i].x = next_x;
        nds[i].y = next_y;
      }
    }
  }
  for (i = 0; i < nds.length; i++) {

    if (!nds[i].static) {
      if (nds[i].x < 0) {
        nds[i].x = 0;
      }
      if (nds[i].y < 0) {
        nds[i].y = 0;   
      }
      if (nds[i].x > canvas_1.width) {
        nds[i].x = canvas_1.width;
      }
      if (nds[i].y > canvas_1.height) {
        nds[i].y = canvas_1.height;
      }
    }
  }
  //Anchor shadows head
  var head_diff = character_nodes[character_nodes.length-1].x - character_nodes[0].x;
  if(Math.abs(head_diff) > 50){
    character_nodes[character_nodes.length-1].x -= (head_diff/2);
  }
}

var fps;
var newtime;
var frametime;
var accumulator = 0;
var alpha;
var t = 0;


//********************** DRAW **********************
function draw() {

  ctx.fillStyle = "rgb(153,153,153)";
  ctx.fillRect(0,0,canvas_1.width,canvas_1.height);

  if(animate){
    character_links[character_links.length-1].max = Math.max(canvas_1.height-250, 0);
  }
  //Not much point to use with this few nodes.
  //Time step logic from:
  //http://gafferongames.com/game-physics/fix-your-timestep/
  newtime = Date.now();
  frametime = newtime - time;
  fps = 1000 / frametime;
  time = newtime;

  //Effectively pause simulation when tab is out of focus
  if (fps > 10) {
    accumulator += frametime / 1000;
    //Simulate
    while (accumulator >= dt) {
      resolve_constraints(character_nodes, character_links);
      move(dt, character_nodes);
      accumulator -= dt;
    }
    //Unused remainder
    alpha = accumulator / dt;
  }

  ctx.strokeStyle = "rgba(255,255,255,1)";  
  ctx.lineWidth = 25;
  //Draw some limbs and links
  for (l = 4; l < character_links.length-5; l++) {
    ctx.beginPath();
    ctx.moveTo(character_nodes[character_links[l].first].x,character_nodes[character_links[l].first].y);
    ctx.lineTo(character_nodes[character_links[l].second].x,character_nodes[character_links[l].second].y);
    ctx.stroke();
  }

  //Draw nodes at joints
  ctx.fillStyle = "rgba(255,255,255,1)";  
  for (i = 6; i < character_nodes.length-2; i++) {
    ctx.beginPath();
    ctx.arc(character_nodes[i].x, character_nodes[i].y, 12.5, 0, TWO_PI);
    ctx.fill();
  }

  //Draw quadrilateral for body
  ctx.beginPath();
  ctx.moveTo(character_nodes[0].x, character_nodes[0].y);
  ctx.lineTo(character_nodes[3].x, character_nodes[3].y);
  ctx.lineTo(character_nodes[9].x, character_nodes[9].y);
  ctx.lineTo(character_nodes[6].x, character_nodes[6].y);
  ctx.fill();

  //Draw head
  ctx.beginPath();
  ctx.arc(character_nodes[character_nodes.length-2].x, character_nodes[character_nodes.length-2].y, 25, 0, TWO_PI);
  ctx.fill();

  ctx.strokeStyle = "rgba(153,153,153,0.5)";
  //Draw shadows
  for (l = 0; l < 4; l++) {
    ctx.beginPath();
    ctx.moveTo(character_nodes[character_links[l].first].x+5,character_nodes[character_links[l].first].y+5);
    ctx.lineTo(character_nodes[character_links[l].second].x+5,character_nodes[character_links[l].second].y+5);
    ctx.stroke();
  }
  //Draw arms
  ctx.strokeStyle = "rgba(255,255,255,1)";
  for (l = 0; l < 4; l++) {
    ctx.beginPath();
    ctx.moveTo(character_nodes[character_links[l].first].x,character_nodes[character_links[l].first].y);
    ctx.lineTo(character_nodes[character_links[l].second].x,character_nodes[character_links[l].second].y);
    ctx.stroke();
  }
  //Draw arm joints and hands
  ctx.fillStyle = "rgba(255,255,255, 1)";
  for (i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(character_nodes[i].x, character_nodes[i].y, 12.5, 0, TWO_PI);
    ctx.fill();
  }
  window.requestAnimationFrame(draw);
}
draw();
