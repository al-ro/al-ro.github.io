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

  //Time
  var time = 0.03;
  var density = 1.0;
  var animate = false;
  var blur = true;
  var hd = false;
  var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.3};
  var isMouseDown = false;
  //Distance of planet
  var thickness = 0.5;
  var scale = 0.03;
  var power = 30.0;
  var mainSize = 0.001;
  var detailSize = 0.007;
  var detailStrength = 0.1;
  var exposure = 0.5;
  //Thickness of the atmosphere

  stats = new Stats();
  stats.showPanel(0);
  stats.domElement.style.position = 'relative';
  stats.domElement.style.bottom = '48px';

  if(!mobile){
    document.getElementById('cc_1').appendChild(stats.domElement);
  }

  //****************** GUI *********************
  var gui = new dat.GUI({ autoPlace: false });
  var customContainer = document.getElementById('gui_container');
  if(!mobile){
    customContainer.appendChild(gui.domElement);
  }
  gui.add(this, 'time').min(0.0).max(6.283).step(0.0001).listen().onChange(function(value){gl.useProgram(program); gl.uniform1f(timeHandle, time);});
  gui.add(this, 'thickness').min(0.0).max(1.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(thicknessHandle, thickness);});
  gui.add(this, 'power').min(0.0).max(1000.0).step(5.0).onChange(function(value){gl.useProgram(program); gl.uniform1f(powerHandle, power);});
  gui.add(this, 'mainSize').min(0.0).max(0.01).step(0.000001).onChange(function(value){gl.useProgram(program); gl.uniform1f(mainSizeHandle, mainSize);});
  gui.add(this, 'density').min(0.0).max(2.2).step(0.001).onChange(function(value){gl.useProgram(program); gl.uniform1f(densityHandle, density);});
  gui.add(this, 'detailSize').min(0.0).max(0.1).step(0.000001).onChange(function(value){gl.useProgram(program); gl.uniform1f(detailSizeHandle, detailSize);});
  gui.add(this, 'detailStrength').min(0.0).max(1.0).step(0.01).onChange(function(value){gl.useProgram(program); gl.uniform1f(detailStrengthHandle, detailStrength);});
  gui.add(this, 'exposure').min(0.0).max(1.0).step(0.05).onChange(function(value){gl.useProgram(program); gl.uniform1f(exposureHandle, exposure);});
  gui.add(this, 'animate');
  gui.add(this, 'hd').listen().onChange(function(value){gl.useProgram(program); gl.uniform1i(hdHandle, hd);});
  gui.add(this, 'blur');
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
    uniform float scale;
    uniform float thickness;
    uniform float width;
    uniform float height;
    uniform vec2 mouse;
    uniform float time;
    uniform float power;
    uniform float density;
    uniform float mainSize;
    uniform float detailSize;
    uniform float detailStrength;
    uniform float exposure;
    uniform sampler2D cloudShapeTexture;
    uniform sampler2D cloudDetailTexture;
    uniform sampler2D blueNoiseTexture;
    uniform bool HD;

  //#define VOLUME_TEXTURES
  #define NOISE_TEXTURES

  //#define HD

    const int STEPS_PRIMARY = 40;//fast ? 13 : 21;   
    const int STEPS_LIGHT = 20;//fast ? 7 : 3;
#ifdef HD
    STEPS_PRIMARY = 128;
#endif
#ifdef HD
    STEPS_LIGHT = 64;
#endif

  const float PI = 3.141592;

  // Cloud parameters
  const float PLANET_RADIUS = 6300e3;
  const float CLOUD_START = 600.0;
  const float CLOUD_HEIGHT = 10000.0;

  //const vec3 SUN_POWER = vec3(1.0,0.2,0.1) * 720.;
  #define SUN_POWER power
  //https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
  mat3 lookAt(vec3 camera, vec3 targetDir, vec3 up){
    vec3 zaxis = normalize(targetDir);    
    vec3 xaxis = normalize(cross(zaxis, up));
    vec3 yaxis = cross(xaxis, zaxis);

    return mat3(xaxis, yaxis, -zaxis);
  }

  vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 resolution = vec2(width, height);
    vec2 xy = fragCoord - resolution.xy / 2.0;
    float z = resolution.y / tan(radians(fieldOfView) / 2.0);
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
    vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
    vec2 pixel = coord.xy + offset;
    vec2 data0 = texture2D(cloudShapeTexture, mod(pixel, dataWidth)/textureWidth).xy;
    return mix(data0.x, data0.y, f);
  }

  float getCloudDetail(vec3 pos){

    
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
    vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
    vec2 pixel = coord.xy + offset;
    vec2 data0 = texture2D(cloudDetailTexture, mod(pixel, dataWidth)/textureWidth).xy;
    return mix(data0.x, data0.y, f);
  }


  //Return first intersection in front of the camera
  float intersectSphere(vec3 origin, vec3 dir, vec3 spherePos, float sphereRad){
    vec3 oc = origin - spherePos;
    float b = 2.0 * dot(dir, oc);
    float c = dot(oc, oc) - sphereRad*sphereRad;
    float disc = b * b - 4.0 * c;
    if (disc < 0.0){
      return -1.0;
    }
    float q = (-b + ((b < 0.0) ? -sqrt(disc) : sqrt(disc))) / 2.0;
    float t0 = q;
    float t1 = c / q;
    if (t0 > t1) {
      float temp = t0;
      t0 = t1;
      t1 = temp;
    }
    if (t1 < 0.0){
      return -1.0;
    }

    return (t0 < 0.0) ? t1 : t0;
  }
    //Return the near and far intersections of an infinite ray and a sphere. 
    //Assumes sphere at origin. No intersection if result.x > result.y
    float sphereIntersect(vec3 start, vec3 dir, float radius){
      float a = dot(dir, dir);
      float b = 2.0 * dot(dir, start);
      float c = dot(start, start) - (radius * radius);
      float d = (b*b) - 4.0*a*c;
      if (d < 0.0){
	return -10.0;//vec2(1e5, -1e5);
      }
      float first = (-b - sqrt(d))/(2.0*a);
      float second =  (-b + sqrt(d))/(2.0*a);
      return (first >= 0.0) ? first : second;
    }

  //Get density and cloud height at sample point
  float clouds(vec3 p, out float cloudHeight, bool fast){
//Get density and cloud height at sample point
  
    //Height of point above the ground
    float atmoHeight = length(p - vec3(0.0, 0.0, 0.0)) - PLANET_RADIUS;
  
    //What fraction through the shell is the point situated
    cloudHeight = clamp((atmoHeight-CLOUD_START)/(CLOUD_HEIGHT), 0.0, 1.0);

    //General density of clouds from Perlin-Worley texture
    //float shape = clamp((getCloudShape(mainSize*p) - (1.0-thickness)) * 5.0 , 0.0, 2.0);
    float shape = thickness*saturate(getCloudShape(mainSize*p) - 0.5);

    //Round the bottom and top of the clouds. From "Real-time rendering of volumetric clouds". 
    //Assumes there is no height map data and all clouds default to height 1.0
    shape *= saturate(remap(cloudHeight, 0.0, 0.3, 0.0, 1.0)) * saturate(remap(cloudHeight, 0.2, 1.0, 1.0, 0.0));

    //Early exit from empty space
    if(shape <= 0.0){
      return 0.0;    
    }

    if(shape < 0.5){
      //shape = pow(shape, 1.1);
    }
    //Carving clouds out of large slabs
    float detail = detailStrength*getCloudDetail(detailSize * p);
    //sebh code says the following
    //shape = saturate(remap(shape, -(1.0-detail), 1.0, 0.0, 1.0));
    //Other sources this
    shape = saturate(remap(shape, detail, 1.0, 0.0, 1.0));
    //detail = 0.5*detailStrength*getCloudDetail(0.2 * detailSize * p);
    //shape = saturate(remap(shape, detail, 1.0, 0.0, 1.0));


    return shape;
  }

  float HenyeyGreenstein(float g, float costh){
    return (1.0/(4.0 * 3.1415))  * ((1.0 - g * g) / pow(1.0 + g*g - 2.0*g*costh, 1.5));
  }

  float getBlueNoise(vec3 p){
    return texture2D(blueNoiseTexture, p.xy).x;
  }

  // From https://www.shadertoy.com/view/4sjBDG
  float numericalMieFit(float costh)
  {
    // This function was optimized to minimize (delta*delta)/reference in order to capture
    // the low intensity behavior.
    float bestParams[10];
    bestParams[0]=9.805233e-06;
    bestParams[1]=-6.500000e+01;
    bestParams[2]=-5.500000e+01;
    bestParams[3]=8.194068e-01;
    bestParams[4]=1.388198e-01;
    bestParams[5]=-8.370334e+01;
    bestParams[6]=7.810083e+00;
    bestParams[7]=2.054747e-03;
    bestParams[8]=2.600563e-02;
    bestParams[9]=-4.552125e-12;

    float p1 = costh + bestParams[3];
    vec4 expValues = exp(vec4(bestParams[1] * costh+bestParams[2], bestParams[5] * p1 * p1, bestParams[6] *costh, bestParams[9] *costh));

    vec4 expValWeight= vec4(bestParams[0], bestParams[4], bestParams[7], bestParams[8]);

    return dot(expValues, expValWeight);
  }

  float lightRay(vec3 p, float phaseFunction, float dC, float mu, vec3 sunDirection, float cloudHeight, bool fast){
    int nbSampleLight = fast ? 7 : 3;
#ifdef HD
    nbSampleLight = 64;
#endif
    //The distance for which light samples are taken
    //Reduce to 300 for less noise but also less self-shadowing
    //Try cone sampling
    float zMaxl         = 200.;
    float stepL         = zMaxl/float(nbSampleLight);

    float lighRayDen = 0.0;    

    //Introduce noise to eliminate banding/layering artefacts
    p += sunDirection*stepL*hash(dot(p, vec3(12.256, 2.646, 6.356)));


    //Collect total density along light ray
    for(int j=0; j<64; j++){
      if(!HD){
	if(j == STEPS_LIGHT){break;}
      }
      float cloudHeight;
      lighRayDen += clouds(p + sunDirection * float(j) * stepL, cloudHeight, fast);
    }    

    if(fast){
      return (0.5*exp(-0.4*stepL*lighRayDen) + max(0.0, -mu*0.6+0.3)
	  * exp(-0.02*stepL*lighRayDen))*phaseFunction;
    }

    float scatterAmount = mix(0.008, 1.0, smoothstep(0.96, 0.0, mu));

    //Fake multiple scattering by combining multiple scattering octaves with
    //reduced strength. Modulate wrt. view/sun direction
    //This is very much artistic and can be played around with
    //Discussed in Frostbite paper, credited to Wrenninge et al.
    float beersLaw = exp(-stepL*lighRayDen)
      + 0.5 * scatterAmount * exp(-0.1  * stepL * lighRayDen)
      + 2.0 * scatterAmount * exp(-0.1  * stepL * lighRayDen)
      + 0.4 * scatterAmount * exp(-0.02 * stepL * lighRayDen);

    //Return product of Beer's law and phase function
    //The rest is some height based brightness modulation which is probably very bespoke
    return beersLaw * phaseFunction *  mix(0.05 + 1.5 * pow(min(1.0, dC * 8.5), 0.3 + 5.5 * cloudHeight), 1.0,  clamp(lighRayDen*0.4, 0.0, 1.0));
  }


  vec3 skyRay(vec3 org, vec3 dir, vec3 sunDirection, bool fast, out float totalTransmittance){

    //return 12.5 * vec3(dot(dir, vec3(1.0, 0.0, 0.0)));
    //The limits of the cloud shell
    const float ATM_START = PLANET_RADIUS+CLOUD_START;
    const float ATM_END = ATM_START+CLOUD_HEIGHT;

    vec3 color = vec3(0.0);


    //Limits of the ray within the cloud shell
    //float distToAtmStart = intersectSphere(org, dir, vec3(0.0, 0.0, 0.0), ATM_START);
    float distToAtmStart = sphereIntersect(org, dir, ATM_START);
    if(length(org) > ATM_START){
      distToAtmStart = 0.0;
    }

    //float distToAtmEnd = intersectSphere(org, dir, vec3(0.0, 0.0, 0.0), ATM_END);
    float distToAtmEnd = sphereIntersect(org, dir, ATM_END);
    //The point at which the ray enters the cloud shell
    vec3 p = org + distToAtmStart * dir;    
    //Step size
    float stepS;
    if(HD){
      stepS = (distToAtmEnd-distToAtmStart) / float(128); 
    }else{
      stepS = (distToAtmEnd-distToAtmStart) / float(STEPS_PRIMARY); 
    }

    //Variable to track transmittance along view ray
    totalTransmittance = 1.0;    

    float mu = dot(sunDirection, dir);

    //Curve fitted to a Mie plot
    float phaseFunction = numericalMieFit(mu);
    //float phaseFunction = HenyeyGreenstein(0.3, mu);
    vec2 resolution = vec2(width, height);

    //Introduce noise to eliminate banding/layering artefacts
    p += dir*stepS*hash(dot(dir, vec3(12.256, 2.646, 6.356)));

    //If vie direction pointing up
    if(dir.y > -0.015){
      for(int i=0; i < 128; i++){
	if(!HD){
	  //Who said you can't have variable length for-loops
	  if(i == STEPS_PRIMARY){break;}
	}

	float cloudHeight;

	//Get density and cloud height at sample point
	float density = clouds(p, cloudHeight, fast);

	//If there is a cloud at the sample point
	if(density > 0.0 ){

	  //stepS = 0.1 * stepS;
	  //Temporary hack for sunlight to cycle from white to orange
	  float sun = SUN_POWER * (0.5 + 0.5 * mu);// * (mix(vec3(1.0), vec3(1.0, 0.2, 0.05), 1.0-(0.5 + 0.5 * sin(iTime * 0.5))));

	  //Lighten dark shadows at the bottom of clouds
	  vec3 ambient = vec3(mix((1.0), (2.0), cloudHeight));//mix(vec3(3.0), vec3(10.0), (0.5 + 0.5 * sin(iTime * 0.5)));
	  //(0.5 + 0.6*cloudHeight)*vec3(1)*6.5 + vec3(1.) * max(0.0, 1.0-2.0*cloudHeight);


	  //Amount of sunlight that reaches the sample point through the cloud
	  vec3 luminance = ambient + sun * lightRay(p, phaseFunction, density, mu, sunDirection, cloudHeight, fast);        	

	  luminance *= density;

	  float transmittance = exp(-density * stepS);

	  //Better energy conserving integration
	  //"From Physically based sky, atmosphere and cloud rendering in Frostbite" 5.6
	  //by Sebastian Hillaire
	  color += totalTransmittance * (luminance - luminance * transmittance) / density; 

	  totalTransmittance *= transmittance;  

	  //If ray combined transmittance is close to 0, nothing beyond this sample 
	  //point is visible, so break early
	  if(totalTransmittance <= 0.05){
	    break;
	  }
	}
	p += dir*stepS;
      }
    }

    return color;
  }

  void main(){
    vec2 resolution = vec2(width, height);
    //Get the default direction of the ray (along the negative z direction)
    vec3 rayDir = rayDirection(45.0, gl_FragCoord.xy);
    vec2 mouseRelative;
    mouseRelative.x = (mouse.x / resolution.x) * 2.0 - 1.0;
    mouseRelative.y = (mouse.y / resolution.y) * -2.0 + 1.0;

    //----------------- Define a camera -----------------

    vec3 cameraPos = vec3(0.0, PLANET_RADIUS + scale, 0.0);

    vec3 sunDirection = normalize(vec3(sin(time), 0.2, -cos(time)));
    //sunDirection = normalize(vec3(cos(time), 0.5 + 0.5 * sin(time), sin(time)) );
    //sunDirection = vec3(cos(time), 0.5 + 0.5 * sin(time), sin(time));

    vec3 targetDir = normalize(vec3(sin(mouseRelative.x), mouseRelative.y, -cos(mouseRelative.x)));

    vec3 up = vec3(0.0, 1.0, 0.0);

    //---------------------------------------------------

    //Get the view matrix from the camera orientation
    mat3 viewMatrix = lookAt(cameraPos, targetDir, up);

    //Transform the ray to point in the correct direction
    rayDir = normalize(viewMatrix * rayDir);
    vec3 color = vec3(0.0);

    float totalTransmittance;
    color = exposure * skyRay(cameraPos, rayDir, sunDirection, false, totalTransmittance); 
    vec3 background = mix(vec3(1.0), vec3(0.0, 0.0, 1.0), 0.5+0.5*rayDir.y);
    float weight = smoothstep(-0.2, 0.1, rayDir.y);
    background =  mix(vec3(0.75, 0.87, 0.93), vec3(0.12, 0.29, 0.55), weight);

    float mu = dot(sunDirection, rayDir);
    //Draw sun
    background += totalTransmittance * vec3(1e4*smoothstep(0.9998, 1.0, mu));
    color += background * totalTransmittance;

    //Why is the returned colour so bright?
    vec3 col = 1.0-exp(-color);
    col = pow(color, vec3(0.4545));
/*
    vec3 p = vec3(gl_FragCoord.xy-0.5, time);
    p *= detailSize;

    col = vec3(getCloudDetail(p));
    //float wi = time;
    //col = vec3(0);
    //p.xy = mod(p.xy, 204.0);
    //p *= time;
      //col = vec3(texture2D(cloudDetailTexture, mod(p.xy, 204.0)/256.0).xy, 0.0);
    */
    //col = vec3(getBlueNoise(gl_FragCoord.xyx/resolution.xyx));
    gl_FragColor = vec4(col, 1.0);
  }
  `;
  
//****************** Combine shaders ******************

var combineVertexSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

var combineFragmentSource = `
precision highp float;

varying vec2 texCoord;
uniform sampler2D srcData;
uniform float width;
uniform float height;

void main() {
  vec2 resolution = vec2(width, height);
  vec2 offsets[8];
  offsets[0] = vec2(-1,-1);
  offsets[1] = vec2(-1, 1);
  offsets[2] = vec2(1, -1);
  offsets[3] = vec2(1, 1);
  offsets[4] = vec2(1, 0);
  offsets[5] = vec2(0, -1);
  offsets[6] = vec2(0, 1);
  offsets[7] = vec2(-1, 0);

  vec3 col = texture2D(srcData, gl_FragCoord.xy / resolution).rgb;
  for(int i = 0; i < 8; i++){
    col += texture2D(srcData, (gl_FragCoord.xy + offsets[i])/resolution).rgb;
  }
  gl_FragColor = vec4(col/9.0, 1.0);
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
      w *= 0.8;
      h *= 0.8;
    }
    canvas.width = w;
    canvas.height = h;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(widthHandle, canvas.width);
    gl.uniform1f(heightHandle, canvas.height);
  }

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.

function loadTexture(gl, texture, url) {
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
  const pixel = new Uint8Array([255, 0, 0, 255]);  // opaque blue
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
loadTexture(gl, tex1, 'https://al-ro.github.io/projects/clouds/cloudShapeTexturePacked.png');
gl.activeTexture(gl.TEXTURE1);
var tex2 = gl.createTexture();
loadTexture(gl, tex2, 'https://al-ro.github.io/projects/clouds/dualCloudDetail.png');
gl.activeTexture(gl.TEXTURE2);
var tex3 = gl.createTexture();
loadTexture(gl, tex3, 'https://al-ro.github.io/projects/clouds/blueNoiseSs.png');

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

  var combineVertexShader = compileShader(combineVertexSource, gl.VERTEX_SHADER);
  var combineFragmentShader = compileShader(combineFragmentSource, gl.FRAGMENT_SHADER);
    //Create vertex and fragment shaders
    var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
    var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    //Create shader programs
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

    var combine_program = gl.createProgram();
    gl.attachShader(combine_program, combineVertexShader);
    gl.attachShader(combine_program, combineFragmentShader);
    gl.linkProgram(combine_program);

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

    //Set uniform handle
    var timeHandle = getUniformLocation(program, 'time');
    var widthHandle = getUniformLocation(program, 'width');
    var heightHandle = getUniformLocation(program, 'height');
    var mouseHandle = getUniformLocation(program, 'mouse');
    var scaleHandle = getUniformLocation(program, 'scale');
    var powerHandle = getUniformLocation(program, 'power');
    var densityHandle = getUniformLocation(program, 'density');
    var mainSizeHandle = getUniformLocation(program, 'mainSize');
    var hdHandle = getUniformLocation(program, 'HD');
    var detailSizeHandle = getUniformLocation(program, 'detailSize');
    var detailStrengthHandle = getUniformLocation(program, 'detailStrength');
    var exposureHandle = getUniformLocation(program, 'exposure');
    var thicknessHandle = getUniformLocation(program, 'thickness');
    var shapeTextureHandle = gl.getUniformLocation(program, "cloudShapeTexture");
    var detailTextureHandle = gl.getUniformLocation(program, "cloudDetailTexture");
    var blueNoiseTextureHandle = gl.getUniformLocation(program, "blueNoiseTexture");
    gl.uniform1i(shapeTextureHandle, 0);
    gl.uniform1i(detailTextureHandle, 1);
    gl.uniform1i(blueNoiseTextureHandle, 2);

    gl.uniform1f(widthHandle, canvas.width);
    gl.uniform1f(heightHandle, canvas.height);
    gl.uniform2f(mouseHandle, mousePosition.x, mousePosition.y);
    gl.uniform1f(scaleHandle, scale);
    gl.uniform1i(hdHandle, hd);
    gl.uniform1f(timeHandle, time);
    gl.uniform1f(powerHandle, power);
    gl.uniform1f(densityHandle, density);
    gl.uniform1f(detailSizeHandle, detailSize);
    gl.uniform1f(mainSizeHandle, mainSize);
    gl.uniform1f(detailStrengthHandle, detailStrength);
    gl.uniform1f(exposureHandle, exposure);
    gl.uniform1f(thicknessHandle, thickness);

    var srcDataHandle = gl.getUniformLocation(combine_program, "srcData");
    var widthHandle = getUniformLocation(combine_program, 'width');
    var heightHandle = getUniformLocation(combine_program, 'height');
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
    event.preventDefault();
    scale += event.deltaY;

    scale = Math.min(Math.max(0.0, scale), 5000.0);
    gl.useProgram(program);
    gl.uniform1f(scaleHandle, scale);
  }

  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('wheel', onScroll);

  function animateSun(dt){
    time += dt;
    time = time % 6.283;
    gl.uniform1f(timeHandle, time);
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
//Create and bind frame buffer
var frameBuffer = gl.createFramebuffer();
frameBuffer.width = canvas.width;
frameBuffer.height = canvas.height;
gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

//Create and bind texture
var sceneTexture = createAndSetupTexture(gl);
//Allocate/send over empty texture data
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
//Assign texture as framebuffer colour attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTexture, 0);

var counter = 0;
var limit = 500;
  //************** Draw **************
  var lastFrame = Date.now();
  var thisFrame;
  
  function draw(){
    stats.begin();

    gl.useProgram(program);
    if(blur){
      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    }else{
      //Draw to canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    //Update time
    thisFrame = Date.now();
    if(animate){
      animateSun((thisFrame - lastFrame)/1000);	
    }
    lastFrame = thisFrame;

    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if(blur){
      gl.useProgram(combine_program);
      gl.uniform1f(widthHandle, canvas.width);
      gl.uniform1f(heightHandle, canvas.height);
      gl.uniform1i(srcDataHandle, 2);  // texture unit 0
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, sceneTexture);

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
