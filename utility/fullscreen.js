//Fullscreen button behaviour from:
//https://codepen.io/ludviglindblom/pen/medXwN

var enterFullscreen = function(el) {
  if(el.requestFullscreen) {
    el.requestFullscreen();
  } else if(el.msRequestFullscreen) {
    el.msRequestFullscreen();
  } else if(el.mozRequestFullScreen) {
    el.mozRequestFullScreen();
  } else if(el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else {
    noFullscreenSupport();
  }
};

var exitFullscreen = function() {
  if(document.exitFullscreen) {
    document.exitFullscreen();
  } else if(document.msExitFullscreen) {
    document.msExitFullscreen();
  } else if(document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if(document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else {
    noFullscreenSupport();
  }
};

var noFullscreenSupport = function() {
  alert('Your browser does not support the Fullscreen API.');
};

var element = document.getElementById("main-container");
var gui_ = document.getElementById("gui_container");
var title = document.getElementById("title");
var header = document.getElementById("header");
var body_ = document.body;
var fullscreenButton = document.getElementById('fullscreen-button');
document.addEventListener('fullscreenchange', exitHandler);
document.addEventListener('webkitfullscreenchange', exitHandler);
document.addEventListener('mozfullscreenchange', exitHandler);
document.addEventListener('MSFullscreenChange', exitHandler);

function exitHandler() {
  if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
    exitFullscreen();
    element.classList.toggle("container");
    element.classList.toggle("fullscreen-container");
    title.classList.toggle("fullscreen-title");
    header.classList.toggle("post_header");
    header.classList.toggle("fullscreen-header");
    gui_.classList.toggle("gui_c");
    gui_.classList.toggle("fullscreen_gui_c");
    body_.style.overflow = "visible";
  }else{
  
  }
}  

function toggle_fullscreen(e) {
  if((window.innerWidth === screen.width && window.innerHeight === screen.height) || (window.fullScreen)) {
    exitFullscreen();
  } else {
    enterFullscreen(document.documentElement);
    element.classList.toggle("container");
    element.classList.toggle("fullscreen-container");
    title.classList.toggle("fullscreen-title");
    header.classList.toggle("post_header");
    header.classList.toggle("fullscreen-header");
    gui_.classList.toggle("gui_c");
    gui_.classList.toggle("fullscreen_gui_c");
    body_.style.overflow = "hidden";
  } 
}

fullscreenButton.addEventListener('click', toggle_fullscreen);


var eventList = ["fullscreenchange", "MSFullscreenChange", "mozfullscreenchange", "webkitfullscreenchange"];
for(event of eventList) {
  window.addEventListener(event, function() {
    if(fullscreenButton.querySelector('.fa').classList.contains('fa-compress')) {
      fullscreenButton.querySelector('.fa').classList.add('fa-expand');
      fullscreenButton.querySelector('.fa').classList.remove('fa-compress');
    } else if(fullscreenButton.querySelector('.fa').classList.contains('fa-expand')) {
      fullscreenButton.querySelector('.fa').classList.remove('fa-expand');
      fullscreenButton.querySelector('.fa').classList.add('fa-compress');
    }
  });
}
