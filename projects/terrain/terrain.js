//Ray marching
//Features: domain manipulation, sdf operations, floor plane, Phong shading, soft shadows, 
//	    ambient occlusion, reflection, smooth union, material, colour interpolation

//Based on 
//http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
//https://www.iquilezles.org/www/index.htm
//https://www.youtube.com/watch?v=PGtv-dBi2wE
//https://www.youtube.com/playlist?list=PL3POsQzaCw53iK_EhOYR39h1J9Lvg-m-g

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
  var time = 0.0;
  var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.3};
  var isMouseDown = false;

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
  
  uniform float time;

  uniform float width;
  uniform float height;
  vec2 resolution = vec2(width, height);
  uniform vec2 mouse;

//Ray marching terrain based on several examples: 
//https://iquilezles.org/www/articles/terrainmarching/terrainmarching.htm
//http://iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
//https://iquilezles.org/www/articles/outdoorslighting/outdoorslighting.htm
//https://iquilezles.org/www/articles/fog/fog.htm
//https://www.shadertoy.com/view/lslfRN
//https://www.shadertoy.com/view/MdX3Rr
//http://www.kevs3d.co.uk/dev/shaders/
//https://www.decarpentier.nl/scape-procedural-basics

//Terrain:	FBM of noise with some octaves inverted. Amplitude and frequency changes are from 
//			experimenting and examples. A rotation each iteration gives more variety
//			as seen in multiple examples. Normals are found by sampling around the 
//			intersection point. The Y component is set to 2.0*OFFSET. 
//			The normal sampling uses more FBM iterations to get sharper looking results and 
//			the sampling offset depends on the ray distance
//Marching:	Steps are limited by number and maximum distance. The step size is a fraction
//			of the difference between the last sample point height and the terrain height
//			at those coordinates. The fraction can be changed to better capture ridges 
//			depending on the terrain parameters. Once a sample point is under the terrain,
//			a bisection method is used to move the sample backwards and forwards to find
//			the 0 crossing in a binary search. Return value within EPSILON of surface or
//			best approximation after a set number of iterations.
//Textures:	The rock texture is noise FBM with offset height-based stripes. Close range rock
//			also has fine noise texture. Snow is a plain white colour on slopes facing 
//			upward. The snow boundary is offset by noise to avoid straight lines.
//Lighting:	Three lights based on iq article. Strong white light from the sun. Soft shadows
//			using ray marching. Sky light is a blueish light directly from above. A third
//			white light is used to simulate indirect lighting in a very bright environment.
//			Includes tinted fog to give a sense of scale.


//WEBGL-NOISE FROM https://github.com/stegu/webgl-noise

//Description : Array and textureless GLSL 2D simplex noise function. Author : Ian McEwan, Ashima Arts. Maintainer : stegu Lastmod : 20110822 (ijm) License : Copyright (C) 2011 Ashima Arts. All rights reserved. Distributed under the MIT License. See LICENSE file. https://github.com/ashima/webgl-noise https://github.com/stegu/webgl-noise

vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec2 mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;} vec3 permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);} float snoise(vec2 v){const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v -   i + dot(i, C.xx); vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m ; m = m*m ; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g);}
//END NOISE


const int MAX_STEPS = 50;
const float MAX_DIST = 3000.0;
const float EPSILON = 1e-4;
const float OFFSET = 2e-2;
const float PI = 3.1415;
const int SHADOW_STEPS = 64;
//e.g. 8.0: soft, 128: hard
const float SHADOW_SHARPNESS = 16.0;
const float HEIGHT = 200.0;
const float SCALE = 0.005;

const int terrainLimit = 5;
const int normalLimit = 9;
const int cameraLimit = 2;

const vec3 skyColour = 0.3 * vec3(0.09, 0.33, 0.81);
const vec3 sunLightColour = vec3(1);
const vec3 sunColour = vec3(1.0, 1.0, 0.8);
const vec3 specularColour = vec3(1);

const float speed = 10.0;

//In a circle of 2*PI
const float sunLocation = 1.633;
//0: horizon, 1: zenith
const float sunHeight = 0.2;

vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 xy = fragCoord - resolution.xy / 2.0;
    float z = resolution.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

//https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
mat3 lookAt(vec3 camera, vec3 targetDir, vec3 up){
  vec3 zaxis = normalize(targetDir);    
  vec3 xaxis = normalize(cross(zaxis, up));
  vec3 yaxis = cross(xaxis, zaxis);

  return mat3(xaxis, yaxis, -zaxis);
}

//Darken sky when looking up
vec3 getSkyColour(vec3 rayDir){
    return mix(skyColour, 0.2*skyColour, rayDir.y);
}

//By iq
float noised(vec2 x ){
return snoise(x*0.01);
/*
    vec2 f = fract(x);
    vec2 u = f*f*(3.0-2.0*f);
  
    vec2 p = floor(x);
	float a = textureLod( iChannel0, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
	float b = textureLod( iChannel0, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
	float c = textureLod( iChannel0, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
	float d = textureLod( iChannel0, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;
    
	float res = (a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y);
    res = res - 0.5;
    return res;
*/
}

float fbm(vec3 pos, int limit){
    float res = 0.0;
    float freq = 1.72;
    float amp = 0.5;
    for(int i = 0; i < 9; i++){ 
        if(i == limit){break;}
        if(i < 3){
        	res += (1.0-abs(noised(freq*0.5*pos.xz)))*amp*2.5;
        }else{ 
        	res += noised(freq*pos.xz)*amp;
        }
        freq *= 2.5;
        amp *= 0.25;
        pos.xz *= mat2(1, -.75, .75, 1);
    }
	return res;
}

//Get height of terrain at xz coordinates
float getHeight(vec3 pos, int limit){
    return HEIGHT*fbm(SCALE*pos, limit);
}

//Binary search for 0 crossing given two points on either side of the surface
float bisection(vec3 start, vec3 rayDir, float near_, float far_){
    float midpoint = (far_ + near_) * 0.5;
    //Sample point
    vec3 p = vec3(0);
    float near = near_;
    float far = far_;
    float height = 0.0;
    //Difference between sample point and terrain heights
    float diff = 0.0;
    
    for(int i = 0; i < 8; i++){
        p = start + rayDir * midpoint;
        height = getHeight(p, terrainLimit);
        diff = p.y - height;
        
        if(abs(diff) < EPSILON){
        	break;
        }else{
            
            if(diff < EPSILON){
                //Point is below terrain
                //Search first half
                far = midpoint;
            }else{
                //Point is above terrain
                //Search second half
                near = midpoint;
            }
            midpoint = (far + near) * 0.5;
        }
    }
    return midpoint;
}

float getIntersection(vec3 start, vec3 rayDir, float maxDist){
	//Distance between sample points. Set according to previous sample
    float stepSize = 0.0;
    //Height of the terrain
    float height = 0.0;
    //Length of the ray
    float dist = 0.0;
    //Difference between sample point and terrain heights
    float diff = 0.0;
    
    for(int i = 0; i < MAX_STEPS; i++){
        //Sample point
        vec3 p = start + rayDir * dist;
        
        //The height of the terrain at the xz coordinates of the sample point
        height = getHeight(p, terrainLimit);
        diff = abs(p.y - height);
        //If sample point is close enough to the terrain, return distance
        if(diff < EPSILON){
            return dist;
        }
        //If height of sample point is less than the height of the terrain,
        //the ray has hit the terrain. Use bisection to find the 0 crossing
        if(p.y < height){
        	dist = bisection(start, rayDir, dist - stepSize, dist);
            return dist;
        }
        
        //Static step size misses features and leads to banding. 
        //Set the step size to a fraction of the distance above the terrain.
        //Could also have a small step size which increases with distance, giving 
        //detailed results close to the camera and reaching far. However, 
        //this approach is used in many shaders and seems to give best results
        stepSize = diff * 0.5;
        
        //Increment ray
        dist += stepSize;
        
        if(dist > MAX_DIST){
        	return MAX_DIST;
        }
    }
    return dist;
}

//http://iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
//Making the normal sample distance depend on the ray length leads to less noise
vec3 getNormal(vec3 p, float t){
    float eps = 0.001 * t;

    return normalize(vec3( 
        getHeight(vec3(p.x-eps, p.y, p.z), normalLimit) 
        - getHeight(vec3(p.x+eps, p.y, p.z), normalLimit),
        
        2.0*eps,
        
        getHeight(vec3(p.x, p.y, p.z-eps), normalLimit) 
        - getHeight(vec3(p.x, p.y, p.z+eps), normalLimit) 
    ));
}

//https://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
float softShadow(vec3 pos, vec3 rayDir){
    float res = 1.0;
    float t = 1.0;
    //float ph = 1e10;
    //Start some small distance away from the surface to avoid artifacts
    pos += rayDir * 5.0 * t;
	for(int i = 0; i < SHADOW_STEPS; i++){
	    vec3 p = pos + t * rayDir;
        if(p.y > 2.0*HEIGHT){
        	break;
        }
        float h = p.y - getHeight(p, terrainLimit);
		res = min(res, SHADOW_SHARPNESS * h / t );
        /*
		//An improved shadow approach that didn't quite work
        float y = h*h/(2.0*ph);
        float d = sqrt(h*h-y*y);
        res = min( res, SHADOW_SHARPNESS*d/max(0.0,t-y) );
        ph = h;
		*/
		t += h;
        if(res < EPSILON){
            break;
        }
	}
	return clamp(res, 0.0, 1.0);
}

float rockFbm(vec3 p, vec3 normal, float dist){
    
    float res = 0.0;
    float freq = 0.005;
    float amp = 0.5;
    
    //When close to the rock, add fine detail. 
    //Showing it at all distances introduces noise and shimmering.
    if(dist < 80.0){
    	float detail = smoothstep(75.0, 0.0, dist);
    	res += detail*noised(40.0*p.xz);
    }
    
    //Offset position height in a large wavy pattern
    p.y += noised(0.02*p.xz) * 150.0;
    
    //Add several horizontal lines (offset by the above) for layers
    for(int i = 0; i < 4; i++){
    	//res += texture(iChannel0, freq * p.yy).r * amp;
	res += snoise(freq * p.yy) * amp;
        freq *= 1.5;
        amp *= 0.5;
    }    
    
    return clamp(res, 0.0, 1.0);
}
//Return colour of surface fragment based on light information
vec3 shading(vec3 position, vec3 normal, vec3 rayDir, float dist, vec3 lightDirection){
    
    float ambientStrength = 0.15;
    
    float specularStrength = 0.0;
    float shininess = 32.0;
    
    vec3 ambientColour = vec3(0);
    vec3 diffuseColour = vec3(0);
    
    //Offset the height of the position to give snow line a more organic border.
    float height = position.y + noised( 0.2 * position.xz) * 14.0;
	bool snow = false;
    //Snow occurs on horizontal enough areas
    if(((normal.y > 0.65)) || ((height > HEIGHT*1.55) && (normal.y > 0.5))){
        snow = true;
    	ambientColour = vec3(1);
        diffuseColour = vec3(1);
        //Make snow subtly specular
        specularStrength = 0.2;
    }
    
    if(!snow){
        //Colour rock by layering noise. 
    	//Add dark brown and grey lines and finer detail in close proximity
    	vec3 rockColour = mix(0.25*vec3(0.3, 0.2, 0.1), vec3(0.8), 
                              0.5 * rockFbm(position, normal, dist));
    	rockColour = mix(0.5*rockColour, vec3(0.3), 0.5);
    
        //Add darker blotches 
        if(normal.y < 0.5){
            rockColour *= 0.8;
        } 

        //Ambient colour slightly darker than diffuse
        ambientColour = 0.75*rockColour;
        diffuseColour = rockColour;
    }
    
	vec3 halfwayDir = normalize(lightDirection - rayDir);  
	float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);

	//Colour of light sharply reflected into the camera
	vec3 specular = spec * specularColour * sunLightColour; 
	
  	//Path to light blocked     
    float shadow = softShadow(position, lightDirection);
    
    //No specular reflections in shadow
    if(shadow < 0.75){
    	specularStrength = 0.0;
    }
    
	vec3 result = vec3(0.0); 
    
	//How much a fragment faces the sun
	float sun = max(dot(normal, lightDirection), 0.0);
    //Main sun
    vec3 sunLight = shadow * sun * sunLightColour;
    
    //How much the fragment faces up
    float sky = max(dot(normal, vec3(0,1,0)), 0.0);
    //Sky light. A blue light from directly above. A lighter blue than the sky.
	vec3 skyLight = sky * vec3(0.12, 0.29, 0.55);
    
    //Indirect light. A white light opposite to the sun direction simulates global 
    //illumination. Snow is very diffusely reflective and so valleys are not as dark. 
    //Also gives a nice scattering look to large snow banks.
    float indirect = max(dot(normal, normalize(vec3(-1.0, 0.0, -1.0) * lightDirection)), 0.0);
   	vec3 indirectLight = indirect * vec3(1.0);
    
    //Combine light
    result += 1.2 * sunLight;
    result += 0.2 * skyLight;
	result += 0.3 * indirectLight;
    
    //Light and material interaction
    result *= diffuseColour;
    result += ambientStrength * ambientColour + specularStrength * specular;
    
    
    return  result;
}

//https://iquilezles.org/www/articles/fog/fog.htm
vec3 applyFog(vec3  rgb, float dist, vec3 rayOri, vec3 rayDir, vec3 sunDir){
    //Make horizon more hazy
    if(dist == MAX_DIST){dist = 4000.0;}
    //Rate of fade
    float b = 0.014;
    float fogAmount = 1.0 * exp(-rayOri.y*b) * (1.0-exp(-dist*rayDir.y*b))/rayDir.y;
    float sunAmount = max( dot( rayDir, sunDir ), 0.0 );
    vec3  fogColor  = mix( vec3(0.5,0.6,0.7), vec3(1.0), pow(sunAmount, 8.0) );
    return mix(rgb, fogColor, fogAmount);
}

float getGlow(float dist, float radius, float intensity){
    dist = max(dist, 1e-6);
	return pow(radius/dist, intensity);	
}

//https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
//Thanks for the suggestion loicvdb
vec3 ACESFilm(vec3 x){
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main(){
    //Get the default direction of the ray (along the negative Z direction)
    vec3 rayDir = rayDirection(45.0, gl_FragCoord.xy);
      vec2 mouseRelative;
      mouseRelative.x = (mouse.x / resolution.x) * 2.0 - 1.0;
      mouseRelative.y = (mouse.y / resolution.y) * -2.0 + 1.0;
      mouseRelative.x *= PI;
    //----------------- Define a camera -----------------
    
    vec3 cameraPos = vec3(120.0, 40.0, -400.0 * time * speed);
    cameraPos.y = getHeight(cameraPos, cameraLimit) + 30.0;
    
    vec3 lightDirection = normalize(vec3(sin(sunLocation), sunHeight, cos(sunLocation)));
	
    vec3 targetDir = vec3(sin(mouseRelative.x), mouseRelative.y, -cos(mouseRelative.x));
    vec3 up = vec3(0.0, 1.0, 0.0);
    
    //---------------------------------------------------
    
    //Get the view matrix from the camera orientation
    mat3 viewMatrix = lookAt(cameraPos, targetDir, up);
    //Transform the ray to point in the correct direction
    rayDir = normalize(viewMatrix * rayDir);
    
    //Find the distance to where the ray stops
    float dist = getIntersection(cameraPos, rayDir, MAX_DIST);
    vec3 col;
    
    bool skyVisible = false;
    if(dist == MAX_DIST){
        skyVisible = true;
    	col = getSkyColour(rayDir);
    }else{
    	vec3 position = cameraPos + rayDir * dist;
    	vec3 normal = getNormal(position, dist);
		col = shading(position, normal, rayDir, dist, lightDirection);
    }
    
    col = applyFog(col, dist, cameraPos, rayDir, lightDirection);
    
    //Display the sun as a glow in the light direction
    if(skyVisible){
    	float mu = dot(rayDir, lightDirection);
    	col += sunColour*getGlow(1.0-mu, 0.00015, 0.9);
    }
   
    //Tonemapping
    col = ACESFilm(col);

    //Gamma correction 1.0/2.2 = 0.4545...
    col = pow(col, vec3(0.4545));
    
    //Output to screen
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

  gl.uniform1f(widthHandle, canvas.width);
  gl.uniform1f(heightHandle, canvas.height);
  gl.uniform1f(timeHandle, time);
  gl.uniform2f(mouseHandle, mousePosition.x, mousePosition.y);

  function getPos(canvas, evt){
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
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mousemove', mouseMove);

  //************** Draw **************

  var lastFrame = Date.now();
  var thisFrame;

  function draw(){
    stats.begin();

    //Update time
    thisFrame = Date.now();
    time += (thisFrame - lastFrame)/218000;	
    lastFrame = thisFrame;

    //Send time to program
    gl.uniform1f(timeHandle, time);
    //Draw a triangle strip connecting vertices 0-4
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    stats.end();
    requestAnimationFrame(draw);
  }
  draw();
}
