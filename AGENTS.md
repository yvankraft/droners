# Droners

FPV drone racing game — Next.js 16 + React 19 + React Three Fiber + Tailwind 4.

## Structure

- `app/` — routes. `/` is the landing page, `/game` is the game.
- `app/components/game/` — React/R3F layer (canvas, drone & track meshes, HUD, menu).
- `lib/game/` — **pure simulation, no React**. Designed so every drone (player,
  AI, future remote player) is driven by the same `InputFrame` — this is the
  foundation for the planned 8-player online mode:
  - `types.ts` — `InputFrame`, `DroneState`, `RacerState`, `HudSnapshot`
  - `physics.ts` — `stepDrone(state, input, dt)`; `assist` (angle mode,
    auto-levels) and `acro` (rate mode, true FPV). Fixed-step at 120 Hz.
  - `track.ts` — 12-gate closed circuit, 8-slot spawn grid, racing line helpers
  - `ai.ts` — `AIPilot` produces `InputFrame` via gate-target pursuit +
    exit-lead apex cutting + tilt-compensated throttle + separation steering.
    Per-AI skill (top speed, gains).
  - `input.ts` — keyboard/mouse/gamepad → `InputFrame` (pointer lock; mouse =
    pitch/roll stick that holds its position, right-click/X centers,
    W/S = non-centering throttle, A/D = yaw; Gamepad API polled in `frame()`)
  - `tutorial.ts` — scripted objective steps
  - `race.ts` — `RaceSim` orchestrator: countdown, gate/checkpoint logic, laps,
    live ranking, respawn, HUD snapshots
  - `smoke.ts` — headless sim test

## Controls

Mouse = pitch/roll stick (**keeps its deflection, no spring-back**) ·
right-click or X = center stick · W/S = throttle · A/D = yaw · R = respawn ·
C = FPV/chase cam · M = assist/acro · ESC = pause. Click the view to capture
the mouse. The HUD shows a live right-stick widget (bottom right).

Gamepad (standard mapping) also works: right stick = pitch/roll, left stick =
throttle nudge + yaw, A = respawn, B = mode, X = center stick, Y = camera,
Start/Back = pause. Non-"standard" devices (USB radios) get absolute
throttle on left Y. A moved pad wins over the mouse for ~1.5 s (`PAD_LATCH_MS`).

## Verify

```bash
npm run test:sim   # headless physics/AI/race smoke test (tsx, no browser)
npx tsc --noEmit
npx eslint app lib
npm run dev        # http://localhost:3000/game
```

## Conventions / gotchas

- Forward is **local -Z**; yaw `+1` = turn right = heading **decreases**
  (heading is the euler-Y in `DroneState`).
- Sim mutates `DroneState` in place for the hot loop; React reads via refs in
  `useFrame`, HUD gets a 10 Hz `HudSnapshot`.
- No drei `Environment`/`Stage` presets anywhere — they fetch HDRIs from a
  CDN at runtime; all scenes use explicit lights + fog instead.
- The GLTF's `Propellor_Lowpoly` mesh merges all 4 props into one rigid mesh.
  `DroneModel` hides it and renders 4 animated props at the motor positions
  (constants measured in GLTF model space) — idle spin + throttle-scaled.
