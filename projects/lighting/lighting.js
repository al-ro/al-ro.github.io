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
var WIDTH = 0.25;
var HEIGHT = 0.25;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w,h,false);
renderer.setClearColor( 0x000000, 1);
distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 0.1, 20000);
camera.position.set(10, 40, 100);
if(mobile){
  camera.position.set(-40, 20, 40);
}
scene.add(camera);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0,25,0);
controls.autoRotate = rotate;
controls.autoRotateSpeed = 2.5;
controls.update();

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

//https://learnopengl.com/Lighting/Basic-Lighting
var shadowVertexSource = `
varying vec3 vPosition;
varying vec2 texCoord;
const float WIDTH = ` + WIDTH + `;
const float HEIGHT = ` + HEIGHT + `;
void main() {
  texCoord = uv;
  gl_Position = vec4(position.x*WIDTH+0.75, position.y*HEIGHT+0.75, 0.0, 1.0 );
}
`;

var shadowFragmentSource = `
uniform sampler2D map;
varying vec2 texCoord;

float near = 1.0; 
float far = 100.0; 
//https://learnopengl.com/Advanced-OpenGL/Depth-testing
float LinearizeDepth(float depth) {
    float z = depth * 2.0 - 1.0; // back to NDC 
    return (2.0 * near * far) / (far + near - z * (far - near));	
}

void main(){
  float depth = gl_FragCoord.z;
  depth = texture2D(map, texCoord).r;
  gl_FragColor = vec4(vec3(depth), 1.0);
}  
`;

var vertexSource = `
precision mediump float;
attribute vec4 tangent;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 lightSpaceVPosition;
varying vec2 textureCoord;
varying mat3 tbn;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
  vNormal = normal;

  //https://learnopengl.com/Advanced-Lighting/Normal-Mapping
  //Create matrix to transform normal to tangent space i.e. transform static normal map data into the underlying triangle frame
  //The tangent (calculated on the CPU using THREE.BufferGeometryUtils.computeTangents() )
  vec3 T = normalize(vec3(modelMatrix * tangent));
  //The triangle normal
  vec3 N = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
  //Re-orthogonalize T with respect to N
  T = normalize(T - dot(T, N) * N);
  //The bitangent vector is perpendicular to N and T
  vec3 B = normalize(cross(N, T));
  //Create matrix from three vectors
  tbn = mat3(T, B, N);

  vPosition = vec3(modelMatrix * vec4(position, 1.0));
  lightSpaceVPosition = vec4(lightProjectionMatrix * lightViewMatrix * vec4(vPosition, 1.0));
  //UV for texture
  textureCoord = uv;
}`;

var fragmentSource = `
precision mediump float;

uniform sampler2D shadowMap;
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
uniform bool blinn;
uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
uniform samplerCube environmentMap;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 lightSpaceVPosition;
varying vec2 textureCoord;
varying mat3 tbn;

float near = 1.0; 
float far = 100.0; 

//https://learnopengl.com/Advanced-OpenGL/Depth-testing
float LinearizeDepth(float depth) {
    float z = depth * 2.0 - 1.0; // back to NDC 
    return (2.0 * near * far) / (far + near - z * (far - near));	
}


float ShadowCalculation(vec4 fragPosLightSpace, vec3 lightDirection, vec3 normal){
    // perform perspective divide
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;
    // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture2D(shadowMap, projCoords.xy).r; 
    // get depth of current fragment from light's perspective
    float currentDepth = projCoords.z;
    // check whether current frag pos is in shadow
    float bias = 0.005;
    bias = max(0.05 * (1.0 - dot(normal, lightDirection)), 0.005);
    float shadow = currentDepth - bias > closestDepth  ? 1.0 : 0.0;  

    shadow = 0.0;
    float texelSize = 1.0 / 1024.0;
    for(int x = -2; x <= 2; x++){
      for(int y = -2; y <= 2; y++){
	float pcfDepth = texture2D(shadowMap, projCoords.xy + vec2(x, y) * texelSize).r; 
	shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;        
      }    
    }
    shadow /= 25.0;
    if(projCoords.z > 0.95){
      shadow = 0.0;
    }
    return shadow;
} 

void main() {

  vec4 textureColour = texture2D(diffuseMap, textureCoord);
  vec3 normal;
  bool useNormalMap = true;
  if(useNormalMap){
    //https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    //Transform RGB normal map data from [0, 1] to [-1, 1]
    vec3 normalColour = normalize(texture2D(normalMap, textureCoord).rgb*2.0-1.0);
    // Transform the normal vector in the RGB channels to tangent space
    normal = normalize(tbn * normalColour.rgb);
  }else{
    normal = normalize(vNormal);
  }

  vec3 lightDirection = normalize(lightPosition); 
  //Ambient colour is constant
  vec3 ambient = textureColour.xyz * lightColour;

  //How much a fragment faces the light
  float diff = max(dot(normal, lightDirection), 0.0);
  vec3 diffuse = diff * textureColour.xyz * lightColour;

  //How much a fragment directly reflects the light to the camera
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float spec;
  if(blinn){
    vec3 halfwayDir = normalize(lightDirection + viewDirection);  
    spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
  }else{
    vec3 reflectDirection = reflect(-lightDirection, normal);  
    spec = pow(max(dot(viewDirection, reflectDirection), 0.0), shininess);
  }
  vec3 specular = spec * specularColour * lightColour;  

  float shadow = ShadowCalculation(lightSpaceVPosition, lightDirection, normal);
  vec3 result =  ambientStrength * ambient + (1.0-shadow) * diffuseStrength * diffuse + (1.0-shadow) * specularStrength * specular;
  float depth = LinearizeDepth(gl_FragCoord.z) / far;
  gl_FragColor = vec4(vec3(depth), 1.0);
  gl_FragColor = vec4(result, 1.0);
  //The reflected skybox vector
  //vec3 reflectionVector = refract(-viewDirection, normal, 1.0/1.2);
  //vec3 reflectionVector = reflect(-viewDirection, normal);
  //Three.js flips cubemaps in the x-direction (see uniforms.flipEnvMap.value = material.envMap.isCubeTexture ? - 1 : 1; in WebGLRenderer.js).
  //Since we use a three.js skybox, flip the x-value of the reflection vector for consistency
  //gl_FragColor = textureCube(environmentMap, vec3(-reflectionVector.x, reflectionVector.yz));
}`;


var light_geometry = new THREE.SphereGeometry( 1, 32, 32 );
var light_material = new THREE.MeshBasicMaterial({color: 0xffffff });
var light_mesh = new THREE.Mesh(light_geometry, light_material);
light_mesh.translateY(200.0);
scene.add(light_mesh);

//Target where shadows are rendered
var shadowTarget = new THREE.WebGLRenderTarget(1024, 1024);
shadowTarget.depthBuffer = true;
shadowTarget.depthTexture = new THREE.DepthTexture();

var loader = new THREE.TextureLoader();
//allow cross origin loading
loader.crossOrigin = '';
var texture =  loader.load( 'https://al-ro.github.io/images/pbr/4k.jpg' );
var normals =  loader.load( 'https://al-ro.github.io/images/pbr/normals.png' );
var displacement =  loader.load( 'https://al-ro.github.io/images/pbr/bricks2_disp.jpg' );
var skyBoxLoader = new THREE.CubeTextureLoader();
skyBoxLoader.crossOrigin = '';
skyBoxLoader.setPath('https://al-ro.github.io/images/pbr/');
var skyBox = skyBoxLoader.load( [
		'0004.jpg',
		'0002.jpg',
		'0006.jpg',
		'0005.jpg',
		'0001.jpg',
		'0003.jpg'
	] );
scene.background = skyBox;


//var geometry = new THREE.SphereGeometry( 5, 32, 32 );
//Define the material, specifying attributes, uniforms, shaders etc.
var material = new THREE.ShaderMaterial( {
  uniforms: {
    blinn: {value: true},
    time: { value: 0.0 },
    ambientStrength: { value: 0.3 },
    diffuseStrength: { value: 0.7 },
    specularStrength: { value: 0.5 },
    shininess: { value: 128},
    lightColour: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    lightPosition: { value: light_mesh.position },
    ambientColour: { value: new THREE.Vector3(0.74725, 0.4995, 0.0745) },
    diffuseColour: { value: new THREE.Vector3(0.90164, 0.80648, 0.22648) },
    specularColour: { value: new THREE.Vector3(1.0, 0.8, 0.8) },
    lightViewMatrix: {value: new THREE.Matrix4()},
    lightProjectionMatrix: {value: new THREE.Matrix4()},
    shadowMap: {value: shadowTarget.depthTexture},
    diffuseMap: { value: texture},
    normalMap: { value: normals},
    displacementMap: { value: displacement},
    environmentMap: {value: skyBox}
  },
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
} );

console.log(THREE.LoaderUtils);
var gltfLoader = new THREE.GLTFLoader();
gltfLoader.crossOrigin = '';
gltfLoader.setPath('https://al-ro.github.io/images/pbr/');

function handle_load(gltf){

  console.log("handle_load");

}
//gltfLoader.load('scene.glb', handle_load, null, console.log("ERROR"));
var loader = new THREE.STLLoader();
loader.crossOrigin = '';
//Load dancer
loader.load("https://al-ro.github.io/geometry/goat_simplified", function (geometry) {
//https://stackoverflow.com/questions/16469270/transforming-vertex-normals-in-three-js
geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
geometry.computeFaceNormals();
geometry.computeVertexNormals();

//geometry = new THREE.BoxBufferGeometry(32, 32, 32);
//geometry.translate(-100,-100,0);
//Generate vertex indices
geometry = THREE.BufferGeometryUtils.mergeVertices(geometry);
//console.log(geometry);
THREE.BufferGeometryUtils.computeTangents(geometry);
//THREE.GeometryBufferUtils.computeTangents(geometry);
var mesh = new THREE.Mesh( geometry, material);
//mesh.matrixAutoUpdate  = false;
  //mesh.scale.set( 10, 10, 10);
  //mesh.position.set( 0, -4, 0 );

  //mesh.geometry.computeFaceNormals();
  helper = new THREE.VertexNormalsHelper( mesh, 2, 0x00ff00, 1 );
  //scene.add( helper );

  scene.add( mesh );

} );

var floor_geometry = new THREE.PlaneBufferGeometry(1000,1000,2,2);
floor_geometry.lookAt(new THREE.Vector3(0,1,0));
var floor = new THREE.Mesh(floor_geometry, material);
scene.add(floor);

//Shadow camera and geometry
//https://github.com/mrdoob/three.js/blob/master/examples/webgl_depth_texture.html

var shadowCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 400);
var shadowMaterial = new THREE.ShaderMaterial( {
  vertexShader: shadowVertexSource, 
  fragmentShader: shadowFragmentSource,
  uniforms: {
    map: {value: shadowTarget.depthTexture}
  }
});
var shadowPlane = new THREE.PlaneBufferGeometry(2, 2);
shadowPlane.translate(0,0,0);
var shadowBuffer = new THREE.Mesh( shadowPlane, shadowMaterial);
//scene.add(shadowBuffer);
scene.add(shadowCamera);
shadowCamera.position.x = light_mesh.position.x;
shadowCamera.position.y = light_mesh.position.y;
shadowCamera.position.z = light_mesh.position.z;
shadowCamera.lookAt(new THREE.Vector3(0,0,0));
var helper = new THREE.CameraHelper(shadowCamera);
//scene.add(helper);


//----------DRAW----------//
var time = 0;
function draw(){
  stats.begin();
  time += 1/160;
  material.uniforms.time.value = time;
  light_mesh.position.x=(205*Math.cos(time));
  light_mesh.position.z=(205*Math.sin(time));
  //console.log(material.uniforms);
  material.uniforms.lightPosition.x  = light_mesh.position.x;
  material.uniforms.lightPosition.y  = light_mesh.position.y;
  material.uniforms.lightPosition.z  = light_mesh.position.z;
  shadowCamera.position.x = light_mesh.position.x;
  shadowCamera.position.y = light_mesh.position.y;
  shadowCamera.position.z = light_mesh.position.z;
  shadowCamera.lookAt(new THREE.Vector3(0,0,0));
  material.uniforms.lightViewMatrix.value = shadowCamera.matrixWorldInverse;
  material.uniforms.lightProjectionMatrix.value = shadowCamera.projectionMatrix;

  controls.update();

  //Render depth values from light to shadow texture
  renderer.setRenderTarget(shadowTarget);
  renderer.render(scene, shadowCamera);

  //Render whole scene
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
