const enterFullscreen = (el) => {
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen();
  } else if (el.mozRequestFullScreen) {
    el.mozRequestFullScreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else {
    noFullscreenSupport();
  }
};

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else {
    noFullscreenSupport();
  }
};

const noFullscreenSupport = () => {
  alert('Your browser does not support the Fullscreen API.');
};

const guiContainer = document.getElementById("gui_container");
const fullscreenButton = document.getElementById('fullscreen-button');
const canvasContainer = document.getElementById("canvas_container");

const isInFullscreen = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
};

const exitHandler = () => {
  if (guiContainer) {
    guiContainer.classList.toggle("gui_container");
    guiContainer.classList.toggle("fullscreen_gui_container");
  }
  if (!fullscreenButton.classList.contains("fullscreen-button-overlay")) {
    fullscreenButton.classList.toggle("fullscreen-button");
    fullscreenButton.classList.toggle("fullscreen-fullscreen-button");
  }
};

const toggleFullscreen = () => {
  if (isInFullscreen()) {
    exitFullscreen();
  } else if (canvasContainer) {
    enterFullscreen(canvasContainer);
  }
};

const eventList = ["fullscreenchange", "MSFullscreenChange", "mozfullscreenchange", "webkitfullscreenchange"];
eventList.forEach((event) => {
  document.addEventListener(event, exitHandler);

  window.addEventListener(event, () => {
    const icon = fullscreenButton.querySelector('.fa');
    if (!icon) return;

    if (icon.classList.contains('fa-compress')) {
      icon.classList.replace('fa-compress', 'fa-expand');
    } else if (icon.classList.contains('fa-expand')) {
      icon.classList.replace('fa-expand', 'fa-compress');
    }
  });
});

fullscreenButton.addEventListener('click', toggleFullscreen);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (isInFullscreen()) {
      exitFullscreen();
    }
  }
}, false);
