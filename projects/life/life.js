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

var sideWidth = 360;
var sideHeight = 225;

var length = sideWidth * sideHeight;

if(mobile){
  sideWidth = 90;
  sideHeight = 58;
}
var grid = [];

var width = (canvas_1.width)/sideWidth;
var height = width = Math.min(width,(canvas_1.height)/sideHeight);

var startX = (canvas_1.width - sideWidth*width) / 2;
var startY = (canvas_1.height - sideHeight*height) / 2;

for(i = 0; i < length; i++){

  var tile = {
    //0: dead, 1: alive
    state: 0,
    //0: die, 1: live, 2: come to life
    action: -1
  };
  var x = Math.floor(i%sideWidth);
  var y = Math.floor(i/sideWidth);
  grid.push(tile);
}

//After how many frames do we redraw the scene
var updateDelay = 1;

//How many cells are alive at the start
var seedDensity = 0.1;
var seedCount = Math.ceil(seedDensity * length);

//Set initial live cells
for(i = 0; i < seedCount; i++){
  grid[Math.floor(Math.random() * length)].state = 1;
}

function regenerate(){
  for(i = 0; i < length; i ++){
    grid[i].state = 0;
    grid[i].action = -1;
    seedCount = Math.ceil(seedDensity * length);

  }
  for(i = 0; i < seedCount; i++){
    grid[Math.floor(Math.random() * length)].state = 1;
  }
}

//Clear colour can be translucent or opaque 
var trails = false;

var regenerate_button = { regenerate:function(){regenerate();}};
//dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'updateDelay').min(1).max(10).step(1).listen();
gui.add(this, 'trails');
gui.add(this, 'seedDensity').min(0.1).max(0.9).step(0.05).listen();
gui.add(regenerate_button, 'regenerate');
gui.close();

//Find how many neighbours are living
function livingNeighbours(i){
  
  var n_x;
  var n_y;
  var n_idx;

  var count = 0;

  for(k = -1; k < 2; k++){
    for(j = -1; j < 2; j++){

      n_x = (i % sideWidth) + j;
      n_y = Math.floor(i / sideWidth) + k;

      n_idx = n_x + n_y * sideWidth;

      if((n_idx != i) && (n_x >= 0) && (n_x < sideWidth) && (n_y >= 0) && (n_y < sideHeight) ){
        if(grid[n_idx].state == 1){
          count++;

        }
      }
    
    }
  }  

  return count;
}

//Change the future state of cells based on rules
function rules(i){
  var count = livingNeighbours(i);
  if(grid[i].state == 1){
    //Any live cell with fewer than two live neighbors dies, as if by under population.
    if(count < 2){
      grid[i].action = 0;
    }
    //Any live cell with two or three live neighbors lives on to the next generation.
    if(count == 2 || count == 3){
      grid[i].action = 1;
    }
    //Any live cell with more than three live neighbors dies, as if by overpopulation.
    if(count > 3){
      grid[i].action = 0;
    }
  }else{
    //Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
    if(count == 3){
      grid[i].action = 2;
    }
  }
}

//Apply result of rules
function actions(i){
  if(grid[i].action == 0){
    grid[i].state = 0;
  }
  if(grid[i].action == 2){
    grid[i].state = 1;
  }
}

//Draw live cells
function drawCell(i){
  if(grid[i].state == 1){
    ctx.fillStyle = "rgb(50,50,50)";
    ctx.fillRect(startX+(i%sideWidth)*(width), startY + (Math.floor(i/sideWidth))*height,width+1,height+1);
  }
}

//Set the next state of the universe based on the current state
function tick(){
  for(i = 0; i < length; i++){
    rules(i);
  }
  for(i = 0; i < length; i++){ 
    actions(i);
    drawCell(i);
  }
}

//********************** DRAW **********************

ctx.fillStyle = "rgb(255,255,255)";
ctx.fillRect(0,0,canvas_1.width, canvas_1.height);

var frameCount = 0;
function draw() {

  if(trails){
    alpha = 0.3;
  }else{
    alpha = 1.0;
  }

  frameCount++;
  if(frameCount > updateDelay){
    ctx.fillStyle = "rgb(255,255,255,"+alpha+")";
    ctx.fillRect(0,0,canvas_1.width, canvas_1.height);
    tick();
    frameCount = 0;
  }

  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
