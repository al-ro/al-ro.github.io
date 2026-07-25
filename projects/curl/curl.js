//Based on
//http://petewerner.blogspot.co.uk/2015/02/intro-to-curl-noise.html

let ctx = canvas_1.getContext("2d");
let TWO_PI = 2 * Math.PI;

const mobile = (navigator.userAgent.match(/Android/i)
  || navigator.userAgent.match(/webOS/i)
  || navigator.userAgent.match(/iPhone/i)
  || navigator.userAgent.match(/iPod/i)
  || navigator.userAgent.match(/BlackBerry/i)
  || navigator.userAgent.match(/Windows Phone/i)
);

if (mobile) {
  canvas_1.width = 720;
  canvas_1.height = 450;
}

//Flag for x direction flow
var flow = false;
let discCount = mobile ? 300 : 10000;

//https://krazydad.com/tutorials/makecolors.php
let colours = [];

let colourCount = 256;
let center = 128;
let width = 127;

for (s = 0; s < colourCount; s++) {
  colours[s] = [
    Math.round(Math.sin(0.3 * s + 0) * width + center),
    Math.round(Math.sin(0.3 * s + 2) * width + center),
    Math.round(Math.sin(0.3 * s + 4) * width + center)
  ];
}

//Populate array with stationary discs at random locations
let discs = [];

for (i = 0; i < discCount; i++) {
  let rgb = colours[i % colourCount];
  let style = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' +rgb[2] + ', 1)';
  let disc = {
    x: Math.random() * canvas_1.width,
    y: Math.random() * canvas_1.height,
    xVel: 0,
    yVel: 0,
    radius: 1.5,
    colour: style
  };
  discs.push(disc);
}

//Move discs based on velocity and place them back in the domain if they go beyond the boundaries
//For flow, reintroduce discs at the left boundary, otherwise place in a random point
function move() {
  for (i = 0; i < variables.count; i++) {
    if (discs[i].x < discs[i].radius) {
      if (flow) {
        discs[i].x = discs[i].radius;
        discs[i].y = Math.random() * canvas_1.height;
      } else {
        discs[i].x = Math.random() * canvas_1.width;
        discs[i].y = Math.random() * canvas_1.height;
      }
    }
    if (discs[i].y < discs[i].radius) {
      if (flow) {
        discs[i].x = discs[i].radius;
        discs[i].y = Math.random() * canvas_1.height;
      } else {
        discs[i].x = Math.random() * canvas_1.width;
        discs[i].y = Math.random() * canvas_1.height;
      }
    }
    if (discs[i].x > canvas_1.width - discs[i].radius) {
      if (flow) {
        discs[i].x = discs[i].radius;
        discs[i].y = Math.random() * canvas_1.height;
      } else {
        discs[i].x = Math.random() * canvas_1.width;
        discs[i].y = Math.random() * canvas_1.height;
      }
    }
    if (discs[i].y > canvas_1.height - discs[i].radius) {
      if (flow) {
        discs[i].x = discs[i].radius;
        discs[i].y = Math.random() * canvas_1.height;
      } else {
        discs[i].x = Math.random() * canvas_1.width;
        discs[i].y = Math.random() * canvas_1.height;
      }
    }
    discs[i].x += discs[i].xVel;
    discs[i].y += discs[i].yVel;
  }
}

//Use noise.js library to generate a grid of 2D simplex noise values
try {
  noise.seed(Math.random());
}
catch (err) {
  console.log(err.message);
}

//Find the curl of the noise field based on on the noise value at the location of a disc
function computeCurl(x, y) {
  let eps = 0.0001;

  //Find rate of change in X direction
  let n1 = noise.simplex2(x + eps, y);
  let n2 = noise.simplex2(x - eps, y);
  //Average to find approximate derivative
  let a = (n1 - n2) / (2 * eps);

  //Find rate of change in Y direction
  n1 = noise.simplex2(x, y + eps);
  n2 = noise.simplex2(x, y - eps);
  //Average to find approximate derivative
  let b = (n1 - n2) / (2 * eps);

  //Curl
  return [b, -a];
}

//The step to start with. See below.
let initialStepSize = mobile ? 75 : 250;
let initialCount = mobile ? 100 : 1000;

let initialSize = 1.5;
let initialSpeed = 0.5;
let initialFade = 0.0;

function clearCanvas(){
  ctx.fillStyle = "rgb(25,25,25, 1.0)";
  ctx.fillRect(0, 0, canvas_1.width, canvas_1.height);
}

//Different values for velocity, colour etc.
let variables = {
  speed: initialSpeed,
  fade: initialFade,
  //The step controls the zoom of the noise field. A large value creates bigger vortices, a smaller value leads to more features
  stepSize: initialStepSize,
  particleSize: initialSize,
  rainbow: true,
  colourString: 'rgb(255,255,255)',
  colour: [1, 1, 1],
  colourHex: '#ffffff',
  count: initialCount
}

let resetButton = {
  reset: function () {
    variables.speed = initialSpeed;
    variables.stepSize = initialStepSize;
    variables.particleSize = initialSize;
    variables.rainbow = true;
    variables.colourString = 'rgb(255,255,255)';
    variables.colour = [1, 1, 1];
    variables.colourHex = '#ffffff';
    variables.fade = initialFade;
    variables.count = initialCount;
    flow = false;

    discs.forEach((disc) => {disc.x = Math.random() * canvas_1.width; disc.y = Math.random() * canvas_1.height;});
    clearCanvas();
  }
};

let clearButton = {
  clear: function () {
    clearCanvas();
  }
};

function clamp(x, a, b){
  return Math.max(Math.min(x,b), a);
}


const goldenRatioConjugate = (Math.sqrt(5) - 1) / 2;
let colorSequenceIndex = 0;

function randomColour(){

  colorSequenceIndex += 1;
  const hue = ((colorSequenceIndex * goldenRatioConjugate) % 1) * 360;
  const hueRad = (hue * Math.PI) / 180;

  const L = 0.9;
  const a = 0.4 * Math.cos(hueRad);
  const b = 0.4 * Math.sin(hueRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let rLinear =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  rLinear = clamp(rLinear, 0.0, 1.0);
  gLinear = clamp(gLinear, 0.0, 1.0);
  bLinear = clamp(bLinear, 0.0, 1.0);

  return [rLinear, gLinear, bLinear];
}

let randomButton = {
  random: function () {
    //Use noise.js library to generate a grid of 2D simplex noise values
    try {
      noise.seed(Math.random());
    }
    catch (err) {
      console.log(err.message);
    }
    clearCanvas();
    variables.speed = 0.1 + Math.random() * 0.9;
    if (!mobile) {
      variables.stepSize = Math.round(10 + Math.random() * 500);
    } else {
      variables.stepSize = Math.round(10 + Math.random() * 250);
    }
    variables.particleSize = 0.1 + Math.random() * 4.9;
    variables.rainbow = false;

    variables.colour = randomColour();

    const toHex = (val) => val.toString(16).padStart(2, '0');
    let r =  Math.round(variables.colour[0] * 255);
    let g =  Math.round(variables.colour[1] * 255);
    let b =  Math.round(variables.colour[2] * 255);
    variables.colourHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    variables.colourString = `rgb(`+ r + `,` + g + `,` + b + `)`;

    if (variables.particleSize >= 2) {
      variables.fade = Math.random() * 0.1;
    } else {
      variables.fade = Math.random() * 0.01;
    }
  }
};

function onWindowResize() {
  let w = canvas_1.clientWidth;
  let h = canvas_1.clientHeight;
  if (!isInFullscreen()) {
    h = w / 1.6;
  }
  canvas_1.width = w;
  canvas_1.height = h;

  let canvasOverlay = document.getElementById("canvas_overlay");
  canvasOverlay.style.width = w + "px";
  canvasOverlay.style.height = h + "px";
  canvasOverlay.style.bottom = h + "px";
  canvasOverlay.style.visibility = "hidden";

  let canvasContainer = document.getElementById("canvas_container");
  canvasContainer.style.height = h + "px";

  discs.forEach((disc) => {disc.x = Math.random() * canvas_1.width; disc.y = Math.random() * canvas_1.height;});
  clearCanvas();
}

const resizeObserver = new ResizeObserver(onWindowResize);
resizeObserver.observe(canvas_1);

let gui = new lil.GUI({ autoPlace: false });
let customContainer = document.getElementById('canvas_overlay');
customContainer.appendChild(gui.domElement);

gui.domElement.style.cssText = "visibility: visible; position: absolute; top: 0px; right: 0; opacity: 0.8; z-index: 10000";

gui.add(variables, 'count').min(32).max(discCount).step(10).listen().onChange(
  function (value) {
    discs.forEach((disc) => {disc.x = Math.random() * canvas_1.width; disc.y = Math.random() * canvas_1.height;});
    clearCanvas();
  });

if (!mobile) {
  gui.add(variables, 'stepSize').min(10).max(3000).step(10).listen().onChange(function (value) { clearCanvas(); });
} else {
  gui.add(variables, 'stepSize').min(10).max(600).step(5).listen().onChange(function (value) { clearCanvas(); });
}

gui.add(variables, 'speed').min(0.0).max(1.0).step(0.01).listen();
gui.add(variables, 'particleSize').min(0.1).max(5).step(0.1).listen();
gui.add(variables, 'fade').min(0.0).max(1.0).step(0.01).listen();
gui.addColor(variables, 'colourHex').listen().onChange(function (value) {
  variables.rainbow = false;

  const cleanHex = value.replace('#', '');

  const rInt = parseInt(cleanHex.substring(0, 2), 16);
  const gInt = parseInt(cleanHex.substring(2, 4), 16);
  const bInt = parseInt(cleanHex.substring(4, 6), 16);

  variables.colour = [rInt / 255, gInt / 255, bInt / 255];
  variables.colourString = `rgb(${rInt},${gInt},${bInt})`;
});

gui.add(this, 'flow').listen();
gui.add(randomButton, 'random');
gui.add(resetButton, 'reset');
gui.add(clearButton, 'clear');
gui.close();

clearCanvas();

//********************** DRAW **********************
function draw() {

  //Draw over previous frame with a rectangle of variable transparency
  ctx.fillStyle = "rgba(25,25,25, " + variables.fade + ")";
  ctx.fillRect(0, 0, canvas_1.width, canvas_1.height);

  move();

  for (i = 0; i < variables.count; i++) {
    if (variables.rainbow) {
      ctx.fillStyle = discs[i].colour;
    } else {
      ctx.fillStyle = variables.colourString;
    }

    //Find the curl of the noise field at the location of the disc (wrt the step)
    let curl = computeCurl(discs[i].x / variables.stepSize, discs[i].y / variables.stepSize);
    //Set the velocity of the discs to the curl
    discs[i].xVel = variables.speed * curl[0];
    discs[i].yVel = variables.speed * curl[1];

    if (flow) {
      //Add overall velocity in the positive x direction
      discs[i].xVel += variables.speed * 3;
    }

    ctx.beginPath();
    ctx.arc(discs[i].x, discs[i].y, variables.particleSize, 0, TWO_PI);
    ctx.fill();
  }

  window.requestAnimationFrame(draw);
}

draw();
