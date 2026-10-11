import type {
  FlightMode,
  GameMode,
  HudSnapshot,
  InputFrame,
  RacePhase,
  RacerState,
  Vec3,
} from "./types";
import { GATES, SPAWNS, TOTAL_LAPS } from "./track";
import { createDrone, droneYaw, stepDrone } from "./physics";
import { AIPilot, makeSkill } from "./ai";
import { Tutorial, TUTORIAL_SPAWN } from "./tutorial";

const COUNTDOWN_S = 3;

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function makeRacer(
  name: string,
  color: string,
  isPlayer: boolean,
  pos: Vec3,
  yaw: number,
  flightMode: FlightMode,
): RacerState {
  return {
    drone: createDrone(pos, yaw, flightMode),
    name,
    color,
    isPlayer,
    nextGate: 0,
    lap: 0,
    progress: 0,
    lastCheckpoint: -1,
    finished: false,
    finishTime: null,
    lapStartTime: 0,
    bestLap: null,
    currentLapStart: 0,
  };
}

export interface RaceOptions {
  opponents: number; // 0..7
  flightMode: FlightMode;
  playerName?: string;
}

export class RaceSim {
  readonly mode: GameMode;
  racers: RacerState[] = [];
  private pilots: AIPilot[] = [];
  phase: RacePhase = "countdown";
  countdown = COUNTDOWN_S;
  time = 0;
  message = "";
  private messageTtl = 0;
  tutorial = new Tutorial();
  private flightMode: FlightMode;

  constructor(mode: GameMode, opts: RaceOptions) {
    this.mode = mode;
    this.flightMode = opts.flightMode;
    const name = opts.playerName ?? "YOU";

    if (mode === "tutorial") {
      this.racers.push(
        makeRacer(name, "#4ade80", true, [...TUTORIAL_SPAWN.pos], TUTORIAL_SPAWN.yaw, opts.flightMode),
      );
      this.phase = "racing"; // tutorial starts immediately
      this.message = "Follow the instructions";
      this.messageTtl = 3;
      return;
    }

    const grid = mode === "race" ? opts.opponents + 1 : 1;
    this.racers.push(
      makeRacer(name, "#4ade80", true, [...SPAWNS[0].pos], SPAWNS[0].yaw, opts.flightMode),
    );
    for (let i = 1; i < grid; i++) {
      const skill = makeSkill(i - 1, Math.max(1, grid - 1));
      const spawn = SPAWNS[i % SPAWNS.length];
      this.racers.push(
        makeRacer(skill.name, skill.color, false, [...spawn.pos], spawn.yaw, "assist"),
      );
      this.pilots.push(new AIPilot(skill));
    }
    // Player starts on the front row for fairness.
    this.racers[0].drone.pos = [...SPAWNS[0].pos];
  }

  get player(): RacerState {
    return this.racers[0];
  }

  /** Advance the whole sim by dt. playerInput is ignored for AI racers. */
  step(dt: number, playerInput: InputFrame): void {
    if (this.messageTtl > 0) {
      this.messageTtl -= dt;
      if (this.messageTtl <= 0) this.message = "";
    }

    if (this.phase === "countdown") {
      const prev = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (now !== prev && now > 0) {
        this.message = String(now);
        this.messageTtl = 0.95;
      }
      if (this.countdown <= 0) {
        this.phase = "racing";
        this.message = "GO!";
        this.messageTtl = 1;
      }
      return; // drones frozen on the grid
    }

    this.time += dt;

    for (let i = 0; i < this.racers.length; i++) {
      const r = this.racers[i];
      if (r.finished) continue;
      let input: InputFrame;
      if (r.isPlayer) {
        input = playerInput;
      } else {
        const pilot = this.pilots[i - 1];
        pilot.avoid(r.drone.pos, this.racers.filter((o) => o !== r));
        input = pilot.update(r.drone, r.nextGate);
      }

      if (input.reset && r.isPlayer) this.respawn(r);
      if (!input.reset) stepDrone(r.drone, input, dt);

      if (this.mode !== "tutorial") this.updateGates(r);
      r.progress = this.computeProgress(r);
    }

    if (this.mode === "tutorial" && this.tutorial.update(this.player.drone, dt)) {
      this.message = this.tutorial.done
        ? "Tutorial complete!"
        : "Objective complete!";
      this.messageTtl = 2;
      if (this.tutorial.done) this.phase = "finished";
    }
  }

  private updateGates(r: RacerState): void {
    const gate = GATES[r.nextGate];
    if (!gate || r.finished) return;
    if (dist(r.drone.pos, gate.pos) > gate.radius) return;

    r.lastCheckpoint = r.nextGate;
    if (r.nextGate === 0) {
      // Crossed the start/finish line.
      if (r.lap > 0) {
        const lapTime = this.time - r.currentLapStart;
        if (r.bestLap === null || lapTime < r.bestLap) r.bestLap = lapTime;
      }
      r.currentLapStart = this.time;
      r.lap++;
      if (r.lap > TOTAL_LAPS) {
        r.finished = true;
        r.finishTime = this.time;
        if (r.isPlayer) {
          this.message = "FINISH!";
          this.messageTtl = 4;
          this.phase = "finished";
        }
        return;
      }
      if (r.isPlayer) {
        this.message =
          r.lap === TOTAL_LAPS ? "FINAL LAP" : `LAP ${r.lap}/${TOTAL_LAPS}`;
        this.messageTtl = 1.6;
      }
    }
    r.nextGate = (r.nextGate + 1) % GATES.length;
  }

  private computeProgress(r: RacerState): number {
    if (this.mode === "tutorial") return 0;
    const lapBase = r.lap * GATES.length;
    const gate = GATES[r.nextGate];
    const prev = GATES[(r.nextGate - 1 + GATES.length) % GATES.length];
    const span = Math.max(1, dist(prev.pos, gate.pos));
    const frac = Math.max(0, 1 - dist(r.drone.pos, gate.pos) / span);
    return lapBase + r.nextGate + frac;
  }

  respawn(r: RacerState): void {
    const at =
      r.lastCheckpoint >= 0 ? GATES[r.lastCheckpoint].pos : SPAWNS[0].pos;
    const next = GATES[r.nextGate];
    const yaw = Math.atan2(
      -(next.pos[0] - at[0]),
      -(next.pos[2] - at[2]),
    );
    const d = createDrone(
      [at[0], Math.max(1.5, at[1]), at[2]],
      yaw,
      r.drone.flightMode,
    );
    d.throttle = 0.4;
    r.drone.pos = d.pos;
    r.drone.vel = d.vel;
    r.drone.quat = d.quat;
    r.drone.heading = d.heading;
    r.drone.throttle = d.throttle;
    r.drone.grounded = false;
  }

  toggleFlightMode(): void {
    const d = this.player.drone;
    d.flightMode = d.flightMode === "assist" ? "acro" : "assist";
    this.flightMode = d.flightMode;
    this.message = d.flightMode === "acro" ? "ACRO MODE" : "ASSIST MODE";
    this.messageTtl = 1.4;
  }

  snapshot(): HudSnapshot {
    const p = this.player;
    const d = p.drone;
    const ranked = [...this.racers].sort((a, b) => b.progress - a.progress);
    const position = ranked.indexOf(p) + 1;
    const gate = GATES[p.nextGate];
    const gDist = this.mode === "tutorial" ? 0 : dist(d.pos, gate.pos);
    const bearing = this.mode === "tutorial" ? 0 : Math.atan2(
      -(gate.pos[0] - d.pos[0]),
      -(gate.pos[2] - d.pos[2]),
    );

    return {
      phase: this.phase,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      speedKmh: Math.hypot(...d.vel) * 3.6,
      altitude: d.pos[1],
      throttle: d.throttle,
      flightMode: d.flightMode,
      lap: Math.min(p.lap, TOTAL_LAPS),
      totalLaps: TOTAL_LAPS,
      nextGate: p.nextGate,
      totalGates: GATES.length,
      position,
      racers: this.racers.length,
      gateDist: gDist,
      gateBearing: bearing - droneYaw(d),
      time: this.time,
      bestLap: p.bestLap,
      message: this.message,
      results: ranked.map((r) => ({
        name: r.name,
        time: r.finishTime,
        isPlayer: r.isPlayer,
        color: r.color,
      })),
      tutorialText:
        this.mode === "tutorial" && !this.tutorial.done
          ? `${this.tutorial.stepIndex + 1}/${6} — ${this.tutorial.step.text}`
          : "",
      tutorialHint:
        this.mode === "tutorial" && !this.tutorial.done
          ? this.tutorial.step.hint
          : "",
      tutorialDone: this.tutorial.done,
    };
  }
}
