//Randomised Prim's algorithm for maze generation based on:
//https://stackoverflow.com/questions/29739751/implementing-a-randomly-generated-maze-using-prims-algorithm
//Using EasyStar.js for path finding

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
var ctx = canvas_1.getContext("2d");

var w_ = canvas_1.width;
var h_ = canvas_1.height;
var scale = w_/canvas_1.scrollWidth;

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
var colourCount = 64;
for (s = 0; s < colourCount; s++) {
  red[s] = Math.round(Math.sin(frequency1*s + phase1) * width + center);
  grn[s] = Math.round(Math.sin(frequency2*s + phase2) * width + center);
  blu[s] = Math.round(Math.sin(frequency3*s + phase3) * width + center);
}

if(mobile){
var sideWidth = 91;
var sideHeight = 57;
}else{
var sideWidth = 181;
var sideHeight = 113;
}
var width = (canvas_1.width)/sideWidth;
var height = width = Math.min(width,(canvas_1.height)/sideHeight);

var ddx = width/2;
var ddy = height/2;

var startX = (canvas_1.width - sideWidth*width) / 2;
var startY = (canvas_1.height - sideHeight*height) / 2;
var maze = [];
var grid = [];
var frontier = [];

for(i = 0; i < (sideWidth * sideHeight); i++){
  var tile = {
    state: 1
  };
  var x = Math.floor(i%sideWidth);
  var y = Math.floor(i/sideWidth);
  if((x == 0) || (y == 0) || (x == sideWidth-1) || (y == sideHeight - 1)){
    tile.state = 1;
  }
  maze.push(tile);
  drawCell(i);
}

var pathFound = false;
var path_ = [];
function solveMaze(){

  //Populate grid based on maze[i].state
  for(i = 0; i < sideHeight; i++){
    var row = [];
    for(j = 0; j < sideWidth; j++){
      row.push(maze[i*sideWidth+j].state);
    }
    grid.push(row);
  }

  var easystar = new EasyStar.js();
  easystar.setGrid(grid);
  easystar.setAcceptableTiles([0]);
  easystar.findPath(sideWidth-2, sideHeight-2, 1, 1,  function( path ) {
    if (path === null) {
      alert("Path was not found.");
    } else {
      path_ = path;
    }
  });
  //easystar.setIterationsPerCalculation(1000);
  easystar.calculate();
  pathFound = true;

}

function addNeighbour(i){
  var x = i % sideWidth;
  var y = Math.floor(i / sideWidth);
  var neighbours = [];
  if(x > 2){
    if(maze[i-2].state == 0){
      neighbours.push(i-1);
    }
  }
  if(x < (sideWidth - 3)){
    if(maze[i+2].state == 0){
      neighbours.push(i+1);
    }
  }
  if(y > 2){
    if(maze[i-2*sideWidth].state == 0){
      neighbours.push(i-sideWidth);
    }
  }
  if(y < (sideHeight-3)){
    if(maze[i+2*sideWidth].state == 0){
      neighbours.push(i+sideWidth);
    }
  }

  if(neighbours.length > 0){
    idx = Math.floor(Math.random()*(neighbours.length));
    maze[neighbours[idx]].state = 0;
    drawCell(neighbours[idx]);
    addFrontier(i);
  }

}

function addFrontier(i){
  maze[i].state = 0;
  drawCell(i);
  var x = i % sideWidth;
  var y = Math.floor(i / sideWidth);
  if(x > 2){
    if(maze[i-2].state == 1){
      frontier.push(i-2);
    }
  }
  if(x < (sideWidth - 3)){
    if(maze[i+2].state == 1){
      frontier.push(i+2);
    }
  }
  if(y > 2){
    if(maze[i-2*sideWidth].state == 1){
      frontier.push(i-2*sideWidth);
    }
  }
  if(y < (sideHeight-3)){
    if(maze[i+2*sideWidth].state == 1){
      frontier.push(i+2*sideWidth);
    }
  }
  for(i = 0; i < frontier.length; i++){ 
    maze[frontier[i]].state = 2;
    drawCell(frontier[i]);
  }
}

function progressMaze(steps){
  for(i = 0; i < steps; i++){
    if(frontier.length){
      idx = Math.floor(Math.random()*frontier.length);
      node = frontier[idx];
      frontier.splice(idx,1);
      addNeighbour(node);
    }else{
      break;
    } 
  }
}

var begin = sideWidth+1;
maze[begin].state = 0;
drawCell(begin);
addFrontier(begin);
var offset = 0;

function drawCell(i){
  if(maze[i].state == 1){
    ctx.fillStyle = "rgb(50,50,50)";
  }else if(maze[i].state == 2){
    ctx.fillStyle = "rgb(50,50,50)";
  }else{
    ctx.fillStyle = "rgb(255,255,255)";
  }
  ctx.fillRect(startX+(i%sideWidth)*(width), startY + (Math.floor(i/sideWidth))*height,width+1,height+1);

}

//********************** DRAW **********************
function draw() {

  if(frontier.length){
    progressMaze(Math.floor(maze.length/200));
  }else{
    if(!pathFound){
      solveMaze();
    }
  }


  if(pathFound){
    ctx.lineWidth = ddx;
    offset++;
    for(i = 1; i < path_.length; i++){
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(startX+ddx+path_[i-1].x * width, startY+ddy+path_[i-1].y*height);
      ctx.lineTo(startX+ddx+path_[i].x * width, startY+ddy+path_[i].y*height);
      ctx.stroke();

      ctx.strokeStyle = 'rgba('+red[(i + offset)%colourCount]+','+grn[(i + offset)%colourCount]+','+blu[(i + offset)%colourCount]+', 0.5)';
      ctx.beginPath();
      ctx.moveTo(startX+ddx+path_[i-1].x * width, startY+ddy+path_[i-1].y*height);
      ctx.lineTo(startX+ddx+path_[i].x * width, startY+ddy+path_[i].y*height);
      ctx.stroke();
    }
  }
  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);

