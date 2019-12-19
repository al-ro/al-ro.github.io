var audio_ctx;
var theme3;
var menu;
var laser;
var end;
var pickup;
var delivery;
var damage;
var credits;

var analyser;
var frequencyCount;
var frequencyData;
var timeData;

var theme;

var songs = [];

function initAudio(){
  audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
  menu = new Audio('./music/Main_Menu_C_WITH_MELODY.wav');
  theme3 = new Audio('./music/LVL3.wav');
  laser = new Audio('./music/laser(hit).wav');
  end = new Audio('./music/CompletionMusic.wav');
  pickup = new Audio('./music/powerUp.wav');
  delivery = new Audio('./music/item_delivery_short.wav');
  damage = new Audio('./music/Damage_Sound.wav');
  credits = new Audio('./music/End_Music_Melody.wav');
  theme = theme3;
  
  songs.push(theme3);
  songs.push(menu);
  songs.push(laser);
  songs.push(end);
  songs.push(pickup);
  songs.push(delivery);
  songs.push(damage);
  songs.push(credits);

  menu.loop = true;
  theme3.loop = true;
  credits.loop = true;
  //end.loop = true;
  end.addEventListener('ended', function() {
      credits.play();
      }, false);
  damage.addEventListener('ended', function() {
      credits.play();
      }, false);

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
  theme.currentTime = 0;
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

function playPickUp(){
  pickup.currentTime = 0;
  pickup.play();
}

function playDelivery(){
  pickup.currentTime = 0;
  pickup.play();
}

function stopDamage(){
  damage.pause();
}

function playDamage(){
  for(var i = 0; i < songs.length; i++){
    if(songs[i] != laser){
      songs[i].pause();
    }
  }
  damage.currentTime = 0;
  damage.play();
  current = damage;
  sound = true;
}
