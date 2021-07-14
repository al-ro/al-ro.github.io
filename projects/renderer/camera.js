export class Camera{
  
  position = [0, 0, 1];
  target = [0, 0, 0];
  distance = 1;

  viewDirection = [0,0,-1];
  rightDirection = [1,0,0];
  pitch = 0;
  yaw = 0;

  fov = 45;
  aspect = 1;
  up = [0, 1, 0];
  zNear = 0.1;
  zFar = 1.0;

  perspectiveMatrix; 
  cameraMatrix; 
  viewMatrix; 

  exposure = 1.0;

  constructor(pitch, yaw, distance, target, up, fov, aspect, zNear, zFar){
    this.pitch = pitch;
    this.yaw = yaw;
    this.distance = distance;
    this.target = target;
    this.up = up;
    this.fov = fov;
    this.aspect = aspect;
    this.zNear = zNear;
    this.zFar = zFar;
    this.updatePosition([0,0]);
  }

  updatePosition(delta){
    let yawChange = (delta[0] * 0.01) % (2.0 * Math.PI);
    this.yaw  += yawChange;
    this.position[0] = Math.sin(this.yaw) ;
    this.position[2] = Math.cos(this.yaw) ;
    let pitchChange = (delta[1] * 0.01) % (2.0 * Math.PI);
    this.pitch += pitchChange;
    this.pitch = Math.max(-Math.PI/2.0, Math.min(Math.PI/2.0, this.pitch));
    this.position[1] = -Math.sin(this.pitch) ;
    this.position = normalize(this.position);
    this.position[0] *= this.distance;
    this.position[1] *= this.distance;
    this.position[2] *= this.distance;
    this.position = add(this.position, this.target);
  }

  updateDistance(distance){
    this.distance = distance;
    this.updatePosition([0,0]);
  }


// Fly camera

/*
  updatePosition(delta){

    let yawChange = (delta[0] * 0.01) % (2.0 * Math.PI);
    this.yaw  += yawChange;
    this.viewDirection[0] = Math.sin(this.yaw);
    this.viewDirection[2] = Math.cos(this.yaw);
    let pitchChange = (delta[1] * 0.01) % (2.0 * Math.PI);
    this.pitch += pitchChange;
    this.pitch = Math.max(-Math.PI/2.0, Math.min(Math.PI/2.0, this.pitch));
    this.viewDirection[1] = Math.sin(this.pitch);
    this.viewDirection = normalize(this.viewDirection);

    this.rightDirection = normalize(cross(this.up, this.viewDirection));
    this.target = [this.position[0] + this.viewDirection[0], this.position[1] + this.viewDirection[1], this.position[2] + this.viewDirection[2]];

  }
*/
  setPosition(pos){
   // this.position = pos;
   // this.rightDirection = normalize(cross(this.up, this.viewDirection));
   // this.target = [this.position[0] + this.viewDirection[0], this.position[1] + this.viewDirection[1], this.position[2] + this.viewDirection[2]];
  }

  setProjectionMatrix(){
    this.projectionMatrix = m4.perspective(this.fov, this.aspect, this.zNear, this.zFar);
  }

  getProjectionMatrix(){
    return this.projectionMatrix;
  }

  setCameraMatrix(){
    this.cameraMatrix = m4.lookAt(this.position, this.target, this.up);
  }

  getCameraMatrix(){
    return this.cameraMatrix;
  }

  setViewMatrix(){
    this.viewMatrix = m4.inverse(this.cameraMatrix);
  }

  getViewMatrix(){
    return this.viewMatrix;
  }

  setAspect(aspect){
    this.aspect = aspect;
  }

  setTarget(target){
    this.target = target;
  }

  getFOV(){
    return this.fov;
  }

  getExposure(){
    return this.exposure;
  }
  
}

