// Headless smoke test for the sim. Run: npx tsx lib/game/smoke.ts
import { RaceSim } from "./race";
import { NEUTRAL_INPUT } from "./types";

const inp = (t: number, p = 0, r = 0, y = 0) => ({
  ...NEUTRAL_INPUT,
  throttle: t,
  pitch: p,
  roll: r,
  yaw: y,
});
const DT = 1 / 120;
let fails = 0;
const check = (name: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`);
  if (!ok) fails++;
};
const finite = (v: number[]) => v.every(Number.isFinite);

// --- 1. Training: throttle up, drone climbs ---
{
  const sim = new RaceSim("training", { opponents: 0, flightMode: "assist" });
  for (let i = 0; i < 120 * 4; i++) sim.step(DT, inp(0.8));
  const d = sim.player.drone;
  check("assist climb", d.pos[1] > 5 && finite(d.pos), `alt=${d.pos[1].toFixed(1)}`);
}

// --- 2. Assist mode auto-levels: fly forward, stays stable ---
{
  const sim = new RaceSim("training", { opponents: 0, flightMode: "assist" });
  for (let i = 0; i < 120 * 6; i++) sim.step(DT, inp(0.55, -0.8));
  const d = sim.player.drone;
  const speed = Math.hypot(...d.vel);
  check(
    "assist forward flight",
    speed > 8 && d.pos[1] > 0.3 && d.pos[1] < 40 && finite(d.pos),
    `speed=${speed.toFixed(1)} alt=${d.pos[1].toFixed(1)}`,
  );
}

// --- 3. Acro mode: no NaN, can fly ---
{
  const sim = new RaceSim("training", { opponents: 0, flightMode: "acro" });
  for (let i = 0; i < 120 * 5; i++) sim.step(DT, inp(0.5, i % 240 < 120 ? -0.3 : 0.2));
  const d = sim.player.drone;
  check("acro stable-ish", finite(d.pos) && finite(d.vel) && finite(d.quat as unknown as number[]), `alt=${d.pos[1].toFixed(1)}`);
}

// --- 4. Race vs AI: countdown works, AIs progress through gates ---
{
  const sim = new RaceSim("race", { opponents: 7, flightMode: "assist" });
  check("race has 8 racers", sim.racers.length === 8);
  // step through countdown
  for (let i = 0; i < 120 * 4; i++) sim.step(DT, inp(0));
  check("countdown -> racing", sim.phase === "racing");

  // player idles, AIs race for 60 sim-seconds
  for (let i = 0; i < 120 * 60; i++) sim.step(DT, inp(0.35));
  const best = Math.max(...sim.racers.slice(1).map((r) => r.progress));
  const anyNaN = sim.racers.some((r) => !finite(r.drone.pos) || !finite(r.drone.vel));
  check("AI progressed", best > 2, `best progress=${best.toFixed(1)} gates`);
  check("no NaN states", !anyNaN);
  const laps = Math.max(...sim.racers.slice(1).map((r) => r.lap));
  console.log(`   AI best lap=${laps}, progress detail:`,
    sim.racers.slice(1).map((r) => `${r.name}:${r.progress.toFixed(1)}`).join(" "));
}

// --- 5. Respawn puts player at checkpoint ---
{
  const sim = new RaceSim("training", { opponents: 0, flightMode: "assist" });
  for (let i = 0; i < 120 * 4; i++) sim.step(DT, inp(0)); // countdown
  sim.player.drone.pos = [50, 30, 50];
  sim.step(DT, { ...inp(0), reset: true });
  check("respawn", sim.player.drone.pos[1] < 10, `alt=${sim.player.drone.pos[1].toFixed(1)}`);
}

// --- 6. Tutorial step 1 completes when holding ~3m ---
{
  const sim = new RaceSim("tutorial", { opponents: 0, flightMode: "assist" });
  for (let i = 0; i < 120 * 8 && sim.tutorial.stepIndex === 0; i++) {
    // hover controller like a real pilot would do
    const alt = sim.player.drone.pos[1];
    const t = Math.min(1, Math.max(0, 0.38 + (3.3 - alt) * 0.2));
    sim.step(DT, inp(t));
  }
  check("tutorial step1 -> step2", sim.tutorial.stepIndex >= 1, `step=${sim.tutorial.stepIndex}`);
}

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
