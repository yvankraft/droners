// Core game types.
//
// The simulation is deliberately decoupled from React and from *where*
// inputs come from: every drone — player, AI, and eventually remote
// players — is driven by the same `InputFrame`. For the future 8-player
// online mode, a remote player is just another `InputFrame` producer.

export type Vec3 = [number, number, number];

export type FlightMode = "assist" | "acro";

export type GameMode = "tutorial" | "training" | "race";

/** One tick of pilot intent. All values normalized. */
export interface InputFrame {
  /** Absolute throttle 0..1 (like a non-centering radio stick). */
  throttle: number;
  /** -1..1 — pitch forward/backward (forward = -1 tilts nose down / fly forward). */
  pitch: number;
  /** -1..1 — roll right positive. */
  roll: number;
  /** -1..1 — yaw right positive. */
  yaw: number;
  /** One-shot: request respawn at last checkpoint. */
  reset: boolean;
}

export const NEUTRAL_INPUT: InputFrame = {
  throttle: 0,
  pitch: 0,
  roll: 0,
  yaw: 0,
  reset: false,
};

export interface DroneState {
  pos: Vec3;
  vel: Vec3;
  /** Quaternion [x, y, z, w]. */
  quat: [number, number, number, number];
  /** Integrated heading used by assist mode (radians). */
  heading: number;
  /** Throttle actually applied (kept for HUD + audio later). */
  throttle: number;
  flightMode: FlightMode;
  /** True when touching the ground / crashed. */
  grounded: boolean;
}

export interface Gate {
  pos: Vec3;
  /** Radians — direction the gate faces (travel direction through it). */
  yaw: number;
  radius: number;
}

export interface RacerState {
  drone: DroneState;
  name: string;
  color: string;
  isPlayer: boolean;
  /** Index of the next gate to pass. */
  nextGate: number;
  lap: number;
  /** Monotonic progress used for live ranking. */
  progress: number;
  lastCheckpoint: number;
  finished: boolean;
  finishTime: number | null;
  /** Time since race start for current lap bookkeeping. */
  lapStartTime: number;
  bestLap: number | null;
  currentLapStart: number;
}

export type RacePhase = "countdown" | "racing" | "finished";

/** Snapshot pushed to React for HUD rendering (~10 Hz). */
export interface HudSnapshot {
  phase: RacePhase;
  countdown: number;
  speedKmh: number;
  altitude: number;
  throttle: number;
  flightMode: FlightMode;
  lap: number;
  totalLaps: number;
  nextGate: number;
  totalGates: number;
  position: number;
  racers: number;
  gateDist: number;
  /** Angle to next gate relative to heading, radians. -pi..pi */
  gateBearing: number;
  time: number;
  bestLap: number | null;
  message: string;
  results: { name: string; time: number | null; isPlayer: boolean; color: string }[];
  tutorialText: string;
  tutorialHint: string;
  tutorialDone: boolean;
}
