import type { DroneState, Vec3 } from "./types";
import { droneYaw } from "./physics";

// Scripted tutorial: a sequence of objectives the sim evaluates each tick.
// Steps with `targets` show glowing rings the pilot must fly through, in order.

export interface TutorialStep {
  text: string;
  hint: string;
  targets?: Vec3[];
  /** Custom completion check (alternative to targets). */
  check?: (ctx: StepCtx, d: DroneState) => boolean;
}

export interface StepCtx {
  holdTime: number;
  yawAccum: number;
  prevYaw: number;
}

const SPAWN: Vec3 = [0, 0.6, 30];
const fwd = (d: number): Vec3 => [SPAWN[0], 3.5, SPAWN[2] - d];

export const TUTORIAL_SPAWN = { pos: SPAWN, yaw: 0 };

export const STEPS: TutorialStep[] = [
  {
    text: "Take off — climb to 3 meters and hold",
    hint: "Hold W to raise throttle, S to lower it. Find hover around 40%.",
    check: (ctx, d) => d.pos[1] > 3 && ctx.holdTime > 0.8,
  },
  {
    text: "Yaw — rotate 360° using A / D",
    hint: "A turns left, D turns right. Spin either way.",
    check: (ctx) => ctx.yawAccum > Math.PI * 2,
  },
  {
    text: "Fly forward — push the mouse forward",
    hint: "Mouse = pitch/roll stick. It springs back like a real gimbal.",
    targets: [fwd(15)],
  },
  {
    text: "Bank into the turn — combine mouse roll with yaw",
    hint: "Roll + yaw together for smooth coordinated turns.",
    targets: [[14, 4, 0], [24, 4, -14]],
  },
  {
    text: "Precision — thread the three gates",
    hint: "Feather the throttle to keep your line. R resets you.",
    targets: [
      [10, 4, -30],
      [-6, 6, -44],
      [-18, 4, -28],
    ],
  },
  {
    text: "Tutorial complete — free fly!",
    hint: "Press Enter for the menu, or keep practicing.",
    check: () => true,
  },
];

export class Tutorial {
  stepIndex = 0;
  targetIndex = 0;
  done = false;
  private ctx: StepCtx = { holdTime: 0, yawAccum: 0, prevYaw: 0 };

  get step(): TutorialStep {
    return STEPS[this.stepIndex];
  }

  /** Current gate ring to display, if any. */
  get currentTarget(): Vec3 | null {
    const t = this.step.targets;
    return t ? t[this.targetIndex] ?? null : null;
  }

  update(d: DroneState, dt: number): boolean {
    if (this.done) return false;
    const step = this.step;
    const yaw = droneYaw(d);
    let dy = yaw - this.ctx.prevYaw;
    if (dy > Math.PI) dy -= 2 * Math.PI;
    if (dy < -Math.PI) dy += 2 * Math.PI;
    this.ctx.yawAccum += Math.abs(dy);
    this.ctx.prevYaw = yaw;

    if (d.pos[1] > 2.6 && d.pos[1] < 4.4) this.ctx.holdTime += dt;
    else this.ctx.holdTime = Math.max(0, this.ctx.holdTime - dt * 2);

    if (step.targets) {
      const t = step.targets[this.targetIndex];
      if (t) {
        const dx = d.pos[0] - t[0];
        const dy2 = d.pos[1] - t[1];
        const dz = d.pos[2] - t[2];
        if (dx * dx + dy2 * dy2 + dz * dz < 3 * 3) this.targetIndex++;
      }
      if (this.targetIndex >= step.targets.length) return this.advance();
      return false;
    }
    if (step.check?.(this.ctx, d)) return this.advance();
    return false;
  }

  private advance(): boolean {
    this.stepIndex++;
    this.targetIndex = 0;
    this.ctx.holdTime = 0;
    this.ctx.yawAccum = 0;
    if (this.stepIndex >= STEPS.length) {
      this.done = true;
      this.stepIndex = STEPS.length - 1;
    }
    return true;
  }
}
