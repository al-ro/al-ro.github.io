//Cloth dynamics based on the tutorial at 
//https://gamedevelopment.tutsplus.com/tutorials/simulate-tearable-cloth-and-ragdolls-with-simple-verlet-integration--gamedev-519

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
    );
var ctx = canvas_1.getContext("2d");
if(mobile){
  canvas_1.width = 720;
  canvas_1.height = 450;
}
var scale = canvas_1.width/canvas_1.scrollWidth;
//Fabric nodes
var nodes = [];
//Connections/constraints between nodes
var links = [];
//Two arrays to hold two bell curves for 'uniform' setting. Setting the wind field to be the max of the two at the same coordinate gives a repeating bell curve profile
var wind_ = [];
var wind_2 = [];
//Wind field
var wind = [];

//Array for a pre-generated simplex noise field
var _noise = [];


function dist(x,y){
  return Math.sqrt(x*x+y*y);
}

var time = Date.now();
var dt = 1/60;
var TWO_PI = 2 * Math.PI;

//Node count in x and y axes
var width = 50;
var height = 50;
if(mobile){
var width = 25;
var height = 25;
}
var nodeCount = width * height;

//Noise element count in x axis
var noise_width = width * 10;

//Use noise.js library to generate a grid of 2D simplex noise values
function generate_noise(){

  //Pesudorandom seed used to generate simplex noise
  noise.seed(Math.random());

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < noise_width; x++) {
      // All noise functions return values in the range of -1 to 1
      var value = noise.simplex2(x/width, y/height);
      //Set noise element to be a positive value of the simplex noise result for gusts in the wind field
      _noise.push(Math.abs(value)); 
    }
  }
}

//Initialise arrays
for (i = 0; i < nodeCount; i++) {
  wind_.push(0);
  wind_2.push(0);
  wind.push(0);
}

//Distance between nodes based on the smallest canvas_1 dimension
var delta = Math.min((canvas_1.width/2)/(width), (canvas_1.height/2)/(height));
var dx = delta;
var dy = delta;
//Largest distance allowed between nodes
var max_dist = delta;

var wind_variables = {
  //Only works for 'uniform' setting. The speed at which the mean of the bell curve travels along the x axis
  speed: 0.9,
  //Multiplier of the wind field
  strength: 50,
  //Controls the seeming 'elasticity of the fabric'
  iterations: 25,
  modes: "Wind mode",
  //Repeating bell curve
  uniform: false,
  //Simplex noise
  noise: true,
  //Show the wind field
}

//dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
var f0 = gui.addFolder('Cloth solver');
f0.add(wind_variables, 'iterations').min(1).max(100).step(1);
var f1 = gui.addFolder('Wind properties');
f1.add(wind_variables, 'strength').min(0).max(100).step(1);
f1.add(wind_variables, 'speed').min(0).max(1).step(0.1);
var f2 = gui.addFolder('Wind mode');
f2.add(wind_variables, 'uniform').listen().onChange(function(value) { wind_variables.uniform = true; wind_variables.noise = false;} );
f2.add(wind_variables, 'noise').listen().onChange(function(value) { wind_variables.uniform = false; wind_variables.noise = true;} );
gui.close();

//Create nodes
for (i = 0; i < nodeCount; i++) {
  var node = {
    x: canvas_1.width/2 - width/2 * dx + Math.floor(i%width) * dx,
    y: canvas_1.height/2.5 - height/2 * dy + Math.floor(i/width) * dy,
    radius: 0,
    last_x: canvas_1.width/2 - width/2 * dx + Math.floor(i%width) * dx,
    last_y: canvas_1.height/2.5 - height/2 * dx + Math.floor(i/width) * dx,// + Math.random() * dy,
    static: false
  };
  nodes.push(node);
}

//Pin the left hand side of the fabric in place
for(i = 0; i < height; i++){
  nodes[i*width].static = true;
}

function create_links(){
  //X links
  for (i = 0; i < (nodes.length-1); i++) {
    if(((i+1)%width) > 0){
      var link = {
        first: i, 
        second: i+1
      };
      links.push(link);
    }
  }

  //Y links
  for (i = 0; i < (nodes.length-width); i++) {
    var link = {
      first: i, 
      second: i+width
    };
    links.push(link);
  }
}

//The fabric can be manipulated by grabbing it with a mouse
canvas_1.addEventListener('mousemove', mouse_track);
canvas_1.addEventListener('mousedown', mouse_down);
canvas_1.addEventListener('mouseup', mouse_up);

//Which node was grabbed
var active_node;

var mouse_pos_x;
var mouse_pos_y;
//Is mouse button held down
var drag = false;

function mouse_track(event) {
  mouse_pos_x = event.offsetX * scale;
  mouse_pos_y = event.offsetY * scale;
  if(drag){
    if(active_node != -1){
      nodes[active_node].x = mouse_pos_x;
      nodes[active_node].y = mouse_pos_y;
      nodes[active_node].last_x = mouse_pos_x;
      nodes[active_node].last_y = mouse_pos_y;
    }
  }
}
function mouse_down(event) {

  drag = true;
  mouse_pos_x = event.offsetX * scale;
  mouse_pos_y = event.offsetY * scale;
  active_node = -1;
  for(l = 0; l < nodes.length; l++){
    if(dist(mouse_pos_x - nodes[l].x, mouse_pos_y - nodes[l].y) < 20){
      active_node = l;
      if(active_node != -1){
        nodes[active_node].x = mouse_pos_x;
        nodes[active_node].y = mouse_pos_y;
        nodes[active_node].last_x = mouse_pos_x;
        nodes[active_node].last_y = mouse_pos_y;
      }
      break;
    }
  }
}

function mouse_up(event) {
  drag = false;
  active_node = -1;
}

function resolve_constraints(){
  //The two nodes between which we enforce a constraint
  var first;
  var second;
  //Distances in x and y axes
  var dx;
  var dy;
  //Total distance between nodes
  var d;
  //Proportional difference between largest allowed distance and actual distance between the nodes
  var diff;
  //Amount both nodes are to be moved to enforce constraint
  var translateX;
  var translateY;

  for(i = 0; i < wind_variables.iterations; i++){
    for(l = 0; l < links.length; l++){
      first = nodes[links[l].first];
      second = nodes[links[l].second];
      dx = first.x - second.x;
      dy = first.y - second.y;
      d = Math.sqrt(dx*dx+dy*dy);
      if(d > max_dist){
        diff = (max_dist - d)/d;

        //Move both by half the difference, in opposite directions
        translateX = dx  * 0.5 * diff;
        translateY = dy  * 0.5 * diff;

        //If not pinned in place
        if(!first.static){
          //If not grabbed with mouse
          if(links[l].first!= active_node){
            first.x += translateX;
            first.y += translateY;
          }
        }

        //If not pinned in place
        if(!second.static){
          //If not grabbed with mouse
          if(links[l].second!= active_node){
            second.x -= translateX;
            second.y -= translateY;
          }
        }
      }
    }
  }
}

//For the 'noise' setting. Shows the offset of a width*height grid from 0 in a noise_width*height noise field
var wind_offset = 0;
function set_wind(){
  if(wind_variables.uniform){
    for(i = 0; i < wind.length; i++){
      //Set wind to be the max of the two bell curve arrays
      wind[i] = Math.max(wind_[i], wind_2[i]);
    }
  }

  if(wind_variables.noise){
    for(i = 0; i < wind.length; i++){
      //Set the wind to be a section of the noise field
      wind[i] = wind_variables.strength*_noise[wind_offset + i +(Math.floor(i/width))*(noise_width-width)];
    }
  }

}

//The two means of the bell curves
var mean = 0;
var mean_2 = -width;
//Movement speed of the bell curves
var speed = wind_variables.speed;
//Multiplier of the wind field
var strength = wind_variables.strength;

function move(dt, t) {

  speed = wind_variables.speed;
  strength = wind_variables.strength;

  //Shift grid in noise field
  wind_offset--;
  if(wind_offset < 0 ){
    //Reset to start of noise field
    wind_offset = (noise_width - width);
  }
  //Shift bell curve mean by speed
  mean += speed;
  //Reset mean to start
  if(mean > width*1.5){
    mean = -0.5*width;
  }
  mean_2 += speed;
  if(mean_2 > width*1.5){
    mean_2 = -0.5*width;
  }
  //Verlet variables
  var x_vel;
  var y_vel;
  var next_x;
  var next_y;

  var accX = 0;
  var accY = 9.8;

  for(i = 0; i < wind.length; i++){
    wind_[i] = strength*Math.exp(-(Math.pow(i%(width) - mean, 2)/(2*width)));
    wind_2[i] = strength*Math.exp(-(Math.pow(i%width - (mean_2), 2)/(2*width)));
  }

  set_wind();

  //Verlet integration based on positions, gravity, speed and wind
  for(i = 0; i < nodes.length; i++){
    if(i != active_node){
      accX = wind[i];
      x_vel = nodes[i].x - nodes[i].last_x + accX * dt;
      y_vel = nodes[i].y - nodes[i].last_y + accY * dt;
      next_x = nodes[i].x + x_vel;
      next_y = nodes[i].y + y_vel;

      nodes[i].last_x = nodes[i].x;
      nodes[i].last_y = nodes[i].y;
      if(!nodes[i].static){
        nodes[i].x = next_x;
        nodes[i].y = next_y;
      }
    }
  }

  //Nodes stop at canvas_1 borders
  for(i = 0; i < nodes.length; i++){
    if(nodes[i].x < 10){
      nodes[i].x = 10;
    }  
    if(nodes[i].y < 10){
      nodes[i].y = 10;
    }
    if(nodes[i].x > canvas_1.width-10){
      nodes[i].x = canvas_1.width-10;
    }  
    if(nodes[i].y > canvas_1.height-10){
      nodes[i].y = canvas_1.height-10;
    }
  }
}

create_links();
generate_noise();

//See below
var fps;
var newtime;
var frametime;
var accumulator = 0;
var alpha;
var step = 0;

function draw() {
  ctx.fillStyle = "rgb(153,153,153)";
  ctx.fillRect(0,0,canvas_1.width,canvas_1.height);
  scale = canvas_1.width/canvas_1.scrollWidth;
  step+=0.5;

  //Time step logic from:
  //http://gafferongames.com/game-physics/fix-your-timestep/
  newtime = Date.now();
  frametime = newtime - time;
  fps = 1000 / (frametime);
  time = newtime;

  //Effectively pause simulation when tab is out of focus
  if (fps > 10) {
    accumulator += frametime/1000;
    while ( accumulator >= dt ){
      resolve_constraints();
      move(dt, step);
      accumulator -= dt;
    }
    alpha = accumulator / dt;
  }

  ctx.fillStyle = "rgba(255,255,255, 0.7)";

  //Draw nodes. Default radius is 0
  for (i = 0; i < nodes.length; i++) {
    ctx.beginPath();
    ctx.arc(nodes[i].x, nodes[i].y, nodes[i].radius, 0, TWO_PI); 
    ctx.fill();
  }


  //Draw links between nodes
  ctx.strokeStyle = "rgba(215,215,215,1)";
  ctx.beginPath();
  for(l = 0; l < links.length; l++){
    ctx.moveTo(nodes[links[l].first].x, nodes[links[l].first].y);
    ctx.lineTo(nodes[links[l].second].x, nodes[links[l].second].y);
  }
  ctx.stroke();

  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
