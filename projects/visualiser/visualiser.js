var ctx = canvas_1.getContext("2d");
var TWO_PI = 2 * Math.PI;

var audio_ctx = new (window.AudioContext || window.webkitAudioContext)();

//Music: "Smile" by www.bensound.com
var audio = new Audio('https://res.cloudinary.com/al-ro/video/upload/v1534003672/bensound-smile_kdcvsq.mp3');
audio.crossOrigin = "anonymous";
var source = audio_ctx.createMediaElementSource(audio);
var analyser = audio_ctx.createAnalyser();

source.connect(analyser);
analyser.connect(audio_ctx.destination);
analyser.fftSize = 512;
var decay = 0.9;
analyser.smoothingTimeConstant = decay;

var frequencyCount = analyser.fftSize/2;
var frequencyData = new Uint8Array(analyser.frequencyBinCount);
var timeData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(frequencyData);

//analyser.maxDecibels = 0;
//analyser.minDecibels = -90;

//[0-1]
var extent_0 = 0.1;
var extent_1 = 0.1;
var extent_2 = 0.1;

var average = 0;
var avg_0 = 0;
var avg_1 = 0;
var avg_2 = 0;

var thrd_0;
var thrd_1;
var thrd_2;


var colour = 'rgb(0,128,128)';

function toggle() {
  if(audio.paused){
  audio.play();
  }else{
  audio.pause();
  }
}

canvas_1.addEventListener('mousedown', toggle);

var play_button = {play:function() {
  if(audio.paused){
    audio.play();
  } 
}};
var pause_button = {pause:function() {
  if(!audio.paused){
    audio.pause();
  }
}};
var stop_button = {stop:function() {
  if(!audio.paused){
    audio.pause();
    audio.currentTime = 0;
  }
}};

//canvas_1.addEventListener('mousedown', toggle);
//-----------GUI-----------//
//dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.addColor(this, 'colour');
gui.add(this, 'decay').min(0).max(1).step(0.01);
gui.add(play_button, 'play');
gui.add(pause_button, 'pause');
gui.add(stop_button, 'stop');
gui.close();

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
const sumElements = (accumulator, currentValue) => accumulator + currentValue;

function getAudioData() {

  analyser.smoothingTimeConstant = decay;
  //if(!audio.paused){
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);
  //}
  var sum = 0;
  var sum_0 = 0;
  var sum_1 = 0;
  var sum_2 = 0;

  thrd_0 = frequencyData.slice(0, frequencyCount/3);
  thrd_1 = frequencyData.slice(frequencyCount/3, frequencyCount - frequencyCount/3);
  thrd_2 = frequencyData.slice(frequencyCount - frequencyCount/3);

  sum_0 = thrd_0.reduce(sumElements);
  sum_1 = thrd_1.reduce(sumElements);
  sum_2 = thrd_2.reduce(sumElements);
  sum = sum_0 + sum_1 + sum_2;

  average = sum/frequencyCount;
  avg_0 = sum_0/(frequencyCount/3);
  avg_1 = sum_1/(frequencyCount/3);
  avg_2 = sum_2/(frequencyCount/3);

}

function drawCircleGlow(colour, radius){

  var grd = ctx.createRadialGradient(canvas_1.width/2, canvas_1.height/2, 0, canvas_1.width/2, canvas_1.height/2, Math.max(0,radius));
  grd.addColorStop(0.35, 'rgba(0,0,0,0)');
  grd.addColorStop(0.5, colour);
  grd.addColorStop(0.65, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(canvas_1.width/2, canvas_1.height/2, Math.max(0,radius), 0, TWO_PI);
  ctx.fill();

}

function drawDiscGlow(colour, radius){

  var grd = ctx.createRadialGradient(canvas_1.width/2, canvas_1.height/2, 0, canvas_1.width/2, canvas_1.height/2, Math.max(0,radius));
  grd.addColorStop(0.0, 'rgba(200, 200, 200,1');
  grd.addColorStop(0.15, colour);
  grd.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(canvas_1.width/2, canvas_1.height/2, Math.max(0,radius), 0, TWO_PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(canvas_1.width/2, canvas_1.height/2, Math.max(0,radius), 0, TWO_PI);
  ctx.fill();

}

function drawCircle(colour, radius, width){
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, width);
  ctx.beginPath();
  ctx.arc(canvas_1.width/2, canvas_1.height/2, Math.max(0,radius), 0, TWO_PI);
  ctx.stroke();
}

function draw() {

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,canvas_1.width, canvas_1.height);

  getAudioData();
  extent = 2 * Math.max(35, (average/256) * Math.min(canvas_1.width, canvas_1.height)/2);
  extent_0 = Math.max(30, (avg_0/256) * Math.min(canvas_1.width, canvas_1.height)/2);
  extent_1 = Math.max(20, (avg_1/256) * Math.min(canvas_1.width, canvas_1.height)/2);
  extent_2 = Math.max(0, (avg_2/256) * Math.min(canvas_1.width, canvas_1.height)/2);

  ctx.save();

  ctx.globalCompositeOperation = "lighter";
  
  drawCircleGlow(colour, 2 * extent);
  drawCircle('rgba(255,255,255,1)', extent, extent/20);

  drawCircleGlow(colour, 2 * extent_0);
  drawCircle('rgba(255,255,255,1)', extent_0, extent_0/35);

  drawCircleGlow(colour, 2 * extent_1);
  drawCircle('rgba(255,255,255,1)', extent_1, extent_1/35);

  drawDiscGlow(colour, extent_2);

  ctx.restore();

  window.requestAnimationFrame(draw);
}
draw();
