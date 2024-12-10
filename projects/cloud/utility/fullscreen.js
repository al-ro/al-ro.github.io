//Fullscreen button behaviour from:
//https://codepen.io/ludviglindblom/pen/medXwN

var enterFullscreen = function (el) {
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

var exitFullscreen = function () {
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

var noFullscreenSupport = function () {
	alert('Your browser does not support the Fullscreen API.');
};

var gui_container = document.getElementById("gui_container");
var fullscreenButton = document.getElementById('fullscreen-button');
document.addEventListener('fullscreenchange', exitHandler);
document.addEventListener('webkitfullscreenchange', exitHandler);
document.addEventListener('mozfullscreenchange', exitHandler);
document.addEventListener('MSFullscreenChange', exitHandler);

function exitHandler() {
	if (gui_container != null) {
		gui_container.classList.toggle("gui_container");
		gui_container.classList.toggle("fullscreen_gui_container");
	}
	if (!fullscreenButton.classList.contains("fullscreen-button-overlay")) {
		fullscreenButton.classList.toggle("fullscreen-button");
		fullscreenButton.classList.toggle("fullscreen-fullscreen-button");
	}
}

function escHandler() {
	if (isInFullscreen()) {
		exitFullscreen();
	}
}

function toggle_fullscreen(e) {
	if (isInFullscreen()) {
		exitFullscreen();
	} else {
		enterFullscreen(document.getElementById("canvas_container"));
	}
}

fullscreenButton.addEventListener('click', toggle_fullscreen);
document.addEventListener("keypress", function (e) {
	//ESC key
	if (e.key === 27) {
		escHandler();
	}
}, false);

function isInFullscreen() {
	if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
		return true;
	}
	return false;
}


var eventList = ["fullscreenchange", "MSFullscreenChange", "mozfullscreenchange", "webkitfullscreenchange"];
for (event of eventList) {
	window.addEventListener(event, function () {
		if (fullscreenButton.querySelector('.fa').classList.contains('fa-compress')) {
			fullscreenButton.querySelector('.fa').classList.add('fa-expand');
			fullscreenButton.querySelector('.fa').classList.remove('fa-compress');
		} else if (fullscreenButton.querySelector('.fa').classList.contains('fa-expand')) {
			fullscreenButton.querySelector('.fa').classList.remove('fa-expand');
			fullscreenButton.querySelector('.fa').classList.add('fa-compress');
		}
	});
}
