import type { Gate, Vec3 } from "./types";

// Track definition: a closed loop of gates the racers fly through in order.
// Positions are in meters, Y is up. The start/finish straight runs along -Z.

const RAW_POINTS: Vec3[] = [
  [0, 4, 0], // 0 — start/finish
  [0, 4, -45],
  [18, 6, -80], // sweeper right
  [50, 7, -95],
  [82, 5, -85], // hairpin
  [95, 10, -48], // climb over the ridge
  [80, 14, -12], // high gate
  [45, 9, 8], // drop
  [45, 4, 45], // low pass
  [12, 5, 62],
  [-22, 7, 52], // sweeper left
  [-38, 5, 18], // dive back to start
];

function facingYaw(from: Vec3, to: Vec3): number {
  // Drone forward is -Z, so yaw = atan2(-dx, -dz).
  return Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));
}

export const GATES: Gate[] = RAW_POINTS.map((pos, i) => {
  const next = RAW_POINTS[(i + 1) % RAW_POINTS.length];
  return { pos, yaw: facingYaw(pos, next), radius: 2.6 };
});

export const TOTAL_LAPS = 3;

// Spawn grid: 8 slots behind gate 0 on the start straight, facing gate 1.
export const SPAWNS: { pos: Vec3; yaw: number }[] = [];
for (let i = 0; i < 8; i++) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  SPAWNS.push({
    pos: [-6 + col * 4, 0.6, 10 + row * 6],
    yaw: 0, // facing -Z toward the first gates
  });
}

// Racing line for the AI: gate centers + smoothed midpoints between gates.
export const RACING_LINE: Vec3[] = (() => {
  const line: Vec3[] = [];
  for (let i = 0; i < GATES.length; i++) {
    const a = GATES[i].pos;
    const b = GATES[(i + 1) % GATES.length].pos;
    const mid: Vec3 = [
      (a[0] + b[0]) / 2,
      Math.max(2, (a[1] + b[1]) / 2 - 0.5),
      (a[2] + b[2]) / 2,
    ];
    line.push(a, mid);
  }
  return line;
})();

/** Closest-point parameter on the racing line polyline (closed loop). */
export function lineProgress(pos: Vec3): { t: number; dist: number } {
  let best = { t: 0, dist: Infinity };
  const n = RACING_LINE.length;
  for (let i = 0; i < n; i++) {
    const a = RACING_LINE[i];
    const b = RACING_LINE[(i + 1) % n];
    const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap: Vec3 = [pos[0] - a[0], pos[1] - a[1], pos[2] - a[2]];
    const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    let u = len2 > 0 ? (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2 : 0;
    u = Math.max(0, Math.min(1, u));
    const dx = ap[0] - ab[0] * u;
    const dy = ap[1] - ab[1] * u;
    const dz = ap[2] - ab[2] * u;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < best.dist) best = { t: i + u, dist: d2 };
  }
  return { t: best.t, dist: Math.sqrt(best.dist) };
}

/** Point on the closed racing line, `ahead` segments in front of parameter t. */
export function linePoint(t: number): Vec3 {
  const n = RACING_LINE.length;
  const tt = ((t % n) + n) % n;
  const i = Math.floor(tt);
  const u = tt - i;
  const a = RACING_LINE[i];
  const b = RACING_LINE[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

// Decorative obstacles (visual reference: rendered by the scene, no collision
// except a soft cylinder push in physics for the big tower).
export const TOWER = { pos: [95, 0, -30] as Vec3, radius: 4, height: 22 };
export const TREES: Vec3[] = [
  [-20, 0, -50],
  [30, 0, -55],
  [60, 0, -60],
  [100, 0, -70],
  [110, 0, -20],
  [70, 0, 30],
  [20, 0, 80],
  [-45, 0, 60],
  [-60, 0, 0],
  [-30, 0, -80],
];
