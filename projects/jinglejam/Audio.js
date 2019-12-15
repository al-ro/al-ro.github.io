var audio_ctx;
var audio;
var analyser;
var frequencyCount;
var frequencyData;
var timeData;

function initAudio(){
  audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
  audio = new Audio('https://al-ro.github.io/projects/jinglejam/music/LVL1-cut.wav');
  audio.crossOrigin = "anonymous";
  var source = audio_ctx.createMediaElementSource(audio);
  analyser = audio_ctx.createAnalyser();

  source.connect(analyser);
  analyser.connect(audio_ctx.destination);
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = decay;
  frequencyCount = analyser.fftSize/2;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
};

function playTheme(){
  audio.play();
}
