import { Euler, Quaternion, Vector3 } from "three";
import type { DroneState, FlightMode, InputFrame, Vec3 } from "./types";
import { TOWER } from "./track";

// Tuned for a fun-but-droney feel. Accelerations in m/s².
export const MAX_THRUST = 26; // hover ≈ throttle 0.38
export const HOVER_THROTTLE = 9.81 / MAX_THRUST;
const GRAVITY = 9.81;
const MAX_TILT = (50 * Math.PI) / 180; // assist mode
const TILT_RATE = 10; // how fast assist approaches target tilt
const YAW_RATE = 3.2; // rad/s in assist
const ACRO_RATE = 5.5; // rad/s max angular rate in acro
const LIN_DRAG = 0.35;
const QUAD_DRAG = 0.008;
const DRONE_RADIUS = 0.35;
const WORLD_BOUND = 260;
const CEILING = 120;

const _q = new Quaternion();
const _target = new Quaternion();
const _e = new Euler(0, 0, 0, "YXZ");
const _up = new Vector3();
const _v = new Vector3();

export function createDrone(
  pos: Vec3,
  yaw: number,
  flightMode: FlightMode = "assist",
): DroneState {
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
  return {
    pos: [...pos],
    vel: [0, 0, 0],
    quat: [q.x, q.y, q.z, q.w],
    heading: yaw,
    throttle: 0,
    flightMode,
    grounded: false,
  };
}

/** Advance one drone by dt seconds. Mutates `d` in place (hot loop friendly). */
export function stepDrone(d: DroneState, input: InputFrame, dt: number): void {
  const throttle = Math.min(1, Math.max(0, input.throttle));
  d.throttle = throttle;
  _q.set(d.quat[0], d.quat[1], d.quat[2], d.quat[3]);

  if (d.flightMode === "assist") {
    // --- Angle mode: sticks = target tilt, yaw stick = yaw rate. ---
    d.heading += -input.yaw * YAW_RATE * dt;
    const pitch = input.pitch * MAX_TILT; // forward stick => nose down
    const roll = -input.roll * MAX_TILT;
    // Order YXZ: yaw about world Y, then pitch/roll in the yawed frame.
    _e.set(pitch, d.heading, roll);
    _target.setFromEuler(_e);
    _q.slerp(_target, Math.min(1, TILT_RATE * dt));
  } else {
    // --- Rate mode (acro): sticks = angular velocity about body axes. ---
    const wx = input.pitch * ACRO_RATE; // -X rotation pitches the nose down
    const wy = -input.yaw * ACRO_RATE;
    const wz = -input.roll * ACRO_RATE;
    const half = dt / 2;
    // Integrate: q += 0.5 * q * w
    const qx = _q.x, qy = _q.y, qz = _q.z, qw = _q.w;
    _q.set(
      qx + half * (wx * qw + wz * qy - wy * qz),
      qy + half * (wy * qw + wx * qz - wz * qx),
      qz + half * (wz * qw + wy * qx - wx * qy),
      qw + half * (-wx * qx - wy * qy - wz * qz),
    ).normalize();
  }

  d.quat = [_q.x, _q.y, _q.z, _q.w];

  // Thrust along body up + gravity + drag.
  _up.set(0, 1, 0).applyQuaternion(_q);
  const ax = _up.x * throttle * MAX_THRUST;
  const ay = _up.y * throttle * MAX_THRUST - GRAVITY;
  const az = _up.z * throttle * MAX_THRUST;

  let vx = d.vel[0] + ax * dt;
  let vy = d.vel[1] + ay * dt;
  let vz = d.vel[2] + az * dt;

  const speed = Math.hypot(vx, vy, vz);
  if (speed > 0.001) {
    const f = Math.max(0, 1 - (LIN_DRAG + QUAD_DRAG * speed) * dt);
    vx *= f;
    vy *= f;
    vz *= f;
  }

  d.vel = [vx, vy, vz];
  d.pos = [d.pos[0] + vx * dt, d.pos[1] + vy * dt, d.pos[2] + vz * dt];

  d.grounded = false;
  // Ground: soft touchdown, kills most energy.
  if (d.pos[1] < DRONE_RADIUS) {
    d.pos[1] = DRONE_RADIUS;
    if (vy < 0) d.vel[1] = -vy * 0.15;
    d.vel[0] *= 0.9;
    d.vel[2] *= 0.9;
    d.grounded = true;
  }
  // Soft world bounds so nobody gets lost.
  if (Math.abs(d.pos[0]) > WORLD_BOUND) d.vel[0] -= Math.sign(d.pos[0]) * 30 * dt;
  if (Math.abs(d.pos[2]) > WORLD_BOUND) d.vel[2] -= Math.sign(d.pos[2]) * 30 * dt;
  if (d.pos[1] > CEILING) d.vel[1] -= 30 * dt;

  // The big tower is solid — push out horizontally.
  const dx = d.pos[0] - TOWER.pos[0];
  const dz = d.pos[2] - TOWER.pos[2];
  const rr = TOWER.radius + DRONE_RADIUS;
  if (d.pos[1] < TOWER.height && dx * dx + dz * dz < rr * rr) {
    const dist = Math.hypot(dx, dz) || 1;
    d.pos[0] = TOWER.pos[0] + (dx / dist) * rr;
    d.pos[2] = TOWER.pos[2] + (dz / dist) * rr;
    const vn = (d.vel[0] * dx + d.vel[2] * dz) / dist;
    if (vn < 0) {
      d.vel[0] -= (dx / dist) * vn;
      d.vel[2] -= (dz / dist) * vn;
    }
  }
}

/** Instant heading of the drone (for HUD compass / camera). */
export function droneYaw(d: DroneState): number {
  _q.set(d.quat[0], d.quat[1], d.quat[2], d.quat[3]);
  _v.set(0, 0, -1).applyQuaternion(_q);
  return Math.atan2(-_v.x, -_v.z);
}
