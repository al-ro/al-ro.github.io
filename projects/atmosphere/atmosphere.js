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

  //Sun
  var elevation = 0.3;
  var azimuth = 1.0;

  //View direction
  //Left/right in range [0; 2*PI]
  var yaw = Math.PI; 
  //Up/down in range [-PI/2; PI/2]
  var pitch = -0.12;

  var cameraPosition = {x: 0, y: 0, z: 0};
  var upVector = {x: 0, y: 1, z: 0};
  var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.0};
  var mouseDelta = {x: 0, y: 0};
  var viewDirection = {x: Math.sin(yaw), y: Math.sin(pitch),  z: Math.cos(yaw)};
  var viewMatrix = [{x: 1, y: 0, z: 0}, 
		    {x: 0, y: 1, z: 0}, 
		    {x: 0, y: 0, z: 1}];
  var isMouseDown = false;

  //Distance of planet
  var scale = 1.5;

  //Thickness of the atmosphere
  var thickness = 100000.0;

  stats = new Stats();
  stats.showPanel(0);
  stats.domElement.style.position = 'relative';
  stats.domElement.style.bottom = '48px';

  if(!mobile){
    document.getElementById('canvas_container').appendChild(stats.domElement);
  }

  function getViewMatrixAsArray(){
    var array = [];
    for(i = 0; i < 3; i++){
      array.push(viewMatrix[i].x);
      array.push(viewMatrix[i].y);
      array.push(viewMatrix[i].z);
    }
    return array;
  }

  function normalize(v){
    var length = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    return {x: v.x/length, y: v.y/length, z: v.z/length};
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

  function updateSunPosition(){
    gl.uniform3f(sunPositionHandle, Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));
  }

  //****************** GUI *********************
  var gui = new dat.GUI({ autoPlace: false });
  var customContainer = document.getElementById('gui_container');
  if(!mobile){
    customContainer.appendChild(gui.domElement);
  }
  gui.add(this, 'azimuth').min(0.0).max(Math.PI*2.0).step(0.01).listen().onChange(function(value){updateSunPosition();});
  gui.add(this, 'elevation').min(-Math.PI/2.0).max(Math.PI/2.0).step(0.01).listen().onChange(function(value){updateSunPosition();});
  gui.add(this, 'thickness').min(0.0).max(1000000.0).step(100.0).onChange(function(value){gl.uniform1f(thicknessHandle, thickness);});
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
    uniform float scale;
    uniform float thickness;
    uniform vec3 sunPosition;
    uniform vec3 cameraPosition;
    uniform mat3 viewMatrix;
    vec2 resolution = vec2(width, height);
   
    #define PI 3.1415
    
    //Measurements for Earth seen in literature
    #define PLANET_RADIUS 6371e3
    #define ATMOSPHERE_THICKNESS thickness
    #define ATMOSPHERE_RADIUS float(PLANET_RADIUS + ATMOSPHERE_THICKNESS)
     
    #define WITH_OZONE
    
    #ifdef WITH_OZONE
    //From "Physically Based Sky..."
    #define BETA_RAYLEIGH vec3(vec3(5.47e-6, 1.28e-5, 3.12e-5) + vec3(3.426, 8.298, 0.356) * 0.06 * 1e-5)
    
    #else
    
    //https://www.shadertoy.com/view/wlBXWK uses vec3(5.5e-6, 13.0e-6, 22.4e-6) which looks better
    #define BETA_RAYLEIGH vec3(5.47e-6, 1.28e-5, 3.12e-5)
    
    #endif
    
    #define BETA_MIE 2.1e-6
    #define SCALE_HEIGHT_RAYLEIGH float(0.085 * ATMOSPHERE_THICKNESS)
    #define SCALE_HEIGHT_MIE float(0.012 * ATMOSPHERE_THICKNESS)
    
    #define STEPS_PRIMARY 32
    #define STEPS_LIGHT 8
  
  
    //https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
    mat3 lookAt(vec3 camera, vec3 targetDir, vec3 up){
      vec3 zaxis = normalize(targetDir);    
      vec3 xaxis = normalize(cross(zaxis, up));
      vec3 yaxis = cross(xaxis, zaxis);

      return mat3(xaxis, yaxis, -zaxis);
    }

    vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
      vec2 xy = fragCoord - resolution.xy / 2.0;
      float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
      return normalize(vec3(xy, -z));
    }

    //Return the near and far intersections of an infinite ray and a sphere. 
    //Assumes sphere at origin. No intersection if result.x > result.y
    vec2 sphereIntersect(vec3 start, vec3 dir, float radius){
      float a = dot(dir, dir);
      float b = 2.0 * dot(dir, start);
      float c = dot(start, start) - (radius * radius);
      float d = (b*b) - 4.0*a*c;
      if (d < 0.0){
	return vec2(1e5, -1e5);
      }
      return vec2((-b - sqrt(d))/(2.0*a), (-b + sqrt(d))/(2.0*a));
    }

    //Surface colour for planet
    vec3 renderPlanet(vec3 cameraPos, vec3 rayDir, vec3 lightDir, vec2 rayPlanetIntersect){

      float diff = dot(normalize(cameraPos + normalize(rayDir) * rayPlanetIntersect.x), lightDir); 
      if(diff < 0.0){
	return vec3(0.0);
      }
      return diff * vec3(0.2, 0.2, 0.2);
    }

    //Return colour of the atmosphere or black, if the ray points to space
    vec3 getSkyColour(vec3 cameraPos, vec3 rayDir, float maxDist, vec3 lightDir){
      vec3 col = vec3(0.0);

      vec2 rayAtmosphereIntersect = sphereIntersect(cameraPos, rayDir, ATMOSPHERE_RADIUS);
      vec2 rayPlanetIntersect = sphereIntersect(cameraPos, rayDir, PLANET_RADIUS);  

      //Does the ray point into the atmosphere and the planet
      bool hitsAtmosphere = (rayAtmosphereIntersect.x <= rayAtmosphereIntersect.y) && rayAtmosphereIntersect.x > 0.0;  
      bool hitsPlanet = (rayPlanetIntersect.x <= rayPlanetIntersect.y) && rayPlanetIntersect.x > 0.0;

      //Is the camera inside the atmosphere
      bool inAtmosphere = length(cameraPos) < ATMOSPHERE_RADIUS;

      //If the ray hits the atmosphere or if the camera is in the atmosphere
      if(hitsAtmosphere || inAtmosphere){

	//The start and end points of the ray 
	float start;
	float end;

	if(inAtmosphere){
	  //In the atmosphere, the ray starts at the camera
	  start = 0.0;
	}else{
	  //In space, the ray starts at the near intersection with the atmosphere 
	  start = rayAtmosphereIntersect.x;
	}

	//The ray ends at either the near intersection with the planet 
	//or the far intersection with the atmosphere
	if(hitsPlanet){ 
	  end = rayPlanetIntersect.x;
	}else{	
	  end = rayAtmosphereIntersect.y;
	}

	//Get the length of each segment
	float rayLength = end - start;
	float stepSize = rayLength / float(STEPS_PRIMARY);

	//Total Rayleigh and Mie scattering. SUM(attn * rho(h))ds
	vec3 totalRayleigh = vec3(0.0);
	vec3 totalMie = vec3(0.0);

	//Total Rayleigh and Mie optical depth. D(PA)+D(CP)
	float opticalDepthRayleigh = 0.0;
	float opticalDepthMie = 0.0;

	//Density rho(h) at sample point
	float densityRayleigh = 0.0;
	float densityMie = 0.0;

	vec3 startPos = cameraPos + rayDir * start;

	//Step along the ray from start to end and accumulate the total optical depth. 
	//By collecting the densities along the ray, and the light rays to the sample points, 
	//we find how much material the light has travelled through to reach the camera.
	for(int i = 0; i < STEPS_PRIMARY; i++){

	  //Get position along ray. This is the middle point of the current segment
	  vec3 pos_i = startPos + rayDir * (float(i) * stepSize + 0.5 * stepSize);

	  //Get height of point above surface
	  float height_i = max(0.0, length(pos_i) - PLANET_RADIUS);

	  //Density at point
	  densityRayleigh = exp(-height_i / SCALE_HEIGHT_RAYLEIGH) * stepSize;
	  densityMie = exp(-height_i / SCALE_HEIGHT_MIE) * stepSize;

	  //Accumulate total optical depth
	  opticalDepthRayleigh += densityRayleigh;
	  opticalDepthMie += densityMie;

	  //Find the ray to light
	  float stepSizeLight = sphereIntersect(pos_i, lightDir, ATMOSPHERE_RADIUS).y / float(STEPS_LIGHT);

	  //Total Rayleigh and Mie optical depth for light ray
	  float opticalDepthRayleighLight = 0.0;
	  float opticalDepthMieLight = 0.0;

	  //To discard contributions from points too far in the shadow of the planet,
	  //test the light ray against collision with a sphere 95% of the planet size.
	  //Testing with the actual planet size leads to band artifacts at sunset.
	  vec2 lightRayPlanetIntersect = sphereIntersect(pos_i, lightDir, PLANET_RADIUS * 0.95);  
	  bool hitsPlanetLight = (lightRayPlanetIntersect.x <= lightRayPlanetIntersect.y) && lightRayPlanetIntersect.x > 0.0;

	  if(!hitsPlanetLight){
	    //Travel from sample point towards the light, stopping at where it enters the atmosphere
	    for(int j = 0; j < STEPS_LIGHT; j++){

	      //Get position along ray. This is the middle point of the current light segment
	      vec3 pos_j = pos_i + lightDir * (float(j) * stepSizeLight + 0.5 * stepSizeLight);

	      //Get height of point above surface
	      float height_j = max(0.0, length(pos_j) - PLANET_RADIUS);

	      //Add density at point to light total
	      opticalDepthRayleighLight += exp(-height_j / SCALE_HEIGHT_RAYLEIGH) * stepSizeLight;
	      opticalDepthMieLight += exp(-height_j / SCALE_HEIGHT_MIE) * stepSizeLight;
	    }

	    //Amount of light that makes it to the main sample point
	    vec3 attenuation = exp(-(BETA_RAYLEIGH * (opticalDepthRayleigh + opticalDepthRayleighLight) + (BETA_MIE * (opticalDepthMie + opticalDepthMieLight))));
	    //Accumulate total scattering
	    totalRayleigh += densityRayleigh * attenuation;
	    totalMie += densityMie * attenuation;
	  }

	}

	//Stop Mie scattering from shining through the planet
	if(hitsPlanet){
	  totalMie = vec3(0.0);
	}

	float mu = dot(rayDir, lightDir);
	float mumu = mu * mu;
	float phaseRayleigh = 3.0 / 50.2654824574 * (1.0 + mumu);
	float g = 0.999;
	float gg = g * g;
	float phaseMie = 3.0 / (25.1327412287) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg));

	col += phaseRayleigh * BETA_RAYLEIGH * totalRayleigh + phaseMie * BETA_MIE * totalMie;
      }
      return col;
    }

    float getGlow(float dist, float radius, float intensity){
      dist = max(dist, 1e-6);
      return pow(radius/dist, intensity);	
    }
  
    void main(){
  
      //Get the default direction of the ray (along the negative z direction)
      vec3 rayDir = rayDirection(50.0, gl_FragCoord.xy);
  
      vec3 cameraPos = cameraPosition;
      cameraPos.y = PLANET_RADIUS + 1.0;
      cameraPos.z = PLANET_RADIUS * scale;
  
      vec3 sunDirection = normalize(sunPosition);
  
      //Transform the ray to point in the correct direction
      rayDir = normalize(viewMatrix * rayDir);
  
      vec2 rayPlanetIntersect = sphereIntersect(cameraPos, rayDir, PLANET_RADIUS);
  
      vec3 col;
  
      if((rayPlanetIntersect.x <= rayPlanetIntersect.y) && rayPlanetIntersect.x > 0.0){
        col = renderPlanet(cameraPos, rayDir, sunDirection, rayPlanetIntersect);
      }else{
	float mu = dot(rayDir, sunDirection);
	col += getGlow(1.0-mu, 0.00005, 1.4);
      }
  
      col += 40.0*getSkyColour(cameraPos, rayDir, 1e12, sunDirection);
 
      //Tone mapping
      col = 1.0 - exp(-col);
      //Gamma correction 1.0/2.2 = 0.4545...
      col = pow(col, vec3(0.4545));
  
      // Output to screen
      gl_FragColor = vec4(col,1.0);
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
    var widthHandle = getUniformLocation(program, 'width');
    var heightHandle = getUniformLocation(program, 'height');
    var viewMatrixHandle = getUniformLocation(program, 'viewMatrix');
    var cameraPositionHandle = getUniformLocation(program, 'cameraPosition');
    var scaleHandle = getUniformLocation(program, 'scale');
    var thicknessHandle = getUniformLocation(program, 'thickness');
    var sunPositionHandle = getUniformLocation(program, 'sunPosition');

    viewMatrix = lookAt(cameraPosition, viewDirection, upVector);

    gl.uniform1f(widthHandle, canvas.width);
    gl.uniform1f(heightHandle, canvas.height);
    gl.uniform1f(scaleHandle, scale);
    gl.uniform1f(thicknessHandle, thickness);
    gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    gl.uniformMatrix3fv(viewMatrixHandle, false, getViewMatrixAsArray());
    gl.uniform3f(sunPositionHandle, Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));
  }
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
      mouseDelta.x = lastPos.x - pos.x;
      mouseDelta.y = lastPos.y - pos.y;
      
      updateViewDirection(mouseDelta);
      viewMatrix = lookAt(cameraPosition, viewDirection, upVector);
      gl.uniformMatrix3fv(viewMatrixHandle, false, getViewMatrixAsArray());
      lastPos.x = pos.x;
      lastPos.y = pos.y;
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


  //************** Draw **************
  
  function draw(){
    stats.begin();

    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    stats.end();
    requestAnimationFrame(draw);
  }
  draw();
}
