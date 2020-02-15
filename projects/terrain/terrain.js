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
//		experimenting and examples. A rotation each iteration gives more variety
//		as seen in multiple examples. Normals are found by sampling around the 
//		intersection point. The Y component is set to 2.0*OFFSET. 
//		The normal sampling uses more FBM iterations to get sharper looking results and 
//		the sampling offset depends on the ray distance
//
//Marching:	Steps are limited by number and maximum distance. The step size is a fraction
//		of the difference between the last sample point height and the terrain height
//		at those coordinates. The fraction can be changed to better capture ridges 
//		depending on the terrain parameters. Once a sample point is under the terrain,
//		a bisection method is used to move the sample backwards and forwards to find
//		the 0 crossing in a binary search. Return value within EPSILON of surface or
//		best approximation after a set number of iterations.
//
//Textures:	The rock texture is noise FBM with offset height-based stripes. Close range rock
//		also has fine noise texture. Snow is a plain white colour on slopes facing 
//		upward. The snow boundary is offset by noise to avoid straight lines.
//
//Lighting:	Three lights based on iq article. Strong white light from the sun. Soft shadows
//		using ray marching. Sky light is a blueish light directly from above. A third
//		white light is used to simulate indirect lighting in a very bright environment.
//		Includes tinted fog to give a sense of scale.

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

  var quality = 0.5;

  canvas.width *= quality;
  canvas.height *= quality;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  //Time
  var time = 0.0;
  //Sun

  //Height over horizon in range [0, PI/2.0]
  var elevation = 0.2;
  //Rotation around Y axis in range [0, 2*PI]
  var azimuth = 1.633;
  //View direction
  //Left/right in range [0; 2*PI]
  var yaw = Math.PI/4.0; 
  //Up/down in range [-PI/2; PI/2]
  var pitch = -0.12;
  //Camera movement speed
  var speed = 50.0;
  var cameraPosition = {x: 336, y: 0, z: -742};
  var upVector = {x: 0, y: 1, z: 0};
  var mousePosition = {x: canvas.width/2.0, y: canvas.height/2.0};
  var mouseDelta = {x: 0, y: 0};
  var viewDirection = {x: Math.sin(yaw), y: Math.sin(pitch),  z: Math.cos(yaw)};
  var viewMatrix = [{x: 1, y: 0, z: 0}, 
		    {x: 0, y: 1, z: 0}, 
		    {x: 0, y: 0, z: 1}];
  var isMouseDown = false;

  stats = new Stats();
  stats.showPanel(0);
  stats.domElement.style.position = 'relative';
  stats.domElement.style.bottom = '48px';

  if(!mobile){
    document.getElementById('cc_1').appendChild(stats.domElement);
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
  gui.add(this, 'quality').min(0.2).max(1.0).step(0.1).listen().onChange(function(value){onWindowResize();});
  gui.add(this, 'speed').min(10.0).max(100.0).step(10.0);
  gui.add(this, 'elevation').min(0.0).max(Math.PI/2.0).step(0.01).listen().onChange(function(value){updateSunPosition();});
  gui.add(this, 'azimuth').min(0.0).max(Math.PI*2.0).step(0.01).listen().onChange(function(value){updateSunPosition();});

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

    uniform vec3 cameraPosition;
    uniform mat3 viewMatrix;
    uniform vec3 sunPosition;
    uniform sampler2D greyNoiseTexture;

    const int MAX_STEPS = 250;
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

    vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
      vec2 xy = fragCoord - resolution.xy / 2.0;
      float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
      return normalize(vec3(xy, -z));
    }

    //Darken sky when looking up
    vec3 getSkyColour(vec3 rayDir){
      return mix(skyColour, 0.2*skyColour, rayDir.y);
    }

    //By iq
    float noised(vec2 x ){

      vec2 f = fract(x);
      vec2 u = f*f*(3.0-2.0*f);

      vec2 p = floor(x);
      float a = texture2D(greyNoiseTexture, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
      float b = texture2D(greyNoiseTexture, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
      float c = texture2D(greyNoiseTexture, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
      float d = texture2D(greyNoiseTexture, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;

      float res = (a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y);
      res = res - 0.5;
      return res;

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

      return normalize(vec3(getHeight(vec3(p.x-eps, p.y, p.z), normalLimit) - getHeight(vec3(p.x+eps, p.y, p.z), normalLimit),
          2.0*eps,
          getHeight(vec3(p.x, p.y, p.z-eps), normalLimit) - getHeight(vec3(p.x, p.y, p.z+eps), normalLimit) 
      ));
    }

    //https://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
    float softShadow(vec3 pos, vec3 rayDir){
      float res = 1.0;
      float t = 1.0;

      //Start some small distance away from the surface to avoid artifacts
      pos += rayDir * 5.0 * t;

      for(int i = 0; i < SHADOW_STEPS; i++){
        vec3 p = pos + t * rayDir;
        
        if(p.y > 2.0*HEIGHT){
          break;
        }
        
        float h = p.y - getHeight(p, terrainLimit);
        res = min(res, SHADOW_SHARPNESS * h / t );
        
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
        res += texture2D(greyNoiseTexture, freq * p.yy).x * amp;
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
        vec3 rockColour = mix(0.25*vec3(0.3, 0.2, 0.1), vec3(0.8), 0.5 * rockFbm(position, normal, dist));
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
      if(abs(rayDir.y) < 0.0001){rayDir.y = 0.0001;}
      //Rate of fade
      float b = 0.014;
      float fogAmount = 1.0 * exp(-rayOri.y*b) * (1.0-exp(-dist*rayDir.y*b))/rayDir.y;
      float sunAmount = max( dot( rayDir, sunDir ), 0.0 );
      vec3  fogColour  = mix( vec3(0.5,0.6,0.7), vec3(1.0), pow(sunAmount, 8.0) );
      return mix(rgb, fogColour, fogAmount);
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
      vec3 rayDir = rayDirection(50.0, gl_FragCoord.xy);

      vec3 cameraPos = cameraPosition;
      cameraPos.y = getHeight(cameraPos, cameraLimit) + 30.0;

      vec3 lightDirection = normalize(sunPosition);
      
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
  
  gl.activeTexture(gl.TEXTURE0);
  var tex1 = gl.createTexture();
  //Noise LUT from Shadertoy which is cheaper than calculating noise in the fragment shader
  //https://shadertoyunofficial.wordpress.com/2019/07/23/shadertoy-media-files/
  loadTexture(gl, tex1, 'https://al-ro.github.io/images/terrain/greyNoise.png');

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize(){
    var w = canvas.clientWidth * quality;
    var h = canvas.clientHeight * quality;
    if(!isInFullscreen()){
      h = w / 1.6;
    }

    canvas.width = w;
    canvas.height = h;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(widthHandle, w);
    gl.uniform1f(heightHandle, h);
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
      2,		// position is a vec2 (2 values per component)
      gl.FLOAT,		// each component is a float
      false,		// don't normalize values
      2 * 4,		// two 4 byte float components per vertex (32 bit float is 4 bytes)
      0			// how many bytes inside the buffer to start from
      );

  //Set uniform handle
  var timeHandle = getUniformLocation(program, 'time');
  var widthHandle = getUniformLocation(program, 'width');
  var heightHandle = getUniformLocation(program, 'height');
  var viewMatrixHandle = getUniformLocation(program, 'viewMatrix');
  var cameraPositionHandle = getUniformLocation(program, 'cameraPosition');
  var noiseTextureHandle = gl.getUniformLocation(program, "greyNoiseTexture");
  var sunPositionHandle = getUniformLocation(program, 'sunPosition');

  viewMatrix = lookAt(cameraPosition, viewDirection, upVector);

  gl.uniform1f(widthHandle, canvas.width);
  gl.uniform1f(heightHandle, canvas.height);
  gl.uniform1f(timeHandle, time);
  gl.uniform3f(cameraPositionHandle, cameraPosition.x, cameraPosition.y, cameraPosition.z);
  gl.uniformMatrix3fv(viewMatrixHandle, false, getViewMatrixAsArray());
  gl.uniform3f(sunPositionHandle, Math.sin(azimuth), Math.sin(elevation), Math.cos(azimuth));

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(noiseTextureHandle, 0);

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
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mousemove', mouseMove);

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

  //************** Draw **************

  var lastFrame = Date.now();
  var thisFrame;
  var dT;
  
  function draw(){
    stats.begin();

    //Update time
    thisFrame = Date.now();
    dT = (thisFrame - lastFrame)/1000.0;
    time += dT;	
    moveCamera(dT);
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
