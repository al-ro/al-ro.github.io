function normalize(v){
  var length = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  return [v[0]/length, v[1]/length, v[2]/length];
}

function cross(a, b){
  return [ a[1] * b[2] - a[2] * b[1],
	   a[2] * b[0] - a[0] * b[2],
	   a[0] * b[1] - a[1] * b[0]
	 ]; 
}

function dot(a, b){
  let d = 0;
  for(let i = 0; i < a.length; i++){
    d += a[i] * b[i];
  }
  return d; 
}

function negate(a){
  return [-a[0], -a[1], -a[2]];
}

function subtract(a, b){
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}
function add(a, b){
  return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
}

function mod(m, n){
  return ((m % n) + n) % n;
}


// https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
function quaternionToEuler(q) {

    // roll (x-axis rotation)
    var sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
    var cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
    var x = Math.atan2(sinr_cosp, cosr_cosp);

    // pitch (y-axis rotation)
    var y;
    var sinp = 2 * (q[3] * q[1] - q[2] * q[0]);
    if (Math.abs(sinp) >= 1){
        y = Math.copysign(Math.PI / 2, sinp); // use 90 degrees if out of range
    }else{
        y = Math.asin(sinp);
    }

    // yaw (z-axis rotation)
    var siny_cosp = 2 * (q[3] * q[2] + q[0] * q[1]);
    var cosy_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
    var z = Math.atan2(siny_cosp, cosy_cosp);

    return [x, y, z];
}
