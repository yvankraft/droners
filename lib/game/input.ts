import type { InputFrame } from "./types";

// Keyboard + mouse + gamepad -> InputFrame.
//
// Mouse (pointer lock) emulates the right radio gimbal: pitch + roll.
//   The stick KEEPS its deflection — no spring back to center.
//   Right-click (or X) snaps the stick back to center.
// Keyboard emulates the left stick:
//   W / ArrowUp    throttle up   (non-centering, like a real TX)
//   S / ArrowDown  throttle down
//   A / ArrowLeft  yaw left
//   D / ArrowRight yaw right
// Gamepad (standard mapping — Xbox/PS pad or a TX in "standard" mode):
//   Right stick    pitch + roll (direct, springs like a real gimbal)
//   Left stick Y   throttle nudge — push up/down to raise/lower
//   Left stick X   yaw
//   A = respawn · B = flight mode · X = center stick · Y = camera ·
//   Start = pause
// A non-"standard" pad (most USB radios) gets absolute throttle on left Y.
// While a pad is actively moved it wins over the mouse stick for ~1.5 s.
// Plus: R reset, C camera, M flight mode, handled via callbacks.

const DEADZONE = 0.1;
const PAD_LATCH_MS = 1500;

export class InputController {
  throttle = 0;
  private pitch = 0;
  private roll = 0;
  private keys = new Set<string>();
  private resetRequested = false;
  sensitivity = 0.0035;

  private padButtons: boolean[] = [];
  private padActiveUntil = 0;
  private outPitch = 0;
  private outRoll = 0;

  onCameraToggle: (() => void) | null = null;
  onModeToggle: (() => void) | null = null;
  onPause: (() => void) | null = null;
  onAnyKey: (() => void) | null = null;

  /** Right-stick deflection actually flown last frame (mouse or pad). */
  get stick(): { pitch: number; roll: number } {
    return { pitch: this.outPitch, roll: this.outRoll };
  }

  /** Snap the right stick back to center. */
  centerStick(): void {
    this.pitch = 0;
    this.roll = 0;
  }

  attach(el: HTMLElement): () => void {
    const keydown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.onAnyKey?.();
      if (e.code === "KeyR") this.resetRequested = true;
      if (e.code === "KeyC") this.onCameraToggle?.();
      if (e.code === "KeyM") this.onModeToggle?.();
      if (e.code === "KeyX") this.centerStick();
      if (e.code === "Escape") this.onPause?.();
      if (e.code.startsWith("Arrow")) e.preventDefault();
    };
    const keyup = (e: KeyboardEvent) => this.keys.delete(e.code);
    const mousemove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      // Moving mouse up = negative movementY = push stick forward.
      this.pitch = clamp(this.pitch + e.movementY * this.sensitivity, -1, 1);
      this.roll = clamp(this.roll + e.movementX * this.sensitivity, -1, 1);
    };
    const mousedown = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      if (e.button === 2) this.centerStick(); // right-click = center stick
    };
    const contextmenu = (e: Event) => {
      if (document.pointerLockElement === el) e.preventDefault();
    };
    const blur = () => this.keys.clear();

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("mousemove", mousemove);
    el.addEventListener("mousedown", mousedown);
    el.addEventListener("contextmenu", contextmenu);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("mousemove", mousemove);
      el.removeEventListener("mousedown", mousedown);
      el.removeEventListener("contextmenu", contextmenu);
      window.removeEventListener("blur", blur);
    };
  }

  /** Poll the first usable gamepad. Returns normalized stick values. */
  private readPad(dt: number): {
    pitch: number;
    roll: number;
    yaw: number;
    moved: boolean;
  } | null {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
    let pad: Gamepad | null = null;
    for (const p of navigator.getGamepads()) {
      if (p && p.connected && p.axes.length >= 4) {
        pad = p;
        break;
      }
    }
    if (!pad) return null;

    const standard = pad.mapping === "standard";
    const lx = dz(pad.axes[0]);
    const ly = dz(pad.axes[1]);
    const rx = dz(pad.axes[2]);
    const ry = dz(pad.axes[3]);

    // Buttons — edge-detected one-shots (standard layout indices).
    const pressed = (i: number) => {
      const now = !!pad.buttons[i]?.pressed;
      const was = this.padButtons[i] ?? false;
      this.padButtons[i] = now;
      return now && !was;
    };
    if (pressed(0)) this.resetRequested = true; // A / cross
    if (pressed(1)) this.onModeToggle?.(); // B / circle
    if (pressed(2)) this.centerStick(); // X / square
    if (pressed(3)) this.onCameraToggle?.(); // Y / triangle
    if (pressed(8) || pressed(9)) this.onPause?.(); // back or start
    if (pad.buttons.some((b) => b.pressed)) this.onAnyKey?.();

    // Throttle: a standard pad's left stick self-centers, so it nudges the
    // cumulative throttle like W/S. A non-standard device (usually a real
    // radio) reports absolute stick position — use it directly.
    if (standard) {
      this.throttle = clamp(this.throttle - ly * 1.2 * dt, 0, 1);
    } else {
      this.throttle = clamp((1 - pad.axes[1]) / 2, 0, 1);
    }

    const moved =
      Math.abs(lx) > 0 || Math.abs(ly) > 0 || Math.abs(rx) > 0 || Math.abs(ry) > 0;
    // Gentle expo for a finer center feel, like a radio curve.
    return {
      pitch: expo(ry),
      roll: expo(rx),
      yaw: expo(lx),
      moved,
    };
  }

  frame(dt: number): InputFrame {
    const pad = this.readPad(dt);
    const now = performance.now();
    if (pad?.moved) this.padActiveUntil = now + PAD_LATCH_MS;
    const padActive = !!pad && now < this.padActiveUntil;

    // Throttle is stateful: W/S nudge it up/down like a TX stick.
    const up = this.keys.has("KeyW") || this.keys.has("ArrowUp");
    const down = this.keys.has("KeyS") || this.keys.has("ArrowDown");
    if (up) this.throttle = clamp(this.throttle + 1.2 * dt, 0, 1);
    if (down) this.throttle = clamp(this.throttle - 1.5 * dt, 0, 1);

    let yaw = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) yaw -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) yaw += 1;

    const reset = this.resetRequested;
    this.resetRequested = false;
    this.outPitch = padActive ? pad.pitch : this.pitch;
    this.outRoll = padActive ? pad.roll : this.roll;
    return {
      throttle: this.throttle,
      pitch: this.outPitch,
      roll: this.outRoll,
      yaw: padActive && pad.yaw !== 0 ? pad.yaw : yaw,
      reset,
    };
  }

  release(): void {
    this.keys.clear();
    this.throttle = 0;
    this.pitch = 0;
    this.roll = 0;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function dz(v: number): number {
  return Math.abs(v) < DEADZONE ? 0 : v;
}

/** Quadratic expo: full throw preserved, softer around center. */
function expo(v: number): number {
  return v * Math.abs(v);
}
