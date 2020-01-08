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
  var animate = false;
  var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.3};
  var isMouseDown = false;
  //Distance of planet
  var scale = 0.03;
  //Thickness of the atmosphere
  var thickness = 100000.0;

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
  gui.add(this, 'time').min(-0.2).max(6.283).step(0.0001).listen().onChange(function(value){gl.uniform1f(timeHandle, time);});
  gui.add(this, 'thickness').min(0.0).max(1000000.0).step(100.0).onChange(function(value){gl.uniform1f(thicknessHandle, thickness);});
  gui.add(this, 'animate');
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
    uniform float width;
    uniform float height;
    uniform vec2 mouse;
    uniform float time;
    uniform sampler2D cloudShapeTexture;
    uniform sampler2D cloudDetailTexture;

  //#define VOLUME_TEXTURES
  #define NOISE_TEXTURES

  //#define HD

  const float PI = 3.141592;

  // Cloud parameters
  const float PLANET_RADIUS = 6300e3;
  const float CLOUD_START = 800.0;
  const float CLOUD_HEIGHT = 600.0;

  //const vec3 SUN_POWER = vec3(1.0,0.2,0.1) * 720.;
  const vec3 SUN_POWER = vec3(1.0 * 720.0);
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

  // Noise generation functions (by iq)
  float hash( float n )
  {
    return fract(sin(n)*43758.5453);
  }

  float hash( vec2 p ) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
  }

  float noise( in vec3 x ){
    vec3 p = floor(x);
    vec3 f = fract(x);
    //cubic smoothing, to give the noise that rounded look
    f = f*f*(3.0-2.0*f);
    //This is hardcoded for the specific texture on shadertoy where 
    //G and A channels are R and B translated by (37.,17.) 
    //The 2D texture is an atlas of slices of a 3D noise
    vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
    vec2 rg = vec2(0.0);// texture2D(cloudDetailTexture, (uv+0.5)/256.0).yx;
    return mix( rg.x, rg.y, f.z );
  }

  float noise( in vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );
    //cubic smoothing, to give the noise that rounded look
    f = f*f*(3.0-2.0*f);
//#ifdef NOISE_TEXTURES
    //return texture2D(iChannel3, (i+f+vec2(0.5))/64.0, 0.0).x*2.0 -1.0;
//#else    
    return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ), 
	  hash( i + vec2(1.0,0.0) ), f.x),
	  mix( hash( i + vec2(0.0,1.0) ), 
	  hash( i + vec2(1.0,1.0) ), f.x), f.y);
//#endif
  }

  //Fractal brownian motion
  //Remove matrix
  float fbm( vec3 p ){
    //Matrix rotation probably unnecessary for clouds
    mat3 m = mat3( 0.00,  0.80,  0.60,
	-0.80,  0.36, -0.48,
	-0.60, -0.48,  0.64 );    
    float f;
    //Octave increases by 2.0N times is apparently to avoid small repetition artefacts
    f  = 0.5000*noise( p ); //p = m*p*2.02;
    p = p * 2.02;
    f += 0.2500*noise( p ); //p = m*p*2.03;
    p = p * 2.03;
    f += 0.1250*noise( p );
    return f;
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

  //Get density and cloud height at sample point
  float clouds(vec3 p, out float cloudHeight, bool fast){

    //Height of point above the ground
    float atmoHeight = length(p - vec3(0.0, -PLANET_RADIUS, 0.0)) - PLANET_RADIUS;

    //What fraction through the shell is the point situated
    cloudHeight = clamp((atmoHeight-CLOUD_START)/(CLOUD_HEIGHT), 0.0, 1.0);

    //Move cloudscape
    //p.z += time*10.3;

    //General density of clouds from Worley texture
    float largeWeather = 0.4*(texture2D(cloudShapeTexture, 0.0001*p.xz).r - 0.4);
    return largeWeather;
    //Move cloudscape
    //p.x += time*8.3;

    //Add another octave to largeWeather for smaller details
    float weather = largeWeather*max(0.0, texture2D(cloudShapeTexture, p.zx).x);

    //Round/fade the top and bottom of the clouds
    weather *= smoothstep(0.0, 0.5, cloudHeight) * smoothstep(1.0, 0.5, cloudHeight);

    //A function to further shape the clouds. Create your own to control visuals
    float cloudShape = pow(weather, 0.3+1.5*smoothstep(0.2, 0.5, cloudHeight));

    //Early exit from empty space
    if(cloudShape <= 0.0){
      return 0.0;    
    }

    //Moving details on cloud surface
    //p.x += time*12.3;

    //Carving clouds out of large slabs (p * 0.01)
    float den = cloudShape-0.7*fbm(p*.01);

    //Early exit from empty space
    if(den <= 0.0){
      return 0.0;
    }

    if(fast){
      return largeWeather*0.2*min(1.0, 5.0*den);
    }

    //Moving details on cloud surface
    //p.y += time*15.2;

    //Carving details out of clouds
    den = max(0.0, den-0.2*fbm(p*0.05));

    return largeWeather*0.2*min(1.0, 5.0*den);

  }

  float HenyeyGreenstein(float g, float costh){
    return (1.0 - g * g) / (4.0 * 3.1415 * pow(1.0 + g*g - 2.0*g*costh, 1.5));
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
//WEBGL-NOISE FROM https://github.com/stegu/webgl-noise

//Description : Array and textureless GLSL 2D simplex noise function. Author : Ian McEwan, Ashima Arts. Maintainer : stegu Lastmod : 20110822 (ijm) License : Copyright (C) 2011 Ashima Arts. All rights reserved. Distributed under the MIT License. See LICENSE file. https://github.com/ashima/webgl-noise https://github.com/stegu/webgl-noise

vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec2 mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec3 permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);} float snoise(vec2 v){const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v -   i + dot(i, C.xx); vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m ; m = m*m ; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g);}
//END NOISE
  float lightRay(vec3 p, float phaseFunction, float dC, float mu, vec3 sunDitection, float cloudHeight, bool fast){

    const int nbSampleLight = 7;//fast ? 7 : 3;
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
#ifdef HD
    p += sunDitection*stepL*hash(dot(p, vec3(12.256, 2.646, 6.356)));
#endif


    //Collect total density along light ray
    for(int j=0; j<nbSampleLight; j++){
      float cloudHeight;
      lighRayDen += clouds(p + float(j) * stepL, cloudHeight, fast);
    }    

    if(fast){
      return (0.5*exp(-0.4*stepL*lighRayDen) + max(0.0, -mu*0.6+0.3) * exp(-0.02*stepL*lighRayDen))*phaseFunction;
    }

    float scatterAmount = mix(0.008, 1.0, smoothstep(0.96, 0.0, mu));

    //Fake multiple scattering by combining multiple scattering octaves with
    //reduced strength. Modulate wrt. view/time direction
    //This is very much artistic and can be played around with
    //Discussed in Frostbite paper, credited to Wrenninge et al.
    float beersLaw = exp(-stepL*lighRayDen)
      + 0.5 * scatterAmount * exp(-0.1  * stepL * lighRayDen)
#ifndef HD
      + 2.0 * scatterAmount * exp(-0.1  * stepL * lighRayDen)
#endif
      + 0.4 * scatterAmount * exp(-0.02 * stepL * lighRayDen);

    //Return product of Beer's law and phase function
    //The rest is some height based brightness modulation which is probably very bespoke
    return beersLaw * phaseFunction * mix(0.05 + 1.5 * pow(min(1.0, dC * 8.5), 0.3 + 5.5 * cloudHeight), 1.0, clamp(lighRayDen*0.4, 0.0, 1.0));
  }


  vec3 skyRay(vec3 org, vec3 dir, vec3 sunDitection, bool fast){

    //return 12.5 * vec3(dot(dir, vec3(1.0, 0.0, 0.0)));
    //The limits of the cloud shell
    const float ATM_START = PLANET_RADIUS+CLOUD_START;
    const float ATM_END = ATM_START+CLOUD_HEIGHT;

    const int nbSample = 13;//fast ? 13 : 21;   
    vec3 color = vec3(0.0);

#ifdef HD
    nbSample = 128;
#endif

    //Limits of the ray within the cloud shell
    float distToAtmStart = intersectSphere(org, dir, vec3(0.0, 0.0, 0.0), ATM_START);

    float distToAtmEnd = intersectSphere(org, dir, vec3(0.0, 0.0, 0.0), ATM_END);

    //The point at which the ray enters the cloud shell
    vec3 p = org + distToAtmStart * dir;    
    //Step size
    float stepS = (distToAtmEnd-distToAtmStart) / float(nbSample); 

    //Variable to track transmittance along view ray
    float totalTransmittance = 1.0;    

    float mu = dot(sunDitection, dir);

    //Curve fitted to a Mie plot
    float phaseFunction = numericalMieFit(mu);
    //float phaseFunction = HenyeyGreenstein(0.3, mu);

    //Introduce noise to eliminate banding/layering artefacts
    p += dir*stepS*hash(dot(dir, vec3(12.256, 2.646, 6.356)));

    //If view direction pointing up
    if(dir.y > 0.015){
      for(int i=0; i<nbSample; i++){

	float cloudHeight;

	//Get density and cloud height at sample point
	float density = clouds(p, cloudHeight, fast);

	//If there is a cloud at the sample point
	if(density > 0.0 ){

	  //Temporary hack for timelight to cycle from white to orange
	  vec3 time = SUN_POWER * (mix(vec3(1.0), vec3(1.0, 0.2, 0.05), 1.0-(0.5 + 0.5 * sin(time * 0.5))));

	  //Lighten dark shadows at the bottom of clouds
	  vec3 ambient = mix(vec3(3.0), vec3(10.0), (0.5 + 0.5 * sin(time * 0.5)));
	  //(0.5 + 0.6*cloudHeight)*vec3(1)*6.5 + vec3(1.) * max(0.0, 1.0-2.0*cloudHeight);


	  //Amount of timelight that reaches the sample point through the cloud
	  vec3 luminance = ambient + time * lightRay(p, phaseFunction, density, mu, sunDitection, cloudHeight, fast);        	

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

    vec3 background = 6.0*mix(vec3(0.2, 0.52, 1.0),vec3(0.8, 0.95, 1.0), pow(0.5+0.5*mu, 15.0))
      + mix(vec3(3.5), vec3(0.0), min(1.0, 2.3*dir.y));

    if(!fast){
      //Draw time
      background += totalTransmittance * vec3(1e4*smoothstep(0.9998, 1.0, mu));
    }

    color += background * totalTransmittance;

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

    vec3 cameraPos = vec3(0.0, PLANET_RADIUS + 1.0, 0.0);

    vec3 sunDirection = vec3(0.0, sin(time), -cos(time));

    vec3 targetDir = vec3(sin(mouseRelative.x), mouseRelative.y, -cos(mouseRelative.x));

    vec3 up = vec3(0.0, 1.0, 0.0);

    //---------------------------------------------------

    //Get the view matrix from the camera orientation
    mat3 viewMatrix = lookAt(cameraPos, targetDir, up);

    //Transform the ray to point in the correct direction
    rayDir = normalize(viewMatrix * rayDir);
    vec3 color = vec3(0.0);

    color = skyRay(cameraPos, rayDir, sunDirection, false); 

    //Why is the returned colour so bright?
    vec3 col = 0.1 * color;// 1.0-exp(-vec3(0.08 * color));

    vec3 p = cameraPos + rayDir;
    //col = vec3(texture2D(cloudShapeTexture, p.xz).r);

    col = 1.0-exp(-col);
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
//
function loadTexture(gl, texture, url, level) {
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([255, 0, 0, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      width, height, border, srcFormat, srcType,
      pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
	srcFormat, srcType, image);

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
var texture = gl.createTexture();
var texture2 = gl.createTexture();
loadTexture(gl, texture, 'https://al-ro.github.io/images/lighting/diffuse.jpg', 0);
  //gl.activeTexture(gl.TEXTURE1);
//loadTexture(gl, texture2, 'https://al-ro.github.io/images/lighting/specular.jpg', 1);

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
    //Create vertex and fragment shaders
    var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
    var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    //Create shader programs
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

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
    var thicknessHandle = getUniformLocation(program, 'thickness');
    var shapeTextureHandle = gl.getUniformLocation(program, "cloudShapeTexture");
    var detailTextureHandle = gl.getUniformLocation(program, "cloudDetailTexture");
gl.uniform1i(shapeTextureHandle, 0);
gl.uniform1i(detailTextureHandle, 0);

    gl.uniform1f(widthHandle, canvas.width);
    gl.uniform1f(heightHandle, canvas.height);
    gl.uniform2f(mouseHandle, mousePosition.x, mousePosition.y);
    gl.uniform1f(scaleHandle, scale);
    gl.uniform1f(timeHandle, time);
    gl.uniform1f(thicknessHandle, thickness);
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
      gl.uniform2f(mouseHandle, pos.x, pos.y);
    }
  }

  function onScroll(event){
    event.preventDefault();
    scale += event.deltaY * 0.001;

    scale = Math.min(Math.max(0.0, scale), 5.0);
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

  //************** Draw **************
  var lastFrame = Date.now();
  var thisFrame;
  
  function draw(){
    stats.begin();
  
    //Update time
    thisFrame = Date.now();
    if(animate){
      animateSun((thisFrame - lastFrame)/3000);	
    }
    lastFrame = thisFrame;

    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    stats.end();
    requestAnimationFrame(draw);
  }
  draw();
}
