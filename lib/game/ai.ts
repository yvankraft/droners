import type { DroneState, InputFrame, RacerState, Vec3 } from "./types";
import { GATES } from "./track";
import { HOVER_THROTTLE } from "./physics";

// An AI pilot produces the same InputFrame as a human player. It flies the
// racing line with pure pursuit, in assist flight mode, at a per-pilot skill
// level (top speed + control gains + a lateral offset so AIs take slightly
// different lines and can overtake each other).

export interface AISkill {
  maxSpeed: number; // m/s
  gain: number; // overall steering aggressiveness 0..1
  lineOffset: number; // lateral offset from ideal line, meters
  name: string;
  color: string;
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export const AI_NAMES: { name: string; color: string }[] = [
  { name: "VEX", color: "#ff4444" },
  { name: "NOVA", color: "#44ccff" },
  { name: "KRIK", color: "#ffcc22" },
  { name: "MIRA", color: "#cc66ff" },
  { name: "JOLT", color: "#66ff88" },
  { name: "PIKO", color: "#ff8844" },
  { name: "ZEDO", color: "#ff66aa" },
];

export function makeSkill(i: number, total: number): AISkill {
  const t = total <= 1 ? 0.5 : i / (total - 1); // 0 = slowest, 1 = fastest
  const info = AI_NAMES[i % AI_NAMES.length];
  return {
    maxSpeed: 19 + t * 10 + Math.random() * 1.5,
    gain: 0.55 + t * 0.35,
    lineOffset: (Math.random() - 0.5) * 3,
    name: info.name,
    color: info.color,
  };
}

export class AIPilot {
  skill: AISkill;
  private sep: Vec3 = [0, 0, 0]; // separation impulse from nearby drones

  constructor(skill: AISkill) {
    this.skill = skill;
  }

  /** Feed the position of other racers each tick for separation steering. */
  avoid(pos: Vec3, others: RacerState[]): void {
    let sx = 0, sz = 0;
    for (const o of others) {
      const dx = pos[0] - o.drone.pos[0];
      const dz = pos[2] - o.drone.pos[2];
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.01 && d2 < 16) {
        const d = Math.sqrt(d2);
        sx += (dx / d) * (4 - d) * 0.4;
        sz += (dz / d) * (4 - d) * 0.4;
      }
    }
    this.sep = [sx, 0, sz];
  }

  update(d: DroneState, nextGate: number): InputFrame {
    const gate = GATES[nextGate];
    const nxt = GATES[(nextGate + 1) % GATES.length];

    // Aim through the ring toward the exit: near the gate, lead the target
    // past its center in the direction of the following gate (apex cut).
    // Far away, aim dead center — this guarantees threading the ring and is
    // self-correcting if a gate is missed (the AI loops back for it).
    const gx = gate.pos[0] - d.pos[0];
    const gy = gate.pos[1] - d.pos[1];
    const gz = gate.pos[2] - d.pos[2];
    const gDist = Math.hypot(gx, gy, gz) || 1;

    const ex = nxt.pos[0] - gate.pos[0];
    const ey = nxt.pos[1] - gate.pos[1];
    const ez = nxt.pos[2] - gate.pos[2];
    const eLen = Math.hypot(ex, ey, ez) || 1;

    const lead = Math.min(2.5, gDist * 0.25);
    const tx = gate.pos[0] + (ex / eLen) * lead + this.sep[0];
    const ty = gate.pos[1] + (ey / eLen) * lead;
    const tz = gate.pos[2] + (ez / eLen) * lead + this.sep[2];

    const dir: Vec3 = [tx - d.pos[0], ty - d.pos[1], tz - d.pos[2]];
    const dist = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    dir[0] /= dist;
    dir[1] /= dist;
    dir[2] /= dist;

    // Speed: brake for the gate, and more when the turn after it is sharp.
    const yawTo = Math.atan2(-dir[0], -dir[2]);
    const yawErr = wrapAngle(yawTo - d.heading);
    const align = Math.max(0.15, Math.cos(yawErr));
    // Corner severity: angle between approach and exit directions.
    const dot = (gx * ex + gz * ez) / (gDist * eLen);
    const corner = 1 - Math.max(-1, Math.min(1, dot)); // 0=straight, 2=hairpin
    const cornerSpeed = this.skill.maxSpeed * (1 - 0.32 * corner);
    const speed =
      Math.min(this.skill.maxSpeed, cornerSpeed, 4 + gDist * 0.9) *
      (0.35 + 0.65 * align);

    const g = this.skill.gain;
    const dvx = dir[0] * speed - d.vel[0];
    const dvy = dir[1] * speed - d.vel[1];
    const dvz = dir[2] * speed - d.vel[2];

    // Convert desired horizontal accel into drone-frame pitch/roll.
    const cy = Math.cos(d.heading);
    const sy = Math.sin(d.heading);
    // Forward (-Z rotated by heading) and right vectors, horizontal.
    const fwdX = -sy, fwdZ = -cy;
    const rightX = cy, rightZ = -sy;
    const aFwd = dvx * fwdX + dvz * fwdZ;
    const aLat = dvx * rightX + dvz * rightZ;

    const pitch = clamp(-aFwd * 0.12 * g, -1, 1);
    const roll = clamp(aLat * 0.12 * g, -1, 1);
    // yaw +1 turns right (heading decreases) — hence the -yawErr sign.
    const yaw = clamp(-yawErr * 1.5, -1, 1);
    // Tilt compensation: when banked, only up.y of the thrust fights gravity —
    // divide the hover throttle by it or the drone sinks into the ground.
    const qx = d.quat[0], qz = d.quat[2];
    const upY = Math.max(0.55, 1 - 2 * (qx * qx + qz * qz));
    const throttle = clamp(
      (HOVER_THROTTLE + dvy * 0.05 * g) / upY + 0.02,
      0.05,
      1,
    );

    return { throttle, pitch, roll, yaw, reset: false };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
