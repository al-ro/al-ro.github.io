//Manual lighting, shadow and surface calculations using Three.js shader material
//Based on the tutorial series https://learnopengl.com/
//Normal map and edited texture from https://www.sharetextures.com/
//Skybox image taken from https://hdrihaven.com/

var canvas = document.getElementById("canvas_1");
var cont = document.getElementById("cc_1");

const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
    );

//Lighting variables
var ambient_strength = 0.3;
var diffuse_strength = 0.7;
var specular_strength = 0.5;
var shininess = 128;
var textured = true;
var normal_map = true;
var blinn = true;
var environment_map = false;
var reflection = true;
var refraction = false;
var rotate_light = true;
var shadow_camera = false;
var soft_shadows = true;
var time = 0;

var centre = new THREE.Vector3(0,0,0);

var ratio =  canvas.width / canvas.height;
var w = cont.offsetWidth;
var h = w/ratio;

//Initialise three.js
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w,h,false);
renderer.setClearColor( 0xaaaaaa, 1);
distance = 400;

var FOV = 2 * Math.atan( window.innerHeight / ( 2 * distance ) ) * 90 / Math.PI;

//Camera
var camera = new THREE.PerspectiveCamera(FOV, ratio, 0.1, 20000);
camera.position.set(0, 40, 100);
if(mobile){
  camera.position.set(0, 20, 40);
}
scene.add(camera);

//OrbitControls.js for camera manipulation
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0,20,0);
controls.maxDistance = 500;
controls.minDistance = 10;
controls.maxPolarAngle = Math.PI/2;
controls.update();

const stats = new Stats();
stats.showPanel(0);
stats.domElement.style.position = 'relative';
stats.domElement.style.bottom = '48px';
document.getElementById('cc_1').appendChild(stats.domElement);

//----------SHADOWS----------//

//https://learnopengl.com/Advanced-Lighting/Shadows/Shadow-Mapping
//Used to calculate shadows and optionally display the depth map
var shadowVertexSource = `
varying vec3 vPosition;
varying vec2 texCoord;
void main() {
  texCoord = uv;
  //Place the quad at the lower right corner of the screen
  gl_Position = vec4(position.x*0.25+0.75, position.y*0.25-0.75, 0.0, 1.0 );
}
`;

var shadowFragmentSource = `
uniform sampler2D map;
varying vec2 texCoord;

//Shadow camera extent
float near = 1.0; 
float far = 400.0; 

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

//----------LIGHTING----------//
var vertexSource = `
precision mediump float;

//The surface tangent calculated on the CPU using THREE.BufferGeometryUtils.computeTangents()
attribute vec4 tangent;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 lightSpaceVPosition;
varying vec2 textureCoord;
varying mat3 tbn;

void main() {
  //Position of vertex on the screen
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
  vNormal = normal;

  //https://learnopengl.com/Advanced-Lighting/Normal-Mapping
  //Create matrix to transform normal to tangent space i.e. transform static normal map data into the underlying triangle frame
  vec3 T = normalize(vec3(modelMatrix * tangent));
  //The triangle normal
  vec3 N = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
  //Re-orthogonalize T with respect to N (for small optional correction)
  T = normalize(T - dot(T, N) * N);
  //The bitangent vector is perpendicular to N and T
  vec3 B = normalize(cross(N, T));
  //Create matrix from three vectors
  tbn = mat3(T, B, N);

  //Position of vertex in the world
  vPosition = vec3(modelMatrix * vec4(position, 1.0));
  //Position of vertex from the point of view of the light (for shadow testing)
  lightSpaceVPosition = vec4(lightProjectionMatrix * lightViewMatrix * vec4(vPosition, 1.0));

  //UV for texture (passed by Three.js)
  textureCoord = uv;
}`;

var fragmentSource = `
precision mediump float;

//Calculated depth map from the point of view of the light
uniform sampler2D shadowMap;
//Light uniforms
uniform float ambientStrength;
uniform float diffuseStrength;
uniform float specularStrength;
uniform float shininess;
uniform vec3 lightColour;
uniform vec3 lightPosition;

//Surface uniforms
uniform vec3 ambientColour;
uniform vec3 diffuseColour;
uniform vec3 specularColour;

//Blinn-Phong switch
uniform bool blinn;
uniform bool useTexture;
uniform bool useNormalMap;
uniform bool environmentMapping;
uniform bool reflection;
uniform bool refraction;
//Blur shadow edges
uniform bool softShadows;
//Texture
uniform sampler2D diffuseMap;
//Normals
uniform sampler2D normalMap;
//Cubemap
uniform samplerCube environmentMap;
//Passed by vertex shader
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 lightSpaceVPosition;
varying vec2 textureCoord;
varying mat3 tbn;

//Shadow camera extent
float near = 1.0; 
float far = 400.0; 

//https://learnopengl.com/Advanced-OpenGL/Depth-testing
float LinearizeDepth(float depth) {
    float z = depth * 2.0 - 1.0; // back to NDC 
    return (2.0 * near * far) / (far + near - z * (far - near));	
}

float ShadowCalculation(vec4 fragPosLightSpace, vec3 lightDirection, vec3 normal){
    //Perform perspective divide
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    //Transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;
    //Get closest depth value from light's perspective (using [0,1] range lightSpaceVPosition as coordinates)
    float closestDepth = texture2D(shadowMap, projCoords.xy).r; 
    //Get depth of current fragment from light's perspective
    float currentDepth = projCoords.z;
    //Use bias to remove line artifacts
    float bias = max(0.01 * (1.0 - dot(normal, lightDirection)), 0.005);
    //Check whether current fragment is in shadow
    float shadow = currentDepth - bias > closestDepth  ? 1.0 : 0.0;  

    if(softShadows){
      //Soften shadow edges
      shadow = 0.0;
      //Shadow texture size is 2048x2048
      float texelSize = 1.0 / 2048.0;
      //Average the shadow depth using surrounding fragments
      for(int x = -2; x <= 2; x++){
	for(int y = -2; y <= 2; y++){
	  float pcfDepth = texture2D(shadowMap, projCoords.xy + vec2(x, y) * texelSize).r; 
	  //Check whether current fragment is in shadow
	  shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;        
	}    
      }
      //Blurring in a 5x5 square
      shadow /= 25.0;
    }
    //Cut off at the top to make everything outside the shadow camera's view be lit
    if(projCoords.z > 0.95){
      shadow = 0.0;
    }
    return shadow;
} 

void main() {

  //Texture value at fragment
  vec4 textureColour = texture2D(diffuseMap, textureCoord);
  vec3 normal;
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
  //Colour when not directly lit
  vec3 ambient;
  if(useTexture){
    ambient = textureColour.xyz;
  }else{
    ambient = ambientColour;
  }

  //How much a fragment faces the light
  float diff = max(dot(normal, lightDirection), 0.0);
  //Colour when lit by light
  vec3 diffuse;
  if(useTexture){
    diffuse = diff * textureColour.xyz * lightColour;
  }else{
    diffuse = diff * diffuseColour * lightColour;
  }

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

  //Colour of light sharply reflected into the camera
  vec3 specular;  
  if(useTexture){
    specular = spec * textureColour.rgb * lightColour;  
  }else{
    specular = spec * specularColour * lightColour;   
  }

  float shadow = ShadowCalculation(lightSpaceVPosition, lightDirection, normal);
  vec3 result =  ambientStrength * ambient + (1.0-shadow) * diffuseStrength * diffuse + (1.0-shadow) * specularStrength * specular;

  if(environmentMapping){
    //The reflected/refracted skybox vector 
    vec3 environmentVector;
    if(reflection){
      environmentVector = reflect(-viewDirection, normal);
    }
    if(refraction){
      environmentVector = refract(-viewDirection, normal, 1.0/1.2);
    }
    //Three.js flips cubemaps in the x-direction (see uniforms.flipEnvMap.value = material.envMap.isCubeTexture ? - 1 : 1; in WebGLRenderer.js).
    //Since we use a three.js skybox, flip the x-value of the reflection/refraction vector for consistency
    result = (textureCube(environmentMap, vec3(-environmentVector.x, environmentVector.yz))).xyz;
  }
  gl_FragColor = vec4(result, 1.0); 
}`;

//Visualise the directional light as a sphere
var light_geometry = new THREE.SphereGeometry( 1, 32, 32 );
var light_material = new THREE.MeshBasicMaterial({color: 0xffffff });
var light_mesh = new THREE.Mesh(light_geometry, light_material);
light_mesh.translateY(150.0);
scene.add(light_mesh);

//Get images for texture, normal map and skybox
var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
//Texture and normal map taken from https://texturehaven.com/
var texture =  loader.load( 'https://al-ro.github.io/images/pbr/diffuse.jpg' );
var normals =  loader.load( 'https://al-ro.github.io/images/pbr/normals.jpg' );

//Create Three.js skybox
var skyBoxLoader = new THREE.CubeTextureLoader();
skyBoxLoader.crossOrigin = '';
//Skybox image taken from https://hdrihaven.com/
skyBoxLoader.setPath('https://al-ro.github.io/images/pbr/');
var skyBox = skyBoxLoader.load( [
		'pos_x.jpg',
		'neg_x.jpg',
		'pos_y.jpg',
		'neg_y.jpg',
		'pos_z.jpg',
		'neg_z.jpg'
	] );
//scene.background = skyBox;

//Target where shadows are rendered
//https://github.com/mrdoob/three.js/blob/master/examples/webgl_depth_texture.html
var shadowTarget = new THREE.WebGLRenderTarget(2048, 2048);
shadowTarget.depthBuffer = true;
shadowTarget.depthTexture = new THREE.DepthTexture();

//Define the material, specifying attributes, uniforms, shaders etc.
var material = new THREE.ShaderMaterial( {
  uniforms: {
    blinn: {value: blinn},
    useTexture: {value: textured},
    useNormalMap: {value: normal_map},
    environmentMapping: {value: environment_map},
    reflection: {value: reflection},
    refraction: {value: refraction},
    ambientStrength: { value: ambient_strength },
    diffuseStrength: { value: diffuse_strength },
    specularStrength: { value: specular_strength },
    shininess: { value: shininess},
    lightColour: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    lightPosition: { value: light_mesh.position },
    ambientColour: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
    diffuseColour: { value: new THREE.Vector3(0.9, 0.9, 0.9) },
    specularColour: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    lightViewMatrix: {value: new THREE.Matrix4()},
    lightProjectionMatrix: {value: new THREE.Matrix4()},
    shadowMap: {value: shadowTarget.depthTexture},
    softShadows: {value: soft_shadows},
    diffuseMap: { value: texture},
    normalMap: { value: normals},
    environmentMap: {value: skyBox}
  },
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
} );

var floor_material = new THREE.ShaderMaterial( {
  uniforms: {
    blinn: {value: true},
    useTexture: {value: false},
    useNormalMap: {value: false},
    environmentMapping: {value: false},
    reflection: {value: false},
    refraction: {value: false},
    ambientStrength: { value: 0.3 },
    diffuseStrength: { value: 0.7 },
    specularStrength: { value: 0.0 },
    shininess: { value: 128},
    lightColour: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    lightPosition: { value: light_mesh.position },
    ambientColour: { value: new THREE.Vector3(0.66, 0.66, 0.66) },
    diffuseColour: { value: new THREE.Vector3(0.66, 0.66, 0.66) },
    specularColour: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    lightViewMatrix: {value: new THREE.Matrix4()},
    lightProjectionMatrix: {value: new THREE.Matrix4()},
    shadowMap: {value: shadowTarget.depthTexture},
    softShadows: {value: soft_shadows},
    diffuseMap: { value: texture},
    normalMap: { value: normals},
    environmentMap: {value: skyBox}
  },
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
} );

function addGeometry(geo, offset){
  geo.translate(offset.x, offset.y, offset.z);
  //Generate tangents for normal mapping
  THREE.BufferGeometryUtils.computeTangents(geo);
  var mesh = new THREE.Mesh(geo, material);
  scene.add(mesh);
}

//Add a sphere, torus knot and cube
addGeometry(new THREE.SphereBufferGeometry(15, 20, 20), new THREE.Vector3(-40,20,0));
addGeometry(new THREE.TorusKnotBufferGeometry(10, 3, 100, 16), new THREE.Vector3(0,20,0));
addGeometry(new THREE.BoxBufferGeometry(22, 22, 22), new THREE.Vector3(40,20,0));

var floor_geometry = new THREE.PlaneBufferGeometry(1000,1000,2,2);
floor_geometry.lookAt(new THREE.Vector3(0,1,0));

var floor = new THREE.Mesh(floor_geometry, floor_material);
scene.add(floor);

//Shadow camera and geometry
var shadowCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 400);
shadowCamera.position.x = light_mesh.position.x;
shadowCamera.position.y = light_mesh.position.y;
shadowCamera.position.z = light_mesh.position.z;
shadowCamera.lookAt(centre);

//Visualise shadow camera frustum 
var shadowCameraHelper = new THREE.CameraHelper(shadowCamera);

scene.add(shadowCamera);

var shadowMaterial = new THREE.ShaderMaterial( {
  vertexShader: shadowVertexSource, 
  fragmentShader: shadowFragmentSource,
  uniforms: {
    map: {value: shadowTarget.depthTexture}
  }
});

//Visuals for shadow depth image
var shadowPlane = new THREE.PlaneBufferGeometry(2, 2);
var shadowBuffer = new THREE.Mesh( shadowPlane, shadowMaterial);


//Dat.gui library controls
var gui = new dat.GUI({ autoPlace: false });
var customContainer = document.getElementById('gui_container');
customContainer.appendChild(gui.domElement);
gui.add(this, 'ambient_strength').min(0).max(1).step(0.05).onChange(function(value){material.uniforms.ambientStrength.value = value;});
gui.add(this, 'diffuse_strength').min(0).max(1).step(0.05).onChange(function(value){material.uniforms.diffuseStrength.value = value;});
gui.add(this, 'specular_strength').min(0).max(1).step(0.05).onChange(function(value){material.uniforms.specularStrength.value = value;});
gui.add(this, 'shininess').min(1).max(128).step(1).onChange(function(value){material.uniforms.shininess.value = value;});
gui.add(this, 'blinn').onChange(function(value){ material.uniforms.blinn.value = value;});
gui.add(this, 'textured').onChange(function(value){ material.uniforms.useTexture.value = value;});
gui.add(this, 'normal_map').onChange(function(value){ material.uniforms.useNormalMap.value = value;});
gui.add(this, 'environment_map').onChange(function(value){ material.uniforms.environmentMapping.value = value;});
gui.add(this, 'reflection').listen().onChange(function(value){reflection = true; refraction = false;  material.uniforms.reflection.value = true; material.uniforms.refraction.value = false;});
gui.add(this, 'refraction').listen().onChange(function(value){refraction = true; reflection = false;  material.uniforms.refraction.value = true; material.uniforms.reflection.value = false;});
gui.add(this, 'rotate_light');
gui.add(this, 'soft_shadows').onChange(function(value){material.uniforms.softShadows.value = value; floor_material.uniforms.softShadows.value = value;});
gui.add(this, 'shadow_camera');
gui.close();

function updateLight(mat){
  mat.uniforms.lightPosition.x  = light_mesh.position.x;
  mat.uniforms.lightPosition.y  = light_mesh.position.y;
  mat.uniforms.lightPosition.z  = light_mesh.position.z;
}

function updateShadow(mat){
  mat.uniforms.lightViewMatrix.value = shadowCamera.matrixWorldInverse;
  mat.uniforms.lightProjectionMatrix.value = shadowCamera.projectionMatrix;
}

//----------DRAW----------//
function draw(){

  stats.begin();
  if(rotate_light){
    time += 1/160;
    light_mesh.position.x=(205*Math.cos(time));
    light_mesh.position.z=(205*Math.sin(time));
  }
  
  updateLight(material);
  updateLight(floor_material);

  shadowCamera.position.x = light_mesh.position.x;
  shadowCamera.position.y = light_mesh.position.y;
  shadowCamera.position.z = light_mesh.position.z;
  shadowCamera.lookAt(centre);

  updateShadow(material);
  updateShadow(floor_material);

  controls.update();

  //Render depth values from light to shadow texture
  renderer.setRenderTarget(shadowTarget);
  renderer.render(scene, shadowCamera);

  //Render whole scene
  if(shadow_camera){
    scene.add(shadowBuffer);
    scene.add(shadowCameraHelper);
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  if(shadow_camera){
    scene.remove(shadowBuffer);
    scene.remove(shadowCameraHelper);
  }
  stats.end();
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
