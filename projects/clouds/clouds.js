//Based on:
//http://nishitalab.org/user/nis/cdrom/sig93_nis.pdf
//"Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite", S. Hillaire
//https://www.shadertoy.com/view/wlBXWK
//https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/simulating-sky/simulating-colors-of-the-sky
//https://www.alanzucconi.com/2017/10/10/atmospheric-scattering-1/

  const mobile = ( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var canvas = document.getElementById("canvas_1");
var stats;

if(mobile){

  document.getElementById('fullscreen-button').style.display = 'none';
  var ctx=canvas.getContext("2d");
  ctx.font="50px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.fillText("This project is not available on mobile :(", canvas.width/2, canvas.height/2);

}else{

  // Initialize the GL context
  var gl = canvas.getContext('webgl');
  if(!gl){
    alert("Unable to initialize WebGL.");
  }
  
  //canvas.width *= 0.5;
  //canvas.height *= 0.5;

  //The size of the cube map side
  var cubeMapSize = 1024;
  //The size of a tile side
  var tileSize = 256;
  //Total number of tiles on a single cube map side
  var tileCount = cubeMapSize / tileSize;
  var totalTiles = tileCount * tileCount * 6;
  //Array for tile data
  var tilePixels = new Uint8Array(tileSize*tileSize*4);

  var tileRenderFlags = [];
  var tileDirections = [];
  //Hold tuple [order, value]
  var tileIndices = [];
  var tileCounter = 0;

  //https://www.khronos.org/opengl/wiki/Cubemap_Texture
  var viewDirections = [{x:  1, y:  0, z:  0},
			{x: -1, y:  0, z:  0},
			{x:  0, y:  1, z:  0},
			{x:  0, y: -1, z:  0},
			{x:  0, y:  0, z:  1},
			{x:  0, y:  0, z: -1}];

  var upDirections =   [{x:  0, y: -1, z:  0},
			{x:  0, y: -1, z:  0},
			{x:  0, y:  0, z:  1},
			{x:  0, y:  0, z:  -1},
			{x:  0, y: -1, z:  0},
			{x:  0, y: -1, z:  0}];
  
  var faceCounter = 0;
  var xCounter = 0;
  var yCounter = 0;

  var renderFlag = true;
  //var EARTH_RADIUS = 6377629.85;
  var EARTH_RADIUS = 155000.0;

  var iteration = 1;
  var ITERATION_LIMIT = 16.0;

  //Time
  var time = 0.0;
  var densityMultiplier = 0.1;
  var animate = false;
  var cube = true;
  var hd = true;
  var isMouseDown = false;
  //Distance of planet
  var coverage = 0.8;
  var viewHeight = 10.5;
  var power = 10.0;
  var mainSize = 0.02;
  var mainStrength = 0.8;
  var detailSize = 0.06;
  var detailStrength = 0.25;
  var tempVar = 1.0;
  var tempVar2 = 3.0;
  var exposure = 0.5;
  //Thickness of the atmosphere

  //Height over horizon in range [0, PI/2.0]
  var elevation = 0.5;
  //Rotation around Y axis in range [0, 2*PI]
  var azimuth = 1.633;
  //Left/right in range [0; 2*PI]
  var yaw = 0.0;//Math.PI/4.0; 
  //Up/down in range [-PI/2; PI/2]
  var pitch = 0.0;//-0.12;
  var cameraPosition = {x: 0, y: EARTH_RADIUS, z: 0};
  var upVector = {x: 0, y: 1, z: 0};
  var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.0};
  var mouseDelta = {x: 0, y: 0};
  var viewDirection = {x: Math.sin(yaw), y: Math.sin(pitch),  z: Math.cos(yaw)};
  var viewMatrix = [{x: 1, y: 0, z: 0}, 
		    {x: 0, y: 1, z: 0}, 
		    {x: 0, y: 0, z: 1}];
  var tileMatrix = [{x: 1, y: 0, z: 0, w: 0}, 
		    {x: 0, y: 1, z: 0, w: 0}, 
		    {x: 0, y: 0, z: 1, w: 0},
		    {x: 0, y: 0, z: 1, w: 1}];
  var isMouseDown = false;

  var framebuffer;

  stats = new Stats();
  stats.showPanel(0);
  stats.domElement.style.position = 'relative';
  stats.domElement.style.bottom = '48px';

  if(!mobile){
    document.getElementById('canvas_container').appendChild(stats.domElement);
  }

  function getViewMatrixAsArray(){
    var array = [];
    for(let i = 0; i < 3; i++){
      array.push(viewMatrix[i].x);
      array.push(viewMatrix[i].y);
      array.push(viewMatrix[i].z);
    }
    return array;
  }

  function getTileMatrixAsArray(){
    var array = [];
    for(let i = 0; i < 4; i++){
      array.push(viewMatrix[i].x);
      array.push(viewMatrix[i].y);
      array.push(viewMatrix[i].z);
      array.push(viewMatrix[i].w);
    }
    return array;
  }

  function normalize(v){
    var length = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    return {x: v.x/length, y: v.y/length, z: v.z/length};
  }

  function dot(a, b){
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function cross(a, b){
    return {x: a.y * b.z - a.z * b.y,
	    y: a.z * b.x - a.x * b.z,
	    z: a.x * b.y - a.y * b.x
    }; 
  }

  function negate(a){
    return {x: -a.x, y: -a.y, z: -a.z};
  }

  //https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
  function lookAt(camera, targetDir, up){
    var zaxis = normalize(targetDir);    
    var xaxis = normalize(cross(zaxis, up));
    var yaxis = cross(xaxis, zaxis);

    return [xaxis, yaxis, negate(zaxis)];
  }

  function compareTiles(a, b) {
    return b[1] - a[1];
  }
  //Set default tile ordering
  for(let i = 0; i < totalTiles; i++){
    let x = i % tileCount;
    let y = Math.floor(i/tileCount) % tileCount;
    let f = Math.floor(i / (tileCount * tileCount));
    let view = viewDirections[f];
    let up = upDirections[f];
    let right = normalize(cross(view, up));
    let halfDimensions = cubeMapSize * 0.5;
    let bottomLeft = {x: halfDimensions * view.x - halfDimensions * right.x, y: halfDimensions * view.y - halfDimensions * right.y, z: halfDimensions * view.z - halfDimensions * right.z};
    bottomLeft.x -= halfDimensions * up.x;
    bottomLeft.y -= halfDimensions * up.y;
    bottomLeft.z -= halfDimensions * up.z;

    bottomLeft.x += right.x * tileSize * 0.5;
    bottomLeft.y += right.y * tileSize * 0.5;
    bottomLeft.z += right.z * tileSize * 0.5;

    bottomLeft.x += up.x * tileSize * 0.5;
    bottomLeft.y += up.y * tileSize * 0.5;
    bottomLeft.z += up.z * tileSize * 0.5;

    bottomLeft.x += right.x * tileSize * y;
    bottomLeft.y += right.y * tileSize * y;
    bottomLeft.z += right.z * tileSize * y;

    bottomLeft.x += up.x * tileSize * x;
    bottomLeft.y += up.y * tileSize * x;
    bottomLeft.z += up.z * tileSize * x;

    bottomLeft = normalize(bottomLeft);
    tileDirections.push(bottomLeft);

    tileIndices.push([i, i]);
  }

  for(let i = 0; i < totalTiles; i++){
    tileIndices[i][1] =  dot(normalize(viewDirection), tileDirections[i]);
  }
  tileIndices.sort(compareTiles);

  function updateClouds(){
    renderFlag = true;
    tileCounter = 0;
    faceCounter = 0;
    xCounter = 0;
    yCounter = 0;
    iteration = 1.0;
  }

  function updateSunPosition(){
    gl.useProgram(program);
    gl.uniform3f(sunPositionHandle, Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));
    updateClouds();
  }

  //****************** GUI *********************
  var gui = new dat.GUI({ autoPlace: false });
  var customContainer = document.getElementById('gui_container');
  if(!mobile){
    customContainer.appendChild(gui.domElement);
  }
  gui.add(this, 'elevation').min(-0.1).max(Math.PI/2.0).step(0.01).listen().onChange(function(value){updateSunPosition(); updateClouds();});
  gui.add(this, 'azimuth').min(0.0).max(Math.PI*2.0).step(0.01).listen().onChange(function(value){updateSunPosition(); updateClouds();});
  gui.add(this, 'viewHeight').min(10.0).max(10000).step(10.0).listen().onChange(function(value){gl.useProgram(program); gl.uniform1f(viewHeightHandle, viewHeight); updateClouds();});
  gui.add(this, 'coverage').min(0.0).max(1.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(coverageHandle, coverage); updateClouds();});
  gui.add(this, 'power').min(0.0).max(50.0).step(0.1).onChange(function(value){gl.useProgram(program); gl.uniform1f(powerHandle, power); updateClouds();});
  gui.add(this, 'densityMultiplier').min(0.0).max(1.0).step(0.001).onChange(function(value){gl.useProgram(program); gl.uniform1f(densityMultiplierHandle, densityMultiplier); updateClouds();});
  gui.add(this, 'mainSize').min(0.0).max(0.1).step(0.000001).onChange(function(value){gl.useProgram(program); gl.uniform1f(mainSizeHandle, mainSize); updateClouds();});
  gui.add(this, 'mainStrength').min(0.0).max(1.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(mainStrengthHandle, mainStrength); updateClouds();});
  gui.add(this, 'detailSize').min(0.0).max(0.1).step(0.000001).onChange(function(value){gl.useProgram(program); gl.uniform1f(detailSizeHandle, detailSize); updateClouds();});
  gui.add(this, 'detailStrength').min(0.0).max(1.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(detailStrengthHandle, detailStrength); updateClouds();});
  gui.add(this, 'tempVar').min(0.0).max(10.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(tempVarHandle, tempVar); updateClouds();});
  gui.add(this, 'tempVar2').min(0.0).max(20.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(tempVar2Handle, tempVar2); updateClouds();});
  gui.add(this, 'exposure').min(0.0).max(1.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(exposureHandle, exposure); updateClouds();});
  gui.add(this, 'animate');
  gui.add(this, 'hd').listen().onChange(function(value){gl.useProgram(program); gl.uniform1i(hdHandle, hd); updateClouds();});
  gui.add(this, 'cube').onChange(function(value){
    gl.useProgram(program);
    gl.uniform1f(widthHandle, tileWidth);
    gl.uniform1f(heightHandle, tileWidth);
    gl.useProgram(cube_program);
    gl.uniform1f(widthHandle_, canvas.width);
    gl.uniform1f(heightHandle_, canvas.height); updateClouds();
});

  gui.close();

  //************** Shader sources **************

  var vertexSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  var fragmentSource = `
    precision highp float;
    uniform float viewHeight;
    uniform float coverage;
    uniform float width;
    uniform float height;
    uniform float totalWidth;
    uniform float totalHeight;
    uniform vec2 tileOffset;
    uniform vec2 mouse;
    uniform float time;
    uniform float power;
    uniform float densityMultiplier;
    uniform float mainSize;
    uniform float detailSize;
    uniform float tempVar;
    uniform float tempVar2;
    uniform float detailStrength;
    uniform float mainStrength;
    uniform float exposure;
    uniform sampler2D cloudShapeTexture;
    uniform sampler2D cloudDetailTexture;
    uniform sampler2D weatherMapTexture;
    uniform sampler2D curlNoiseTexture;
    uniform sampler2D blueNoiseTexture;
    uniform bool HD;

    uniform vec3 cameraPosition;
    uniform vec3 sunPosition;
    uniform mat3 viewMatrix;

    uniform float iteration;

    uniform samplerCube skyBox;

    const int STEPS_PRIMARY = 40;   
    const int STEPS_LIGHT = 6;
    const int HD_STEPS = 380;
    const int HD_STEPS_LIGHT = 6;

  const float PI = 3.141592;

  const float iterationLimit = float(` + ITERATION_LIMIT + `);

  // Cloud parameters
  const float PLANET_RADIUS = float(`+EARTH_RADIUS+`);
  // From Babic thesis, probably same as HZD
  const float CLOUD_START = 1500.0;
  const float CLOUD_HEIGHT = 6000.0;
  const float cloudStart = 1500.0;
  const float cloudHeight = 6000.0;
  const float cloudEnd = cloudStart+cloudHeight;

  //https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
  mat3 lookAt(vec3 camera, vec3 targetDir, vec3 up){
    vec3 zaxis = normalize(targetDir);    
    vec3 xaxis = normalize(cross(zaxis, up));
    vec3 yaxis = cross(xaxis, zaxis);

    return mat3(xaxis, yaxis, -zaxis);
  }

  vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 resolution = vec2(totalWidth, totalHeight);
    vec2 xy = tileOffset+fragCoord - resolution.xy / 2.0;
    float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
  }

  float remap(float x, float low1, float high1, float low2, float high2){
    return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
  }
  
  float saturate(float x){
    return clamp(x, 0.0, 1.0);
  }

  // Noise generation functions (by iq)
  float hash( float n )
  {
    return fract(sin(n)*43758.5453);
  }

  float hash( vec2 p ) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
  }

  float getCloudShape(vec3 pos){
    //The cloud shape texture is a 2048*2048 atlas of 12*12 tiles (144). Each tile is 128*128 with a 1 pixel wide boundary
    //Per tile:		128 + 2 = 130
    //Atlas width:	12 * 130 = 1560
    //The rest of the texture is black
    //The 3D texture the atlas represents has dimensions 128 * 128 * 144
    //The green channel is the data of the red channel shifted by one tile (tex.g is the data one level above tex.r). 
    //To get the necessary data only requires a single texture fetch
    const float textureWidth = 2048.0;
    const float dataWidth = 1560.0;
    const float tileRows = 12.0;
    const vec3 atlasDimensions = vec3(128.0, 128.0, 144.0);

    //Change from Y being height to Z being height
    vec3 p = vec3(pos.x, pos.z, pos.y);

    //Pixel coordinates of point in the 3D data
    vec3 coord = vec3(mod(p, atlasDimensions));
    float f = fract(coord.z);  
    float level = floor(coord.z);
    float tileY = floor(level/tileRows); 
    float tileX = level - tileY * tileRows; 
    //The data coordinates are offset by the x and y tile, the two boundary cells between each tile pair and the initial boundary cell on the first row/column
    vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
    vec2 pixel = coord.xy + offset;
    vec2 data = texture2D(cloudShapeTexture, mod(pixel, dataWidth)/textureWidth).xy;
    return mix(data.x, data.y, f);
  }

  float getCloudDetail(vec3 pos){
    //The cloud shape texture is a 256*256 atlas of 6*6 tiles (36). Each tile is 32*32 with a 1 pixel wide boundary
    //Per tile:		32 + 2 = 34
    //Atlas width:	6 * 34 = 204
    //The rest of the texture is black
    //The 3D texture the atlas represents has dimensions 32 * 32 * 36
    //The green channel is the data of the red channel shifted by one tile (tex.g is the data one level above tex.r). 
    //To get the necessary data only requires a single texture fetch
    const float textureWidth = 256.0;
    const float dataWidth = 204.0;
    const float tileRows = 6.0;
    const vec3 atlasDimensions = vec3(32.0, 32.0, 36.0);

    //Change from Y being height to Z being height
    vec3 p = vec3(pos.x, pos.z, pos.y);

    //Pixel coordinates of point in the 3D data
    vec3 coord = vec3(mod(p, atlasDimensions));
    float f = fract(coord.z);  
    float level = floor(coord.z);
    float tileY = floor(level/tileRows); 
    float tileX = level - tileY * tileRows; 
    //The data coordinates are offset by the x and y tile, the two boundary cells between each tile pair and the initial boundary cell on the first row/column
    vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
    vec2 pixel = coord.xy + offset;
    vec2 data = texture2D(cloudDetailTexture, mod(pixel, dataWidth)/textureWidth).xy;
    return mix(data.x, data.y, f);
  }

    //Return the near and far intersections of an infinite ray and a sphere. 
    //Assumes sphere at origin. No intersection if result.x > result.y
    vec2 sphereIntersections(vec3 start, vec3 dir, float radius){
      float a = dot(dir, dir);
      float b = 2.0 * dot(dir, start);
      float c = dot(start, start) - (radius * radius);
      float d = (b*b) - 4.0*a*c;
      if (d < 0.0){
	return vec2(1e5, -1e5);
      }
      return vec2((-b - sqrt(d))/(2.0*a), (-b + sqrt(d))/(2.0*a));
    }

  float getWeatherMap(vec2 p){
    return 1.0;
    return texture2D(weatherMapTexture, abs(p)).x;
  }

  float getBlueNoise(vec2 p){
    return (2.0*texture2D(blueNoiseTexture, p+fract(time)).x)-1.0;
  }
float getNoise(vec3 pos, float speed){
    return 0.5+0.5*(getCloudShape(pos));
}

//Read cloud map.
float getCloudMap(vec3 p){
    //p.y *= 0.5;
    return 1.0*getNoise(0.001*p, 0.0)*getNoise(0.0005*p, 0.0);
}


float clouds(vec3 p, out float cloudHeight, bool sampleDetail){

    cloudHeight = saturate((p.y - cloudStart)/(cloudEnd-cloudStart));

    float clouds = getCloudMap(p);
    if(clouds <= 1e-4){return 0.0;}

    //Round top and bottom edges
    clouds *= saturate(remap(cloudHeight, 0.95, 1.0, 1.0, 0.0)) 
            * saturate(remap(cloudHeight, 0.0, 0.1, 0.0, 1.0));
    //Subtract coarse noise
    return mainStrength * getNoise(mainSize*p, 0.0)*densityMultiplier;
    clouds = saturate(remap(clouds, mainStrength*getNoise(mainSize*p, 0.0), 1.0, 0.0, 1.0));
    if(sampleDetail){
        //Subtract fine noise
        clouds = saturate(remap(clouds, detailStrength*getNoise(detailSize*p, 0.0), 1.0, 0.0, 1.0));
    }
    return clouds * densityMultiplier;
}


float HenyeyGreenstein(float g, float costh){
    return (1.0/(4.0 * 3.1415))  * ((1.0 - g * g) / pow(1.0 + g*g - 2.0*g*costh, 1.5));
}

//https://twitter.com/FewesW/status/1364629939568451587/photo/1
float multipleOctaves(float extinction, float mu, float stepL){

    float luminance = 0.0;
    const float octaves = 4.0;
    
    //Attenuation
    float a = 1.0;
    //Contribution
    float b = 1.0;
    //Phase attenuation
    float c = 1.0;
    
    float phase;
    
    for(float i = 0.0; i < octaves; i++){
        //Two-lobed HG
        phase = mix(HenyeyGreenstein(-0.1*c, mu), HenyeyGreenstein(0.3*c, mu), 0.7);
        luminance += b * phase * exp(-stepL * extinction * a);
        //Lower is brighter
        a *= 0.18;
        //Higher is brighter
        b *= 0.5;
        c *= 0.5;
    }
    return luminance;
}

//Get the amount of light that reaches a sample point.
float lightRay(vec3 org, vec3 p, float phaseFunction, float mu, vec3 sunDirection, float offset){

    float lightRayDistance = 1000.0;
    float distToStart = 0.0;

    float exit = -1.0;
    float reenter = -1.0;
    float totalDistance = 0.0;
    bool reentry = false;

    bool recordDepth = true;
    //getCloudIntersection(p, vec3(0,1,0), distToStart, lightRayDistance);
    bool renderClouds = true;//getCloudLayerIntersection(org, sunDirection, distToStart, exit, reenter, totalDistance, reentry);

    float stepL = min(1000.0, lightRayDistance/float(STEPS_LIGHT));

    //if(isinf(stepL)){
      //  stepL = 1000.0;
    //}

    float lightRayDensity = 0.0;

    float cloudHeight = 0.0;
    
    float occlusion = 0.0;

    //Collect total density along light ray.
    for(int j = 0; j < STEPS_LIGHT; j++){

        bool sampleDetail = true;

        //Reduce density of clouds when looking towards the sun for more luminous clouds.
        lightRayDensity += clouds(p + sunDirection * float(j) * stepL, cloudHeight, sampleDetail);
        occlusion += 0.5*clouds(p + vec3(0,1,0) * float(j) * stepL, cloudHeight, sampleDetail);
    }

    float beersLaw = max(0.0, multipleOctaves(occlusion + lightRayDensity , mu, stepL));
    //Return product of Beer's law and powder effect depending on the 
    //view direction angle with the light direction.
    return mix(beersLaw * 2.0 * (1.0-(exp(-stepL*lightRayDensity*2.0))), beersLaw, mu);
}

//Get the colour along the main view ray.
vec3 mainRay(vec3 org, vec3 dir, vec3 sunDirection, 
         out float totalTransmittance, float mu, vec3 sunLightColour, float offset,
         inout float d){

    //Variable to track transmittance along view ray. 
    //Assume clear sky and attenuate light when encountering clouds.
    totalTransmittance = 1.0;

    //Default to black.
    vec3 colour = vec3(0.0);

    //The distance at which to start ray marching.
    float distToStart = 0.0;

    //The length of the intersection.
    float totalDistance = 0.0;
    //View ray path through cloud layer.
    float exit = -1.0;
    float reenter = -1.0;
    bool reentry = false;

    bool recordDepth = true;

    //Determine if ray intersects bounding volume.
    //Set ray parameters in the cloud layer.
    //bool renderClouds = getCloudIntersection(org, dir, distToStart, totalDistance);
    bool renderClouds = true;//getCloudLayerIntersection(org, dir, distToStart, exit, reenter, totalDistance, reentry);

    if(!renderClouds){
        return colour;
    }

    //Sampling step size.
    float stepS = 750.0;//totalDistance / float(STEPS_PRIMARY); 

    //Offset the starting point by blue noise.
    distToStart += stepS * offset;

    //Track distance to sample point.
    float dist = distToStart;

    //Initialise sampling point.
    vec3 p = org + dist * dir;

    //Combine backward and forward scattering to have details in all directions.
    float phaseFunction = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.3, mu), 0.7);

    vec3 sunLight = sunLightColour * power;

    for(int i = 0; i < STEPS_PRIMARY; i++){
    
        if(i > 32){
            stepS = 2000.0;
        }
        
        if(i > 63){
            stepS = 4000.0;
        }

        //Normalised height for shaping and ambient lighting weighting.
        float cloudHeight;

        //Get density and cloud height at sample point
        float density = clouds(p, cloudHeight, true);

        //Scattering and absorption coefficients.
        float sigmaS = 1.0;
        float sigmaA = 0.0;

        //Extinction coefficient.
        float sigmaE = sigmaS + sigmaA;

        float sampleSigmaS = sigmaS * density;
        float sampleSigmaE = sigmaE * density;

        //If there is a cloud at the sample point.
        if(density > 0.0 ){

            d = min(dist, d);
            //Constant lighting factor based on the height of the sample point.
            vec3 ambient = sunLightColour * mix((0.4), (1.0), cloudHeight);

            //Amount of sunlight that reaches the sample point through the cloud 
            //is the combination of ambient light and attenuated direct light.
            vec3 luminance = 0.2*ambient + 
                sunLight * phaseFunction * lightRay(org, p, phaseFunction, mu, sunDirection,
                                                   offset);

            //Scale light contribution by density of the cloud.
            luminance *= sampleSigmaS;

            //Beer-Lambert.
            float transmittance = exp(-sampleSigmaE * stepS);

            //Better energy conserving integration
            //"From Physically based sky, atmosphere and cloud rendering in Frostbite" 5.6
            //by Sebastian Hillaire.
            colour += 
                totalTransmittance * (luminance - luminance * transmittance) / sampleSigmaE; 

            //Attenuate the amount of light that reaches the camera.
            totalTransmittance *= transmittance;  

            //If ray combined transmittance is close to 0, nothing beyond this sample 
            //point is visible, so break early.
            if(totalTransmittance <= 0.001 ){
                totalTransmittance = 0.0;
                break;
            }
        }

        dist += stepS;

        //Step along ray.
        p = org + dir * dist;
    }

    return colour;
}
  //Find the distance to the closest cloud layer intersection, the total distance in the layer and, if applicable, the distances at which the ray exits and re-enters the cloud layer.
  //Return true if there is an intersection, false otherwise.
  bool getCloudLayerIntersection(vec3 org, vec3 dir, out float distToStart, out float exit, out float reenter, out float totalDistance, out bool reentry){
    const float ATM_START = PLANET_RADIUS+CLOUD_START;
    const float ATM_END = ATM_START+CLOUD_HEIGHT;
    float cameraHeight = length(org);

    vec2 rayPlanetIntersect = sphereIntersections(org, dir, PLANET_RADIUS);
    vec2 rayStartIntersect = sphereIntersections(org, dir, ATM_START);
    vec2 rayEndIntersect = sphereIntersections(org, dir, ATM_END);
    
    bool hitsPlanet = (rayPlanetIntersect.x <= rayPlanetIntersect.y) && rayPlanetIntersect.x > 0.0;
    bool hitsStart = (rayStartIntersect.x <= rayStartIntersect.y) && rayStartIntersect.x > 0.0;
    bool hitsEnd = (rayEndIntersect.x <= rayEndIntersect.y) && rayEndIntersect.x > 0.0; 
  
    if(cameraHeight < ATM_START){
      //Camera is below cloud layer
      //0 or 2 intersections
      //Hits planet when under the cloud layer -> no clouds rendered
      if(hitsPlanet){
	return false;
      }
      //Ray points through the cloud layer
      distToStart = rayStartIntersect.y;
      totalDistance = rayEndIntersect.y - distToStart;
      reentry = false;
      return true;

    }else if(cameraHeight >= ATM_START && cameraHeight <= ATM_END){
      //Camera is inside cloud layer
      //1, 2, or 3 intersections

      //Start sampling at camera position
      distToStart = 0.0;
      if(hitsPlanet){
	//Ray points to the ground. Single intersection with lower limit
	totalDistance = rayStartIntersect.x;
	reentry = false;
	return true;
      }
      if(!hitsStart || (abs(rayStartIntersect.x - rayStartIntersect.y) < 1.0e-4)){
	//Ray points straight to space. Single intersection with upper limit and possible grazing point with lower limit.
	totalDistance = rayEndIntersect.y;
	reentry = false;
	return true;
      }

      if(hitsStart && (abs(rayStartIntersect.x - rayStartIntersect.y) > 1.0e-4) ){
	//Ray points into space but through the cloud layer. Ray exits and reenters the layer. Three intersection points.
	//Find total distance in layer and exit limits accordingly.
	exit = rayStartIntersect.x;
	reenter = rayStartIntersect.y;
	totalDistance = rayStartIntersect.y - (reenter - exit);
	reentry = true;	
	return true;
      }

    }else{
      //Camera is above cloud layer
      //0, 1, 2, 3 or 4 intersections
      //Doesn't hit layer outer limit or hits it once -> no clouds rendered
      if(!hitsEnd || (abs(rayEndIntersect.x - rayEndIntersect.y) < 1.0e-4)){
	return false;
      }
      if(hitsPlanet){
	//Ray points through the cloud layer at the ground. Two intersection points.
	distToStart = rayEndIntersect.x;
	totalDistance = rayStartIntersect.x - distToStart;
	reentry = false;
	return true;
      }

      if(!hitsStart || (abs(rayStartIntersect.x - rayStartIntersect.y) < 1.0e-4)){
	//Ray intersects upper limit, travels through the cloud layer and exists at the upper limit without exiting at the lower limit.
	//Two intersection points with a possible grazing point.
	distToStart = rayEndIntersect.x;
	totalDistance = rayEndIntersect.y - distToStart;
	reentry = false;
	return true;
      }

      if(hitsStart && (abs(rayStartIntersect.x - rayStartIntersect.y) > 1.0e-4) ){
	//Ray points into space but through the cloud layer. Ray exits and reenters the lower limit. Four intersection points;
	//Find total distance in layer and exit limits accordingly.
	distToStart = rayEndIntersect.x;
	exit = rayStartIntersect.x;
	reenter = rayStartIntersect.y;
	totalDistance = (rayStartIntersect.y - reenter) + (exit - distToStart);
	reentry = true;	
	return true;
      }
    }
    //Default to no clouds.
    return false; 
  }

  vec3 skyRay(vec3 org, vec3 dir, vec3 sunDirection, out float totalTransmittance, out float depth){

    //Variable to track transmittance along view ray. Assume clear sky and attenuate light when encountering clouds.
    totalTransmittance = 1.0;

    //View ray path through cloud layer.
    float distToStart = 0.0;
    float exit = -1.0;
    float reenter = -1.0;
    float totalDistance = 0.0;
    bool reentry = false;

    bool recordDepth = true;

    //Default to black
    vec3 color = vec3(0.0);

    //Set ray parameters in the cloud layer.
    bool renderClouds = getCloudLayerIntersection(org, dir, distToStart, exit, reenter, totalDistance, reentry);
    if(distToStart > tempVar){
      //return vec3(1);
    }

    if(!renderClouds){
      return color;
    }

    //Sampling step size.
    float stepS = totalDistance / float(STEPS_PRIMARY); 
    if(HD){
      stepS = totalDistance / float(HD_STEPS); 
    }

    float cameraHeight = length(org);
    //When inside the cloud layer, the banding artifacts become severe when looking parallel to the layer. Change to static step size.
    //Drastically reduces view distance of clouds. This should be revisited at a later date.
    if((cameraHeight > PLANET_RADIUS + CLOUD_START) && (cameraHeight < PLANET_RADIUS + CLOUD_START + CLOUD_HEIGHT)){
      stepS = 64.0;
    }

    //Initialise sampling point.
    vec3 p = org + distToStart  * dir;    

    //Alignment of view and light directions.
    float mu = 0.5 + 0.5 * dot(sunDirection, dir);
    float phaseFunction = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.3, mu), 0.7);

    float dist = distToStart;

    for(int i=0; i < HD_STEPS; i++){
      if(!HD){
	if(i == STEPS_PRIMARY){break;}
      }

      float cloudHeight;

      //Get density and cloud height at sample point
      float density = clouds(p, cloudHeight, true);

      float sigmaS = 1.0;
      float sigmaA = 0.0;

      float sigmaE = sigmaS + sigmaA;

      float sampleSigmaS = sigmaS * density;
      float sampleSigmaE = sigmaE * density;

      //If there is a cloud at the sample point
      if(density > 0.0 ){
 
	vec3 sunLight = vec3(1) * power;

	//Lighten dark shadows at the bottom of clouds
	//Tinted reflection protype
	//vec3 ambient = mix(vec3(2.0), 1.7*vec3(0.6, 0.76, 0.95), 1.0-cloudHeight);

	//cloudHeight should be fraction of map data, not of cloud layer
	float ambient = mix((1.0), (1.2), cloudHeight);

	//Amount of sunlight that reaches the sample point through the cloud
	vec3 luminance = ambient + sunLight * phaseFunction * lightRay(org, p, phaseFunction, mu, sunDirection, 0.0);

	//Scale light contribution by density of the cloud
	luminance *= sampleSigmaS;

	float transmittance = exp(-sampleSigmaE * stepS);

	//Better energy conserving integration
	//"From Physically based sky, atmosphere and cloud rendering in Frostbite" 5.6
	//by Sebastian Hillaire
	color += totalTransmittance * (luminance - luminance * transmittance) / sampleSigmaE; 

	//Attenuate the amount of light that reaches the camera.
	totalTransmittance *= transmittance;  

	if(recordDepth){
	  if(totalTransmittance < 0.7){
	    recordDepth = false;
	    depth = dist;
	  }
	}

	//If ray combined transmittance is close to 0, nothing beyond this sample 
	//point is visible, so break early.
	if(totalTransmittance <= 0.001){
	  totalTransmittance = 0.0;
	  break;
	}
      }

      dist += stepS;
      //dist += stepS+stepS*0.5*getBlueNoise(gl_FragCoord.xy/1024.0);
      if(reentry){
	//Skip over section of ray outside the cloud layer and set sampling point at the reentry.
	if((dist > exit) && (dist < reenter)){
	  dist = reenter;
	}
      }

      //Step along ray.
      p = org+dir*dist;
    }

    return color;
  }

  float getGlow(float dist, float radius, float intensity){
    dist = max(dist, 1e-6);
    return pow(radius/dist, intensity);	
  }

  void main(){
    vec2 resolution = vec2(width, height);
    //Get the default direction of the ray (along the negative z direction)
    vec3 rayDir = rayDirection(90.0, gl_FragCoord.xy);

    vec3 cameraPos = cameraPosition;
    cameraPos.y += viewHeight;

    vec3 sunDirection = normalize(sunPosition);
    //normalize(vec3(sin(sun), 0.6, -cos(sun)));

    //Transform the ray to point in the correct direction
    rayDir = normalize(viewMatrix * rayDir);
    vec3 color = vec3(0.0);

    float depth = 1.0;
    float totalTransmittance;
    color = exposure * skyRay(cameraPos, rayDir, sunDirection, totalTransmittance, depth); 
    vec3 background = mix(vec3(1.0), vec3(0.0, 0.0, 1.0), 0.5+0.5*rayDir.y);
    float weight = smoothstep(-0.2, 0.1, rayDir.y);
    background =  mix(vec3(0.75, 0.87, 0.93), vec3(0.12, 0.29, 0.55), weight);

    float mu = dot(sunDirection, rayDir);
    //Draw sun
    //background += totalTransmittance * vec3(1e4*smoothstep(0.9998, 1.0, mu));
    background += totalTransmittance * getGlow(1.0-mu, 0.00005, 0.6);
    
    vec2 rayPlanetIntersect = sphereIntersections(cameraPos, rayDir, PLANET_RADIUS);
    
    bool hitsPlanet = (rayPlanetIntersect.x <= rayPlanetIntersect.y) && rayPlanetIntersect.x > 0.0;
    if(!hitsPlanet){
      color += background * totalTransmittance;
    }

    float depthMultiplier = 5e-6;
    //color = mix(color, background, saturate(1.0-exp(-depth*depthMultiplier)));
  
    //color = mix(color, vec3(0,0,1), depth);//clamp(depth, 0.0, 1.0));

    vec3 col;// = 1.0-exp(-color);
    col = pow(color, vec3(0.4545));

    vec4 oldCol = textureCube(skyBox, rayDir).rgba;
      //gl_FragColor = vec4(col, totalTransmittance);
    if(iteration > 1.0){
	  gl_FragColor = mix(vec4(col, totalTransmittance), oldCol, 0.5 + mix(0.0, 0.45, iteration/iterationLimit)); 
    }else{
      gl_FragColor = vec4(col, totalTransmittance);
    }

/*
  if(tempVar > 0.9){
    gl_FragColor = vec4(1,0,0,1);
  }else{
    gl_FragColor = vec4(0,0,0,1);
  }
*/
  }
  `;
  
//****************** Combine shaders ******************

var cubeVertexSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

var cubeFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D srcData;
uniform float width;
uniform float height;
uniform mat3 viewMatrix;

uniform samplerCube skyBox;

vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
  vec2 resolution = vec2(width, height);
  vec2 xy = fragCoord - resolution.xy / 2.0;
  float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
  return normalize(vec3(xy, -z));
}

void main() {
  vec2 resolution = vec2(width, height);
  vec3 rayDir = rayDirection(45.0, gl_FragCoord.xy);
  rayDir = normalize(viewMatrix * rayDir);
  vec3 col = textureCube(skyBox, rayDir).rgb;
  gl_FragColor = vec4(col, 1.0);
}
`;

  //************** Utility functions **************

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize(){
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if(!isInFullscreen()){
      h = w / 1.6;
    }else{
      //Reduce resolution at full screen for better performance
      w *= 1.0;
      h *= 1.0;
    }
    canvas.width = w;
    canvas.height = h;

    gl.viewport(0, 0, tileSize, tileSize);
    
    gl.useProgram(program);
    gl.uniform1f(widthHandle, tileSize);
    gl.uniform1f(heightHandle, tileSize);
    gl.useProgram(cube_program);
    gl.uniform1f(widthHandle_, canvas.width);
    gl.uniform1f(heightHandle_, canvas.height);
    gl.deleteFramebuffer(framebuffer);
    frameBuffer = gl.createFramebuffer();
    frameBuffer.width = tileSize;
    frameBuffer.height = tileSize;
    gl.activeTexture(gl.TEXTURE6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    //Assign texture as framebuffer colour attachment
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTexture, 0);
  }

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.


function createCubeMap(texture){
  for(let i = 0; i < 6; i++){
    const target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = cubeMapSize;
    const height = cubeMapSize;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 0, 0, 255]);  // opaque red
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);
  }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function createTileTexture(texture){
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tileSize, tileSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

var imagesLoaded = [false, false, false, false];
function loadTexture(gl, texture, url, ready) {
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const internalFormat = gl.RGBA;
  const width_ = 1;
  const height_ = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([255, 0, 0, 255]);  // opaque red
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width_, height_, border, srcFormat, srcType, pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    imagesLoaded[ready] = true;
  };
  image.crossOrigin = "";
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

gl.activeTexture(gl.TEXTURE0);
var tex1 = gl.createTexture();
loadTexture(gl, tex1, 'https://al-ro.github.io/projects/clouds/cloudShapeTexturePacked.png', 0);
gl.activeTexture(gl.TEXTURE1);
var tex2 = gl.createTexture();
loadTexture(gl, tex2, 'https://al-ro.github.io/projects/clouds/dualCloudDetail.png', 1);
gl.activeTexture(gl.TEXTURE2);
var tex3 = gl.createTexture();
loadTexture(gl, tex3, 'https://al-ro.github.io/projects/clouds/weatherMap.png', 2);
gl.activeTexture(gl.TEXTURE3);
var tex4 = gl.createTexture();
loadTexture(gl, tex4, 'https://al-ro.github.io/projects/clouds/curlNoise.png', 3);

gl.activeTexture(gl.TEXTURE4);
var tex4 = gl.createTexture();
loadTexture(gl, tex4, 'https://al-ro.github.io/projects/clouds/blueNoise.png');

//Cubemap
gl.activeTexture(gl.TEXTURE5);
var tex5 = gl.createTexture();
createCubeMap(tex5);

//Tile 
gl.activeTexture(gl.TEXTURE6);
var tileTexture = gl.createTexture();
createTileTexture(tileTexture);

  //Compile shader and combine with source
  function compileShader(shaderSource, shaderType){
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
    }
    return shader;
  }

  //From https://codepen.io/jlfwong/pen/GqmroZ
  //Utility to complain loudly if we fail to find the attribute/uniform
  function getAttribLocation(program, name) {
    var attributeLocation = gl.getAttribLocation(program, name);
    if (attributeLocation === -1) {
      throw 'Cannot find attribute ' + name + '.';
    }
    return attributeLocation;
  }

  function getUniformLocation(program, name) {
    var attributeLocation = gl.getUniformLocation(program, name);
    if (attributeLocation === -1) {
      throw 'Cannot find uniform ' + name + '.';
    }
    return attributeLocation;
  }

  //************** Create shaders **************

  if(!mobile){

  var cubeVertexShader = compileShader(cubeVertexSource, gl.VERTEX_SHADER);
  var cubeFragmentShader = compileShader(cubeFragmentSource, gl.FRAGMENT_SHADER);
    //Create vertex and fragment shaders
    var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
    var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    //Create shader programs
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

    var cube_program = gl.createProgram();
    gl.attachShader(cube_program, cubeVertexShader);
    gl.attachShader(cube_program, cubeFragmentShader);
    gl.linkProgram(cube_program);

    //Set up rectangle covering entire canvas 
    var vertexData = new Float32Array([
        -1.0,  1.0, 	// top left
        -1.0, -1.0, 	// bottom left
        1.0,  1.0, 	// top right
        1.0, -1.0, 	// bottom right
    ]);

    //Create vertex buffer
    var vertexDataBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    // Layout of our data in the vertex buffer
    var positionHandle = getAttribLocation(program, 'position');

    gl.enableVertexAttribArray(positionHandle);
    gl.vertexAttribPointer(positionHandle,
        2, 		// position is a vec2 (2 values per component)
        gl.FLOAT, 	// each component is a float
        false, 		// don't normalize values
        2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
        0 		// how many bytes inside the buffer to start from
    );

    viewMatrix = lookAt(cameraPosition, viewDirection, upVector);
    //Set uniform handle
    var timeHandle = getUniformLocation(program, 'time');
    var widthHandle = getUniformLocation(program, 'width');
    var heightHandle = getUniformLocation(program, 'height');
    var totalWidthHandle = getUniformLocation(program, 'totalWidth');
    var totalHeightHandle = getUniformLocation(program, 'totalHeight');
    var tileOffsetHandle = getUniformLocation(program, 'tileOffset');
    var mouseHandle = getUniformLocation(program, 'mouse');
    var viewHeightHandle = getUniformLocation(program, 'viewHeight');
    var powerHandle = getUniformLocation(program, 'power');
    var densityMultiplierHandle = getUniformLocation(program, 'densityMultiplier');
    var mainSizeHandle = getUniformLocation(program, 'mainSize');
    var hdHandle = getUniformLocation(program, 'HD');
    var detailSizeHandle = getUniformLocation(program, 'detailSize');
    var tempVarHandle = getUniformLocation(program, 'tempVar');
    var tempVar2Handle = getUniformLocation(program, 'tempVar2');
    var detailStrengthHandle = getUniformLocation(program, 'detailStrength');
    var mainStrengthHandle = getUniformLocation(program, 'mainStrength');
    var exposureHandle = getUniformLocation(program, 'exposure');
    var coverageHandle = getUniformLocation(program, 'coverage');
    var shapeTextureHandle = gl.getUniformLocation(program, "cloudShapeTexture");
    var detailTextureHandle = gl.getUniformLocation(program, "cloudDetailTexture");
    var weatherMapTextureHandle = gl.getUniformLocation(program, "weatherMapTexture");
    var curlNoiseTextureHandle = gl.getUniformLocation(program, "curlNoiseTexture");
    var blueNoiseTextureHandle = gl.getUniformLocation(program, "blueNoiseTexture");
    var iterationHandle = gl.getUniformLocation(program, "iteration");

    var viewMatrixHandle = getUniformLocation(program, 'viewMatrix');
    var cameraPositionHandle = getUniformLocation(program, 'cameraPosition');
    var sunPositionHandle = getUniformLocation(program, 'sunPosition');

    var skyBoxHandle_ = gl.getUniformLocation(program, "skyBox");

    gl.uniformMatrix3fv(viewMatrixHandle, false, getViewMatrixAsArray());
    gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    gl.uniform3f(sunPositionHandle, Math.sin(azimuth), Math.sin(elevation), Math.cos(azimuth));

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(shapeTextureHandle, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(detailTextureHandle, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(weatherMapTextureHandle, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(curlNoiseTextureHandle, 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(blueNoiseTextureHandle, 4);

    gl.uniform1f(widthHandle, tileSize);
    gl.uniform1f(heightHandle, tileSize);
    gl.uniform1f(totalWidthHandle, cubeMapSize);
    gl.uniform1f(totalHeightHandle, cubeMapSize);
    gl.uniform2f(tileOffsetHandle, xCounter*tileSize, yCounter*tileSize);
    gl.uniform2f(mouseHandle, mousePosition.x, mousePosition.y);
    gl.uniform1f(viewHeightHandle, viewHeight);
    gl.uniform1i(hdHandle, hd);
    gl.uniform1f(timeHandle, time);
    gl.uniform1f(powerHandle, power);
    gl.uniform1f(densityMultiplierHandle, densityMultiplier);
    gl.uniform1f(detailSizeHandle, detailSize);
    gl.uniform1f(tempVarHandle, tempVar);
    gl.uniform1f(tempVar2Handle, tempVar2);
    gl.uniform1f(mainSizeHandle, mainSize);
    gl.uniform1f(detailStrengthHandle, detailStrength);
    gl.uniform1f(mainStrengthHandle, mainStrength);
    gl.uniform1f(exposureHandle, exposure);
    gl.uniform1f(coverageHandle, coverage);
    gl.uniform1f(iterationHandle, iteration);

    var skyBoxHandle = gl.getUniformLocation(cube_program, "skyBox");
    var widthHandle_ = getUniformLocation(cube_program, 'width');
    var heightHandle_ = getUniformLocation(cube_program, 'height');
    var viewMatrixHandle_ = getUniformLocation(cube_program, "viewMatrix");
  }

  function getPos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function mouseDown(event){
    isMouseDown = true;
  }

  function mouseUp(event){
    isMouseDown = false;
  }

  function mouseMove(event){
    if(isMouseDown){
      var pos = getPos(canvas, event);
      pos.x *= canvas.width /canvas.clientWidth;
      pos.y *= canvas.height /canvas.clientHeight;
      gl.useProgram(program);
      gl.uniform2f(mouseHandle, pos.x, pos.y);
    }
  }

  function onScroll(event){
    renderFlag = true;
    event.preventDefault();
    viewHeight += event.deltaY;

    viewHeight = Math.min(Math.max(0.0, viewHeight), 10000.0);
    gl.useProgram(program);
    gl.uniform1f(viewHeightHandle, viewHeight);
  }

  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mousemove', mouseMove);
  //canvas.addEventListener('wheel', onScroll);

  function animateSun(dt){
    sun += dt;
    sun = sun % 6.283;
    gl.uniform1f(sunHandle, sun);
  }


function createAndSetupTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}
gl.activeTexture(gl.TEXTURE6);
//Create and bind frame buffer
frameBuffer = gl.createFramebuffer();
frameBuffer.width = tileSize;
frameBuffer.height = tileSize;
gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

//Create and bind texture
var sceneTexture = createAndSetupTexture(gl);
//Allocate/send over empty texture data
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
//Assign texture as framebuffer colour attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTexture, 0);


var lastPos = {x: mousePosition.x, y: mousePosition.y};

  function getPos(canvas, evt){
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function mouseDown(event){
    isMouseDown = true;
    var pos = getPos(canvas, event);
    lastPos.x = pos.x;
    lastPos.y = pos.y;
  }
  function mouseUp(event){
    isMouseDown = false;
    mouseDelta.x = 0.0;
    mouseDelta.y = 0.0;
  }

  function updateViewDirection(delta){
    var yawChange = (delta.x * 0.005) % (2.0 * Math.PI);
    yaw += yawChange;
    viewDirection.x = Math.sin(yaw);
    viewDirection.z = Math.cos(yaw);
    viewDirection = normalize(viewDirection);
    yawChange = (delta.y * 0.002) % (2.0 * Math.PI);
    pitch += yawChange;
    pitch = Math.max(-Math.PI/2.0, Math.min(Math.PI/2.0, pitch));
    viewDirection.y = Math.sin(pitch);
  }

  function mouseMove(event){
    if(isMouseDown){
      var pos = getPos(canvas, event);
      tileCounter = 0;
      mouseDelta.x = lastPos.x - pos.x;
      mouseDelta.y = lastPos.y - pos.y;
      
      updateViewDirection(mouseDelta);
      viewMatrix = lookAt(cameraPosition, viewDirection, upVector);
      gl.useProgram(program);
      gl.uniformMatrix3fv(viewMatrixHandle, false, getViewMatrixAsArray());
      gl.useProgram(cube_program);
      gl.uniformMatrix3fv(viewMatrixHandle_, false, getViewMatrixAsArray());
      lastPos.x = pos.x;
      lastPos.y = pos.y;
    }
  }
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mousemove', mouseMove);
  var speed = 10050.0;
  var forward = false;
  var backward = false;
  var left = false;
  var right = false;
  function keyDown(e){
    if(e.keyCode == 38 || e.keyCode == 40){
      e.preventDefault();
    }
    if(e.keyCode == 87 || e.keyCode == 38) {
      forward = true;
    }
    if(e.keyCode == 83 || e.keyCode == 40) {
      backward = true;
    }
    if(e.keyCode == 65 || e.keyCode == 37) {
      left = true;
    }
    if(e.keyCode == 68 || e.keyCode == 39) {
      right = true;
    }
  };

  function keyUp(e){
    updateClouds();
    if(e.keyCode == 87 || e.keyCode == 38) {
      forward = false;
    }
    if(e.keyCode == 83 || e.keyCode == 40) {
      backward = false;
    }
    if(e.keyCode == 65 || e.keyCode == 37) {
      left = false;
    }
    if(e.keyCode == 68 || e.keyCode == 39) {
      right = false;
    }
  };

  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);

  function moveCamera(dT){ 
    if(forward){
      cameraPosition.x += dT * speed * viewDirection.x;
      cameraPosition.z += dT * speed * viewDirection.z;
      gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
    if(backward){
      cameraPosition.x -= dT * speed * viewDirection.x;
      cameraPosition.z -= dT * speed * viewDirection.z;
      gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
    if(left){
      var rightVector = cross(upVector, viewDirection);
      cameraPosition.x += dT * speed * rightVector.x;
      cameraPosition.z += dT * speed * rightVector.z;
      gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
    if(right){
      var rightVector = cross(upVector, viewDirection);
      cameraPosition.x -= dT * speed * rightVector.x;
      cameraPosition.z -= dT * speed * rightVector.z;
      gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
  }

var start;
function setCounters(){
  if(tileCounter == 0 && iteration == 1.0){
    start = Date.now();
  }
  let tileIndex = tileIndices[tileCounter][0];
  if(tileCounter == (totalTiles-1)){
    faceCounter = 0;
    console.log("Iteration: ", iteration);
    iteration += 1;
      if(iteration > ITERATION_LIMIT){
      renderFlag = false;
      console.log("Render time: " + (Date.now() - start)/1000 + " s");
    }
  }
  tileCounter = (tileCounter + 1) % totalTiles;
}
function renderCubeMap(){
  let tileIndex = tileIndices[tileCounter][0];
  let mu = dot(tileDirections[tileIndex], normalize(cameraPosition));
  if(mu < 0){ 
    //setCounters(); 
    //return;
  }
  //console.log(tileIndices[0][1]);
  xCounter = tileIndex % tileCount;
  yCounter = Math.floor(tileIndex/tileCount) % tileCount;
  faceCounter = Math.floor(tileIndex / (tileCount * tileCount));
  //console.log(tileCounter + " Render tile: " + tileIndex, "Face: " + faceCounter);
  gl.useProgram(program);
  gl.viewport(0, 0, tileSize, tileSize);
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shapeTextureHandle, 0);
  gl.activeTexture(gl.TEXTURE5);
  gl.uniform1i(skyBoxHandle_, 5);  // texture unit 0
  gl.uniform1f(timeHandle, time);
  gl.uniform1f(iterationHandle, iteration);
  //gl.useProgram(program);
  gl.uniform1f(widthHandle, tileSize);
  gl.uniform1f(heightHandle, tileSize);
  gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
 
  var vM = viewMatrix;

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tileTexture, 0);

  viewMatrix = lookAt(cameraPosition, viewDirections[faceCounter], upDirections[faceCounter]);
  gl.uniformMatrix3fv(viewMatrixHandle, false, getViewMatrixAsArray());
  gl.uniform2f(tileOffsetHandle, yCounter*tileSize, xCounter*tileSize);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.activeTexture(gl.TEXTURE6);
  //gl.bindTexture(gl.TEXTURE_2D, tileTexture);
  gl.readPixels(0, 0, tileSize, tileSize, gl.RGBA, gl.UNSIGNED_BYTE, tilePixels); 

  gl.activeTexture(gl.TEXTURE5);
  //gl.bindTexture(gl.TEXTURE_CUBE, tex5);

  gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceCounter, 0, yCounter*tileSize, xCounter*tileSize, tileSize, tileSize, gl.RGBA, gl.UNSIGNED_BYTE, tilePixels);
  setCounters();
  viewMatrix = vM;
}

function renderSkyBox(){

  if(renderFlag && imagesLoaded[0] && imagesLoaded[1] && imagesLoaded[2] && imagesLoaded[3]){
    //renderFlag = false;
    return true;
  }
  return false;
}
function sortTiles(){
  for(let i = 0; i < totalTiles; i++){
    let idx = tileIndices[i][0];
    tileIndices[i][1] = dot(normalize(viewDirection), tileDirections[idx]);
  }
  tileIndices.sort(compareTiles);
}

var counter = 0;
var limit = 500;
//************** Draw **************
var lastFrame = Date.now();
var thisFrame;

  //renderCubeMap();
  function draw(){
    stats.begin();
    if(renderSkyBox()){
      sortTiles();
      renderCubeMap();
    }
    
    gl.useProgram(program);
    if(cube){
    }else{
      //Draw to canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(shapeTextureHandle, 0);
    //Update time
    thisFrame = Date.now();
    dT = (thisFrame - lastFrame)/1000.0;
    time += dT;	
    moveCamera(dT);
    
    if(animate){
      //animateSun(dT);	
    }
    lastFrame = thisFrame;

    //Send uniforms to program
    gl.uniform1f(timeHandle, time);

    //gl.useProgram(program);
    //gl.uniform1f(widthHandle, tileSize);
    //gl.uniform1f(heightHandle, tileSize);
/*
    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
*/
    if(cube){
      gl.useProgram(cube_program);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(widthHandle_, canvas.width);
      gl.uniform1f(heightHandle_, canvas.height);
      gl.uniformMatrix3fv(viewMatrixHandle_, false, getViewMatrixAsArray());
      gl.activeTexture(gl.TEXTURE5);
      gl.uniform1i(skyBoxHandle, 5);  // texture unit 0
      //gl.bindTexture(gl.TEXTURE_CUBE, tex5);

      //Draw to canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      //Draw a triangle strip connecting vertices 0-4
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    stats.end();
    if(counter < limit){
      //      counter++;
      requestAnimationFrame(draw);
    }
  }
  draw();
}
