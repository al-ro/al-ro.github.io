//Based on 
//https://codepen.io/eth0/pen/Jjilf 
//http://www.neilwallis.com/projects/java/water/index.php
//https://web.archive.org/web/20160310071837/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm 

  const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
      );

  var animate = true;

  document.getElementById('canvas').style.cursor = "none";
  //Main display canvas
  var ctx = canvas.getContext("2d");

  //Hidden canvas
  var ctx_2 = canvas_2.getContext("2d");

  //Two height maps are used to store the current and previous states of the water
  //Use single array with offset
  var ripplemap = [];

  //Displayed image of ripples on background
  var ripple;

  //Dimensions of image
  var width;
  var height;
  if(mobile){
    width = 300;
    height = 300;
    canvas.width = 300;
    canvas.height = 300;
  }else{
    width = 550;
    height = 550;
  }
//Set hidden canvas to the specifed size such that it fits two images next to each other (with a gap of 10 pixels in between)
canvas_2.width = 2*width+10;
canvas_2.height = height;

//Half width and half height for displaying image centrally
var hwidth = width/2;
var hheight = height/2;

var oldind = width;
var newind = width * (height+2);
//Twice the pixel count in image with 2 additional buffer rows
var size = width * (height+2) * 2;
//Background image data
var texture;
//Wave crest highlight data
var highlights;
//Width and height of background checkerboard pattern
var rx = 16;
var ry = 61;

//Draw background image on hidden canvas
ctx_2.fillStyle = '#147'
ctx_2.fillRect(0,0,width,height);
var grd = ctx_2.createLinearGradient(0,0,width,height);
grd.addColorStop(0, 'rgb(0,255,255)');
grd.addColorStop(0.33, 'rgb(255,125,255)');
grd.addColorStop(0.66, 'rgb(255,255,0)');
grd.addColorStop(1, 'rgb(0,255,255)');
ctx_2.fillStyle = grd;
for(i = 0; i < width/rx; i+=2){
  for(j = 0; j < height/ry; j+=2){
    ctx_2.fillRect(i * rx,j * ry,rx,ry);
  } 
}
for(i = 1; i < width/rx; i+=2){
  for(j = 1; j < height/ry; j+=2){
    ctx_2.fillRect(i * rx,j * ry,rx,ry);
  } 
}

var discrete = true;
if(mobile){
  discrete = false;
}
var radius = 3;
var fade = 5;

//dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });

var droplets = true;
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'radius').min(1.0).max(10.0).step(1.0);
gui.add(this, 'fade').min(1.0).max(10.0).step(1.0);
gui.add(this, 'discrete');
gui.add(this, 'droplets');
gui.close();

//Set texture, ripple and highlights to the image data
texture = ctx_2.getImageData(0, 0, width, height);
ripple = ctx_2.getImageData(0, 0, width, height);
highlights = ctx_2.getImageData(0, 0, width, height);

//Initialise ripplemap to size
for (var i = 0; i < size; i++) {
  ripplemap[i] = 0;
}

var i_ = 0;
var mapind;
var a;
var b;
var data;
var frame = 0;
var new_pixel;
var cur_pixel;


//Increase height within a radius of a specified location
function disturb(x,y, strength){
  for (var j = y - radius; j < y + radius; j++) {
    for (var k = x - radius; k < x + radius; k++) {
      if((j>radius)&&(j < height-radius)&&(k > radius)&&(k<width-radius)){
        ripplemap[oldind + (j * width) + k] += strength;
      }
    }
  }
}

var x_old = -1;
var y_old = -1;
//When mouse leaves window, animate a lemiscate
function animate_(){
  animate = true;
  x_old = -1;
  y_old = -1;
}

function mouse_enter(){
  x_old = -1;
  y_old = -1;
}

function mouse_down(event) {
  x = Math.round(event.offsetX - (canvas.width/2-hwidth));
  y = Math.round(event.offsetY - (canvas.height/2-hheight));
  disturb(x,y, 10000);
}

function disturbLine(x_new, y_new){

  //Bresenham's line algorithm
  //https://stackoverflow.com/questions/4672279/bresenham-algorithm-in-javascript
  var dx = Math.abs(x_old - x_new);
  var dy = Math.abs(y_old - y_new);
  var sx = Math.sign(x_old - x_new);
  var sy = Math.sign(y_old - y_new);
  var err = dx-dy;

  var x = x_new;
  var y = y_new;

  if(x_old > 0 && y_old > -1){
    while(true){
      disturb(x,y, 256);

      if ((x==x_old) && (y==y_old)){
        break;
      }
      var e2 = err<<1;
      if (e2 >-dy){
        err -= dy; 
        x  += sx; 
      }
      if (e2 < dx){ 
        err += dx; 
        y += sy; 
      }
    }
  }else{
    disturb(x,y, 256);
  }
}
function mouse_track(event) {
  animate = false;
  x_new = Math.round(event.offsetX - (canvas.width/2-hwidth));
  y_new = Math.round(event.offsetY - (canvas.height/2-hheight));
  if(discrete){
    disturb(x_new, y_new, 1024);
  }else{
    disturbLine(x_new, y_new);
  }
  x_old = x_new;
  y_old = y_new;
}
canvas.addEventListener('mouseenter', mouse_enter);
canvas.addEventListener('mousedown', mouse_down);
canvas.addEventListener('mousemove', mouse_track);
canvas.addEventListener('mouseleave', animate_);

function getPos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX - rect.left,
      y: evt.touches[0].clientY - rect.top
  };
}
canvas.addEventListener("touchstart", touch_start);
canvas.addEventListener("touchend", animate_);
canvas.addEventListener("touchcancel", animate_);
canvas.addEventListener("touchmove", touch_move);

function touch_start(event) {
  event.preventDefault();
  animate = false;
  x = Math.round(getPos(canvas, event).x - (canvas.width/2-hwidth));
  y = Math.round(getPos(canvas, event).y - (canvas.height/2-hheight));
  disturb(x,y, 1024);
  x_old = x;
  y_old = y;
}

function touch_move(event) {
  event.preventDefault();
  animate = false;
  x_new = Math.round(getPos(canvas, event).x - (canvas.width/2-hwidth));
  y_new = Math.round(getPos(canvas, event).y - (canvas.height/2-hheight));
  if(discrete){
    disturb(x_new, y_new, 1024);
  }else{
    disturbLine(x_new, y_new);
  }
  x_old = x_new;
  y_old = y_new;
}


//Lemiscate variable
var t = 0;
var x_new;
var y_new;

var TWO_PI = 2 * Math.PI;


//********************** DRAW **********************
function draw() {
  if(mobile){
    canvas.width = 300;
    canvas.height = 300;
  }else{
    canvas.width = 550;
    canvas.height = 550;
  }
  if(!mobile){
    //Animate lemiscate when mouse is not on window
    if(animate){
      t = (t+0.025)%(TWO_PI);
      //Parametric equation for lemnsicate taken from:
      //http://mathworld.wolfram.com/Lemniscate.html
      //Some terms are left out
      x_new = Math.round(width/2+(width/3 * Math.cos(t)));
      y_new = Math.round(height/2+(height/4 * Math.sin(t) * Math.cos(t)));
      if(discrete){
        disturb(x_new, y_new, 1024);
      }else{
        disturbLine(x_new, y_new, 256);
      }
      x_old = x_new;
      y_old = y_new;
    }
  }
  //Raindrops
  if(droplets){
    if(frame % 5 === 0){
      disturb(Math.round(Math.random() * width), Math.round(Math.random() * height), Math.round(Math.random() * 1024));
    }
  }
  frame++;

  i_ = oldind;
  oldind = newind;
  newind = i_;

  i_ = 0;
  mapind = oldind;
  for(y = 0; y < (height); y++){
    for(x = 0; x < (width); x++){

      //Look at the neighbouring pixels from the previous state. Take the sum and divide by 2 (with bitshift)
      if(x > 0){
        data = (ripplemap[mapind-width]+ripplemap[mapind+width]+ripplemap[mapind-1]+ripplemap[mapind+1]) >> 1;
      }else{
        //Freeze left wall so rows aren't periodic
        data = 0
      }
      //Subtract the value in the current state map
      data -= ripplemap[newind+i_];
      //Reduce the strength of the ripple by 1/32nd with bitshift
      data -= data >> (10-fade);
      ripplemap[newind+i_] = data;

      //Get ripple strength difference in x and y direction
      xoffset =(ripplemap[x-1+y*width] - ripplemap[x+1+y*width])>>5;
      yoffset = (ripplemap[x+(y-1)*width] - ripplemap[x+(y+1)*width])>>5;


      //Determine which pixel to display based on the strength of ripple distortion in the region
      a = (x + xoffset) << 0;
      b = (y + yoffset) << 0;
      //bounds check
      if(a >= width){a = width - 1;}
      if(a < 0){a = 0;}
      if(b >= height){b = height - 1;}
      if(b < 0){b = 0;}

      //Pixel data is stored as (red, green, blue, alpha) values. Each pixel index is 4 addresses apart

      //The pixel to draw
      new_pixel = (a + (b * width))  << 2;
      //The pixel location to draw to
      cur_pixel = i_ << 2;

      //Copy appropriate rgb pixel values from texture to ripple image
      ripple.data[cur_pixel] = texture.data[new_pixel];
      ripple.data[cur_pixel+1] = texture.data[new_pixel+1];
      ripple.data[cur_pixel+2] = texture.data[new_pixel+2];

      if(!mobile){
        //Display highlights on waves
        highlights.data[cur_pixel] = 128+texture.data[new_pixel];
        highlights.data[cur_pixel+1] = 128+texture.data[new_pixel+1];
        highlights.data[cur_pixel+2] = 255;
        //Set transparency based on the xoffset. Zero-offset pixels will be transparent
        highlights.data[cur_pixel+3] = xoffset << 2;
      }
      mapind++;
      i_++;
    }
  }

  //Draw ripple data on hidden canvas
  ctx_2.putImageData(ripple, 0, 0);
  //Draw highlights data on hidden canvas next to ripple with a 10 pixel space inbetween
  if(!mobile){
    ctx_2.putImageData(highlights, width+10, 0);
    //Have highlights brighten the values underneath
    ctx.globalCompositeOperation = "lighter";
  }
  //Draw ripple data from hidden canvas to main display canvas
  ctx.drawImage(canvas_2,0,0,width,height,canvas.width/2-hwidth, canvas.height/2-hheight, width,height);
  if(!mobile){
    //Draw highlights data from hidden canvas to main display canvas
    ctx.drawImage(canvas_2,width+10,0,width,height,canvas.width/2-hwidth, canvas.height/2-hheight, width,height);
  }

  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
