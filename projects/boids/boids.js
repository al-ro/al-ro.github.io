var canvas = document.getElementById("canvas_1");
var cont = document.getElementById("cc_1");

var TWO_PI = Math.PI*2;

  const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      //|| navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
      );

//Spatial variables
var width = 2000;
var height = 2000;
var depth = 2000;
var centre = [width/2,height/2, depth/2];

//Agents
var boids = [];
var food = [];
var predators = [];

var boidCount;
if(mobile){
  boidCount = 200;
}else{
  boidCount = 600;
}

var foodCount = 10;
var predatorCount = 3;

var periodic = false;
var sphere = true;
var toggle_predators = false;

//Boid movement variables
var neighbourhood = width/6;
var proximity = width/40;
var minNeighbour = width/10;
var maxNeighbour = width/2;
var minProx = width/100;
var maxProx = 4*proximity;
var speed = 3;

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w,h,false);
renderer.setClearColor( 0x66deff, 1);

distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);

camera.position.set(centre[0], centre[1], -width/2);
camera.lookAt(new THREE.Vector3(centre[0], centre[1], centre[2]));

scene.add(camera);

//Lights
var light_1 = new THREE.AmbientLight( 0xffffff, 1.7); 
scene.add(light_1);

var light_2;
light_2 = new THREE.DirectionalLight(0xa0a0a0, 0.5);
light_2.position.set(0, -1, 0);
scene.add(light_2);

var light_3;
light_3 = new THREE.DirectionalLight(0xa0a0a0, 1);
light_3.position.set(0, 1, -1);
scene.add(light_3);

//Paper plane geometry
var geom = new THREE.Geometry();
var p_geom = new THREE.SphereGeometry( 5, 32, 32 );

//Brackets for purely aesthetic considerations
{
  geom.vertices.push(
      new THREE.Vector3(   0,  0.5,  0 ),
      new THREE.Vector3( -0.4, -0.6, 0 ),
      new THREE.Vector3( -0.1, -0.6, -0.1 ),
      new THREE.Vector3(   0, -0.6, 0.15 ),
      new THREE.Vector3(  0.1, -0.6, -0.1 ),
      new THREE.Vector3(  0.4, -0.6, 0 )
      );
}

geom.faces.push( new THREE.Face3( 0, 1, 2 ) );
geom.faces.push( new THREE.Face3( 0, 2, 3 ) );
geom.faces.push( new THREE.Face3( 0, 3, 4 ) );
geom.faces.push( new THREE.Face3( 0, 4, 5 ) );

geom.scale(30,30,30);
//Rotate planes to point forward with their noses
geom.rotateX( Math.PI / 2 );

var colour = 0xffffff;

var material = new THREE.MeshStandardMaterial( {color: colour, side: THREE.DoubleSide, shading: THREE.FlatShading} );
var p_material = new THREE.MeshStandardMaterial( {color: 0xff0000, side: THREE.DoubleSide, shading: THREE.FlatShading} );

//Generate random boids
for(i = 0; i < boidCount; i++){

  var g_ = new THREE.Mesh(geom, material);
  var x = 0.5 - Math.random();
  var y = 0.5 - Math.random();
  var z = 0.5 - Math.random();

  var boid = {
    vel_x: x,
    vel_y: y,
    vel_z: z,
    geo: g_
  };

  boid.geo.position.x = width/2 - Math.random() * width;
  boid.geo.position.y = height/2 - Math.random() * height;
  boid.geo.position.z = depth/2 - Math.random() * depth;
  boids.push(boid);
}

for(i = 0; i < boids.length; i++){
  scene.add(boids[i].geo);
}

//Generate food and predators
for(i = 0; i < predatorCount; i++){

  var g_ = new THREE.Mesh(geom, p_material);
  var x = 0.5 - Math.random();
  var y = 0.5 - Math.random();
  var z = 0.5 - Math.random();

  var predator = {
    vel_x: 0,
    vel_y: 0,
    vel_z: 0,
    geo: g_
  };

  predator.geo.position.x = width/2 - Math.random() * width;
  predator.geo.position.y = height/2 - Math.random() * height;
  predator.geo.position.z = depth/2 - Math.random() * depth;
  if(!toggle_predators){
    predator.geo.visible = false;
  }
  predators.push(predator);
};


for(i = 0; i < predators.length; i++){
  scene.add(predators[i].geo);
}

//-----------GUI-----------//
//dat.gui library controls
var reset_button = { reset:function(){ 
  toggle_predators = false;
  setTransparency();
  colour = 0xffffff;
  setColour(colour);
  periodic = false;
  sphere = true;
  speed = 3;
  neighbourhood = width/6;
  proximity = width/40;
  
  for(i = 0; i < boidCount; i++){

  var x = 0.5 - Math.random();
  var y = 0.5 - Math.random();
  var z = 0.5 - Math.random();

    boids[i].vel_x = x;
    boids[i].vel_y = y;
    boids[i].vel_z = z;

  boids[i].geo.position.x = width/2 - Math.random() * width;
  boids[i].geo.position.y = height/2 - Math.random() * height;
  boids[i].geo.position.z = depth/2 - Math.random() * depth;
}

}};


var gui = new dat.GUI({ autoPlace: false });

var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'proximity').min(minProx).max(maxProx).step(10).listen();
gui.add(this, 'neighbourhood').min(minNeighbour).max(maxNeighbour).step(10).listen();
gui.add(this, 'speed').min(0).max(10).step(1).listen();
gui.add(this, 'sphere').listen().onChange(function(value) { periodic = false; sphere = true;} );
gui.add(this, 'periodic').listen().onChange(function(value) { periodic = true; sphere = false;} );
if(!mobile){
gui.addColor(this, 'colour').listen().onChange(function(value) { setColour();} );
}
gui.add(this, 'toggle_predators').listen().onChange(function(value){ setTransparency();});
gui.add(reset_button, 'reset');

gui.close();

function setColour(){
  material.color.setHex(colour);
}

function setTransparency(){
  if(toggle_predators){
    for(p = 0; p < predatorCount; p++){
      predators[p].geo.visible = true
      predators[p].geo.position.x = width/2 - Math.random() * width;
      predators[p].geo.position.y = height/2 - Math.random() * height;
      predators[p].geo.position.z = depth/2 - Math.random() * depth;;
    }
  }else{
    for(p = 0; p < predatorCount; p++){
      predators[p].geo.visible = false;
    }
  }
}


//----------RULES----------//
function rules(i){
  var direction = {
    x: 0,
    y: 0,
    z: 0
  } 
  var position = {
    x: 0,
    y: 0,
    z: 0
  };
  var spread = {
    x: 0,
    y: 0,
    z: 0
  };

  var neighbours = 0;
  var dist;
  var dot;
  for(j = 0; j < boidCount; j++){
    if(i != j){
      dist = Math.sqrt((boids[i].geo.position.x - boids[j].geo.position.x) * (boids[i].geo.position.x - boids[j].geo.position.x) + (boids[i].geo.position.y - boids[j].geo.position.y) * (boids[i].geo.position.y - boids[j].geo.position.y) +(boids[i].geo.position.z - boids[j].geo.position.z) * (boids[i].geo.position.z - boids[j].geo.position.z));
      dot = boids[i].vel_x * (boids[j].geo.position.x - boids[i].geo.position.x) + boids[i].vel_y * (boids[j].geo.position.y - boids[i].geo.position.y)  + boids[i].vel_z * (boids[j].geo.position.z - boids[i].geo.position.z);  
      if((dist < neighbourhood) && (dot > -0.75)){
        neighbours++;
        direction.x += boids[j].vel_x;
        direction.y += boids[j].vel_y;
        direction.z += boids[j].vel_z;

        position.x += boids[j].geo.position.x;
        position.y += boids[j].geo.position.y;
        position.z += boids[j].geo.position.z;
      }

      if(dist < proximity){
        spread.x = (boids[i].geo.position.x - boids[j].geo.position.x);
        spread.y = (boids[i].geo.position.y - boids[j].geo.position.y);
        spread.z = (boids[i].geo.position.z - boids[j].geo.position.z);

        boids[i].vel_x += (spread.x)/500;
        boids[i].vel_y += (spread.y)/500;
        boids[i].vel_z += (spread.z)/500;  
      }    
    }
  }

  if(toggle_predators){
    for(p = 0; p < predatorCount; p++){
      dist = Math.sqrt((boids[i].geo.position.x - predators[p].geo.position.x) * (boids[i].geo.position.x - predators[p].geo.position.x) + (boids[i].geo.position.y - predators[p].geo.position.y) * (boids[i].geo.position.y - predators[p].geo.position.y) +(boids[i].geo.position.z - predators[p].geo.position.z) * (boids[i].geo.position.z - predators[p].geo.position.z));
      if(dist < 0.5*neighbourhood){

        spread.x = (boids[i].geo.position.x - predators[p].geo.position.x);
        spread.y = (boids[i].geo.position.y - predators[p].geo.position.y);
        spread.z = (boids[i].geo.position.z - predators[p].geo.position.z);

        boids[i].vel_x += (spread.x)/150;
        boids[i].vel_y += (spread.y)/150;
        boids[i].vel_z += (spread.z)/150;  
      }
    }
  }
  direction.x /= neighbours;
  direction.y /= neighbours;
  direction.z /= neighbours;

  position.x /= neighbours;
  position.y /= neighbours;
  position.z /= neighbours;

  if(neighbours > 0){
    boids[i].vel_x += (direction.x - boids[i].vel_x)/200;
    boids[i].vel_y += (direction.y - boids[i].vel_y)/200;
    boids[i].vel_z += (direction.z - boids[i].vel_z)/200;

    boids[i].vel_x += (position.x - boids[i].geo.position.x)/500;
    boids[i].vel_y += (position.y - boids[i].geo.position.y)/500;
    boids[i].vel_z += (position.z - boids[i].geo.position.z)/500; 
  }
}

function selectPrey(p){
  var prey = 0;
  var minDist = width * 100;

  var position = {
    x: 0,
    y: 0,
    z: 0
  };

  for(i = 0; i < boidCount; i++){
    dist = Math.sqrt((boids[i].geo.position.x - predators[p].geo.position.x) * (boids[i].geo.position.x - predators[p].geo.position.x) + (boids[i].geo.position.y - predators[p].geo.position.y) * (boids[i].geo.position.y - predators[p].geo.position.y) +(boids[i].geo.position.z - predators[p].geo.position.z) * (boids[i].geo.position.z - predators[p].geo.position.z));
    dot = predators[p].vel_x * (boids[i].geo.position.x - predators[p].geo.position.x) + predators[p].vel_y * (boids[i].geo.position.y - predators[p].geo.position.y)  + predators[p].vel_z * (boids[i].geo.position.z - predators[p].geo.position.z);  
    if((Math.abs(dist) < Math.abs(minDist)) && (dot > 0.75)){
      minDist = dist;
      prey = i;  
    }
  }

  position.x = (predators[p].geo.position.x - boids[prey].geo.position.x);
  position.y = (predators[p].geo.position.y - boids[prey].geo.position.y);
  position.z = (predators[p].geo.position.z - boids[prey].geo.position.z);
 
  predators[p].vel_x -= position.x/150;
  predators[p].vel_y -= position.y/150;
  predators[p].vel_z -= position.z/150;
}

//----------MOVE----------//
function move(){
  for(i = 0; i < boidCount; i++){

    if(periodic){
      if(boids[i].geo.position.x > width/2){
        boids[i].geo.position.x = -width/2+10;
      }
      if(boids[i].geo.position.y > height/2){
        boids[i].geo.position.y = -height/2+10;
      }
      if(boids[i].geo.position.z > depth/2){
        boids[i].geo.position.z = -depth/2+10;
      }

      if(boids[i].geo.position.x < -width/2){
        boids[i].geo.position.x = width/2-10;
      }
      if(boids[i].geo.position.y < -height/2){
        boids[i].geo.position.y = height/2-10;
      }
      if(boids[i].geo.position.z < -depth/2){
        boids[i].geo.position.z = depth/2-10;
      }
    }

    if(sphere){
      var dist = Math.sqrt(boids[i].geo.position.x * boids[i].geo.position.x + boids[i].geo.position.y * boids[i].geo.position.y + boids[i].geo.position.z * boids[i].geo.position.z); 
      if(dist > width/2){
        boids[i].vel_x -= boids[i].geo.position.x/5000;
        boids[i].vel_y -= boids[i].geo.position.y/5000;
        boids[i].vel_z -= boids[i].geo.position.z/5000;
      }
    }

    var magnitude = Math.sqrt((boids[i].vel_x * boids[i].vel_x) + (boids[i].vel_y * boids[i].vel_y) + (boids[i].vel_z * boids[i].vel_z));

    if(magnitude > 0){
      boids[i].vel_x /= magnitude;
      boids[i].vel_y /= magnitude;
      boids[i].vel_z /= magnitude;
    }

    if(speed > 0){
      boids[i].vel_x *= speed;
      boids[i].vel_y *= speed;
      boids[i].vel_z *= speed;

      boids[i].geo.position.x += boids[i].vel_x;
      boids[i].geo.position.y += boids[i].vel_y;
      boids[i].geo.position.z += boids[i].vel_z;

      boids[i].geo.lookAt(new THREE.Vector3(boids[i].geo.position.x + boids[i].vel_x, boids[i].geo.position.y + boids[i].vel_y, boids[i].geo.position.z + boids[i].vel_z));
    }
  }

  if(toggle_predators){
    for(p = 0; p < predatorCount; p++){
      var dist = Math.sqrt(predators[p].geo.position.x * predators[p].geo.position.x + predators[p].geo.position.y * predators[p].geo.position.y + predators[p].geo.position.z * predators[p].geo.position.z); 
      if(dist > width/2){
        predators[p].vel_x -= predators[p].geo.position.x/50;
        predators[p].vel_y -= predators[p].geo.position.y/50;
        predators[p].vel_z -= predators[p].geo.position.z/50;
      }

      var magnitude = Math.sqrt((predators[p].vel_x * predators[p].vel_x) + (predators[p].vel_y * predators[p].vel_y) + (predators[p].vel_z * predators[p].vel_z));

      if(magnitude > 0){
        predators[p].vel_x /= magnitude;
        predators[p].vel_y /= magnitude;
        predators[p].vel_z /= magnitude;
      }

      if(speed > 0){
        predators[p].vel_x *= speed;
        predators[p].vel_y *= speed;
        predators[p].vel_z *= speed;

        predators[p].geo.position.x += predators[p].vel_x;
        predators[p].geo.position.y += predators[p].vel_y;
        predators[p].geo.position.z += predators[p].vel_z;

        predators[p].geo.lookAt(new THREE.Vector3(predators[p].geo.position.x + predators[p].vel_x, predators[p].geo.position.y + predators[p].vel_y, predators[p].geo.position.z + predators[p].vel_z));
      }
    }
  } 
}


//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls( camera, renderer.domElement );

//----------DRAW----------//
function draw(){

  if(toggle_predators){
  for(p = 0; p < predatorCount; p++){
    selectPrey(p);
  }
  }

  for(i = 0; i < boidCount; i++){
    rules(i);
  }

  move();
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
