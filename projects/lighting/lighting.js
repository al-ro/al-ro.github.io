var canvas = document.getElementById("canvas_1");
var cont = document.getElementById("cc_1");

var TWO_PI = Math.PI*2;

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
    );

//Camera rotate
var rotate = false;

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w,h,false);
renderer.setClearColor( 0x000000, 1);
distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 1, 20000);
camera.position.set(10, 0, 100);
if(mobile){
  camera.position.set(-40, 20, 40);
}
scene.add(camera);

//Lights
var light_1 = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(light_1);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = rotate;
controls.autoRotateSpeed = 2.5;

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

//https://learnopengl.com/Lighting/Basic-Lighting
var vertexSource = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
  vNormal = normal;
  vPosition = vec3(modelMatrix * vec4(position, 1.0));
}`;

var fragmentSource = `
precision mediump float;

uniform float ambientStrength;
uniform float diffuseStrength;
uniform float specularStrength;
uniform float shininess;
uniform float time;
uniform vec3 lightColour;
uniform vec3 lightPosition;
uniform vec3 ambientColour;
uniform vec3 diffuseColour;
uniform vec3 specularColour;
//Normalize interpolated normal
//http://learnwebgl.brown37.net/10_surface_properties/smooth_vertex_normals.html
varying vec3 vNormal;
varying vec3 vPosition;


void main() {
  vec3 lightDirection = normalize(lightPosition - vPosition); 
  //Ambient colour is constant
  vec3 ambient = ambientColour * lightColour;

  //How much a fragment faces the light
  float diff = max(dot(vNormal, lightDirection), 0.0);
  vec3 diffuse = diff * diffuseColour * lightColour;

  //How much a fragment directly reflects the light to the camera
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  vec3 reflectDirection = reflect(-lightDirection, normalize(vNormal));  
  float spec = pow(max(dot(viewDirection, reflectDirection), 0.0), shininess);
  vec3 specular = spec * specularColour * lightColour;  

  vec3 result = ambientStrength * ambient + diffuseStrength * diffuse + specularStrength * specular;
  gl_FragColor = vec4(result, 1.0);
}`;

var light_geometry = new THREE.SphereGeometry( 1, 32, 32 );
var light_material = new THREE.MeshBasicMaterial({color: 0xffffff });
var light_mesh = new THREE.Mesh(light_geometry, light_material);
light_mesh.translateY(20.0);
scene.add(light_mesh);

//var geometry = new THREE.SphereGeometry( 5, 32, 32 );
//Define the material, specifying attributes, uniforms, shaders etc.
var material = new THREE.ShaderMaterial( {
  uniforms: {
    time: { value: 0.0 },
    ambientStrength: { value: 0.3 },
    diffuseStrength: { value: 1.0 },
    specularStrength: { value: 0.5 },
    shininess: { value: 16},
    lightColour: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    lightPosition: { value: light_mesh.position },
    ambientColour: { value: new THREE.Vector3(0.74725, 0.4995, 0.0745) },
    diffuseColour: { value: new THREE.Vector3(0.90164, 0.80648, 0.22648) },
    specularColour: { value: new THREE.Vector3(1.0, 0.8, 0.8) }
  },
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
} );

var phongMaterial = new THREE.MeshPhongMaterial({color: 0xff0000, specular: 0xffffff, shininess: 1.5});
var pointLight = new THREE.PointLight( 0xffffff, 1, 0 );
pointLight.position.set( light_mesh.position );
scene.add(pointLight);
//var mesh = new THREE.Mesh(geometry, material);
//scene.add(mesh);

var loader = new THREE.STLLoader();
//Load dancer
loader.load( "https://res.cloudinary.com/al-ro/raw/upload/v1531776249/ballerina_1_mu2pmx.stl", function (geometry) {
//https://stackoverflow.com/questions/16469270/transforming-vertex-normals-in-three-js
geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
geometry.computeFaceNormals();
geometry.computeVertexNormals();
  var mesh = new THREE.Mesh( geometry, material);
//mesh.matrixAutoUpdate  = false;
  mesh.scale.set( 10, 10, 10);
  mesh.position.set( 0, -40, 0 );

  //mesh.geometry.computeFaceNormals();
  helper = new THREE.VertexNormalsHelper( mesh, 2, 0x00ff00, 1 );
  //scene.add( helper );


  scene.add( mesh );

} );

console.log(light_mesh);
//----------DRAW----------//
var time = 0;
function draw(){
  stats.begin();
  time += 1/60;
  material.uniforms.time.value = time;
  light_mesh.position.x=(25*Math.cos(time));
  light_mesh.position.z=(25*Math.sin(time));
  //console.log(material.uniforms);
  material.uniforms.lightPosition.x  = light_mesh.position.x;
  material.uniforms.lightPosition.y  = light_mesh.position.y;
  material.uniforms.lightPosition.z  = light_mesh.position.z;
  pointLight.position.y = ( light_mesh.position.y);
  renderer.render(scene, camera);
  if(rotate){
    controls.update();
  }
  stats.end();
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
