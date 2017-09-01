//Based on
//http://petewerner.blogspot.co.uk/2015/02/intro-to-curl-noise.html

var ctx = canvas_1.getContext("2d");
var TWO_PI = 2 * Math.PI;
const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
    );
if(mobile){
  canvas_1.width = 720;
  canvas_1.height = 450;
}
var discCount;
if(mobile){
  discCount = 100;
}else{
  discCount = 1000;
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

for (s = 0; s < discCount; s++) {
  red[s] = Math.round(Math.sin(frequency1*s + phase1) * width + center);
  grn[s] = Math.round(Math.sin(frequency2*s + phase2) * width + center);
  blu[s] = Math.round(Math.sin(frequency3*s + phase3) * width + center);
}
var discs = [];

for(i = 0; i < discCount; i++){
  var style = 'rgba('+red[i]+','+grn[i]+','+blu[i]+', 1)';
  var disc = {
    x: Math.random()*canvas_1.width,
    y: Math.random()*canvas_1.height,
    x_vel: 0,
    y_vel: 0,
    radius: 1,
    colour: style
  };
  discs.push(disc);
}
function move() {
  for(i = 0; i < discCount; i++){
    if(discs[i].x < discs[i].radius){
      discs[i].x = Math.random()*canvas_1.width;
      discs[i].y = Math.random()*canvas_1.height;
    }  
    if(discs[i].y < discs[i].radius){
      discs[i].x = Math.random()*canvas_1.width;
      discs[i].y = Math.random()*canvas_1.height;
    }
    if(discs[i].x > canvas_1.width-discs[i].radius){
      discs[i].x = Math.random()*canvas_1.width;
      discs[i].y = Math.random()*canvas_1.height;
    }  
    if(discs[i].y > canvas_1.height-discs[i].radius){
      discs[i].x = Math.random()*canvas_1.width;
      discs[i].y = Math.random()*canvas_1.height;
    }
    discs[i].x += discs[i].x_vel;
    discs[i].y += discs[i].y_vel;
  }
}

var dx = 4;
var dy = 4;

var width = (canvas_1.width/dx) << 0;
var height = (canvas_1.height/dy) << 0;
var size = width * height;

var noise_ = [];

var ellipse_width = dx/3;
var ellipse_height = dy/3;

var offset_start = Math.PI/2;
var offset_end = 1.5*Math.PI;

var target_x = canvas_1.width/2;
var target_y = canvas_1.height/2;

//Use noise.js library to generate a grid of 2D simplex noise values
try {
  noise.seed(Math.random());
}
catch(err) {
  console.log(err.message);
}

function computeCurl(x, y){
  var eps = 0.001;
  var n1 = noise.simplex2(x, y + eps); 
  var n2 = noise.simplex2(x, y - eps); 
  var a = (n1 - n2)/(2 * eps);

  var n1 = noise.simplex2(x + eps, y);
  var n2 = noise.simplex2(x - eps, y); 
  var b = (n1 - n2)/(2 * eps);

  return [a, -b];
}

window.onresize = function(){
  ctx.fillStyle = "rgb(17,27,68)";
  ctx.fillRect(0,0,canvas_1.width, canvas_1.height);
}
var initial_step;
if(mobile){
  initial_step = 300;
}else{
  initial_step = 1000;
}
var variables = {
  speed: 0.5,
  fade: 0.1,
  step: initial_step,
  particle_size: 1.5, 
  rainbow: true,
  lighten: false,
  colour: '#ff9500'
}
var reset_button = { reset:function(){ 
  variables.speed = 0.5
  variables.step = initial_step;
  variables.particle_size = 1.5;
  variables.rainbow = true;
  variables.lighten = false;
  variables.fade = 0.0;
  ctx.fillStyle = "rgb(17,27,68)";
  ctx.fillRect(0,0,canvas_1.width, canvas_1.height);
}};
var clear_button = { clear:function(){ 
  ctx.fillStyle = "rgb(17,27,68)";
  ctx.fillRect(0,0,canvas_1.width, canvas_1.height);
}};

//dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });

var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(variables, 'step').min(10).max(3000).step(10).listen();
gui.add(variables, 'speed').min(0.0).max(1.0).step(0.01).listen();
gui.add(variables, 'particle_size').min(0.1).max(5).step(0.1).listen();
gui.add(variables, 'fade').min(0.0).max(1.0).step(0.01).listen();
gui.addColor(variables, 'colour').listen().onChange(function(value) { variables.rainbow = false;} );
if(!mobile){
  gui.add(variables, 'lighten');
}
gui.add(reset_button,'reset');
gui.add(clear_button,'clear');
gui.close();
variables.fade = 0.0;

//DRAW//
ctx.fillStyle = "rgb(17,27,68)";
ctx.fillRect(0,0,canvas_1.width, canvas_1.height);
function draw() {

  ctx.fillStyle = "rgba(17,27,68, "+variables.fade+")";
  ctx.fillRect(0,0,canvas_1.width, canvas_1.height);

  move();

  ctx.save();
  if(variables.lighten && !mobile){ 
    ctx.globalCompositeOperation = "lighten";
  }
  for(i = 0; i < discs.length; i++){
    if(variables.rainbow){ 
      ctx.fillStyle = discs[i].colour;
    }else{
      ctx.fillStyle = variables.colour;
    }

    var curl = computeCurl(discs[i].x/variables.step, discs[i].y/variables.step);
    discs[i].x_vel = variables.speed*curl[0];
    discs[i].y_vel = variables.speed*curl[1];
    ctx.beginPath();
    ctx.arc(discs[i].x, discs[i].y, variables.particle_size, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
