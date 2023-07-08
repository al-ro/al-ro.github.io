function normalize(v) {
  var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
  }
  return d;
}

function negate(a) {
  return [-a[0], -a[1], -a[2]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function mod(m, n) {
  return ((m % n) + n) % n;
}

/**
 * Extract the 8 corners of an AABB from the mininum and maximum extents
 * @param {number[]} min smallest extent of data
 * @param {number[]} max largest extent of data
 * @returns an array of 8 corners in 3D
 */
function getAABBFromExtent(min, max) {
  let extent = [min, max];
  let corners = [];

  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) {
        corners.push([extent[x][0], extent[y][1], extent[z][2]]);
      }
    }
  }
  return corners;
}

/**
 * https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
 * @param {quaternion} q 
 * @returns array of 3 Euler angles [x, y, z]
 */
function quaternionToEuler(q) {

  // roll (x-axis rotation)
  var sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
  var cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
  var x = Math.atan2(sinr_cosp, cosr_cosp);

  // pitch (y-axis rotation)
  var y;
  var sinp = 2 * (q[3] * q[1] - q[2] * q[0]);
  if (Math.abs(sinp) >= 1) {
    y = Math.copysign(Math.PI / 2, sinp); // use 90 degrees if out of range
  } else {
    y = Math.asin(sinp);
  }

  // yaw (z-axis rotation)
  var siny_cosp = 2 * (q[3] * q[2] + q[0] * q[1]);
  var cosy_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
  var z = Math.atan2(siny_cosp, cosy_cosp);

  return [x, y, z];
}

/**
 * 
 * @param {number} roll 
 * @param {number} pitch 
 * @param {number} yaw 
 * @returns resulting quaternion
 */
function eulerToQuaternion(roll, pitch, yaw) {

  // Abbreviations for the various angular functions
  let cr = Math.cos(roll * 0.5);
  let sr = Math.sin(roll * 0.5);
  let cp = Math.cos(pitch * 0.5);
  let sp = Math.sin(pitch * 0.5);
  let cy = Math.cos(yaw * 0.5);
  let sy = Math.sin(yaw * 0.5);

  let q = [
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
    cr * cp * cy + sr * sp * sy
  ];

  return q;
}

/**
 * Spherical linear interpolation between two quaternions
 * https://www.mrpt.org/tutorials/programming/maths-and-geometry/slerp-interpolation/
 * @param {quaternion} q0 
 * @param {quaternion} q1 
 * @param {number} t fraction
 * @returns resulting quaternion
 */
function slerpQuaternion(q0, q1, t) {

  let qr = [];

  let cosHalfTheta = dot(q0, q1);

  if (Math.abs(cosHalfTheta) >= 1.0) {
    return q0;
  }

  if (cosHalfTheta < 0.0) {
    for (let i = 0; i < 4; i++) {
      q1[i] = -q1[i];
    }
    cosHalfTheta = -cosHalfTheta;
  }

  let halfTheta = Math.acos(cosHalfTheta);
  let sinHalfTheta = Math.sin(halfTheta);

  if (Math.abs(sinHalfTheta) < 0.001) {
    for (let i = 0; i < 4; i++) {
      qr.push((1 - t) * q0[i] + t * q1[i]);
    }
    return qr;
  }

  let ratioA = (Math.sin((1 - t) * halfTheta) / sinHalfTheta);
  let ratioB = (Math.sin(t * halfTheta) / sinHalfTheta);
  for (let i = 0; i < 4; i++) {
    qr.push(ratioA * q0[i] + ratioB * q1[i]);
  }
  return qr;

}
