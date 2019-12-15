var audio_ctx;
var theme1;
var theme2;
var theme3;
var menu;
var laser;
var end;
var pickup;
var delivery;

var analyser;
var frequencyCount;
var frequencyData;
var timeData;

function initAudio(){
  audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
  theme1 = new Audio('https://al-ro.github.io/projects/jinglejam/music/LVL1-cut.wav');
  theme2 = new Audio('https://al-ro.github.io/projects/jinglejam/music/LVL2.wav');
  theme3 = new Audio('https://al-ro.github.io/projects/jinglejam/music/LVL3.wav');
  menu = new Audio('https://al-ro.github.io/projects/jinglejam/music/Main_Menu_C_WITH_MELODY.wav');
  laser = new Audio('https://al-ro.github.io/projects/jinglejam/music/laser(hit).wav');
  end = new Audio('https://al-ro.github.io/projects/jinglejam/music/CompletionMusic.wav');
  pickup = new Audio('https://al-ro.github.io/projects/jinglejam/music/powerUp.wav');
  delivery = new Audio('https://al-ro.github.io/projects/jinglejam/music/item_delivery_short.wav');
  audio.crossOrigin = "anonymous";
  var source = audio_ctx.createMediaElementSource(audio);
  analyser = audio_ctx.createAnalyser();

  source.connect(analyser);
  analyser.connect(audio_ctx.destination);
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.5;
  frequencyCount = analyser.fftSize/2;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
};

var sound = false;

function playTheme(){
  audio.play();
  sound = true;
}
function pauseAudio(){
  audio.pause();
  sound = false;
}
