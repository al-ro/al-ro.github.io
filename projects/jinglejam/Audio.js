var audio_ctx;
var theme1;
var theme2;
var theme3;
var menu;
var laser;
var end;
var pickup;
var delivery;
var damage;

var analyser;
var frequencyCount;
var frequencyData;
var timeData;

var theme;

var songs = [];

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
  damage = new Audio('https://al-ro.github.io/projects/jinglejam/music/Damage_Sound.wav');
  theme = theme1;
  
  songs.push(theme1);
  songs.push(theme2);
  songs.push(theme3);
  songs.push(menu);
  songs.push(laser);
  songs.push(end);
  songs.push(pickup);
  songs.push(delivery);
  songs.push(damage);

  for(var i = 0; i < songs.length; i++){
    songs[i].crossOrigin = "anonymous";
    songs[i].currentTime = 0;;
  }

  var source = audio_ctx.createMediaElementSource(theme);
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

function playMainTheme(){
  for(var i = 0; i < songs.length; i++){
    songs[i].pause();
  }
  menu.currentTime = 0;
  theme.play();
  sound = true;
  current = theme;
}
function pauseAudio(){
  for(var i = 0; i < songs.length; i++){
    songs[i].pause();
  }
  sound = false;
}
function playMenuTheme(){
  for(var i = 0; i < songs.length; i++){
    songs[i].pause();
  }
  menu.currentTime = 0;
  menu.play();
  current = menu;
  sound = true;
}

function playEnd(){
  for(var i = 0; i < songs.length; i++){
    songs[i].pause();
  }
  end.currentTime = 0;
  end.play();
  current = end;
  sound = true;
}

function playTheme(){
  current.play();
  sound = true;
}

function playLaserHit(){
  laser.currentTime = 0;
  laser.play();
}

function stopDamage(){
  damage.pause();
}

function playDamage(){
  for(var i = 0; i < songs.length; i++){
    songs[i].pause();
  }
  damage.currentTime = 0;
  damage.play();
  current = damage;
  sound = true;
}
