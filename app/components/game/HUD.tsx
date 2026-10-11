"use client";
import type { HudSnapshot } from "@/lib/game/types";
import type { InputController } from "@/lib/game/input";

function fmtTime(t: number | null): string {
  if (t === null) return "--:--";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

const chip = "rounded-lg bg-slate-900/55 px-3 py-2 backdrop-blur-sm";

export function HUD({
  hud,
  camMode,
  input,
}: {
  hud: HudSnapshot;
  camMode: string;
  input: InputController;
}) {
  const bearingDeg = (hud.gateBearing * 180) / Math.PI;
  const stick = input.stick;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none font-mono text-white">
      {/* crosshair */}
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/70" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/70" />
      </div>

      {/* telemetry — top left */}
      <div className={`absolute left-5 top-5 space-y-1 ${chip}`}>
        <div className="text-5xl font-bold tabular-nums">
          {hud.speedKmh.toFixed(0)}
          <span className="ml-1 text-lg text-white/60">km/h</span>
        </div>
        <div className="text-sm text-white/70">
          ALT {hud.altitude.toFixed(1)}m
        </div>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>THR</span>
          <div className="h-2 w-28 overflow-hidden rounded bg-white/20">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${hud.throttle * 100}%` }}
            />
          </div>
          <span>{(hud.throttle * 100).toFixed(0)}%</span>
        </div>
        <div className="pt-1 text-xs uppercase tracking-widest text-amber-300">
          {hud.flightMode} · {camMode} cam
        </div>
      </div>

      {/* race status — top right */}
      {hud.totalGates > 0 && hud.racers > 0 && (
        <div className={`absolute right-5 top-5 text-right ${chip}`}>
          {hud.racers > 1 && (
            <div className="text-4xl font-bold">
              P{hud.position}
              <span className="text-lg text-white/50">/{hud.racers}</span>
            </div>
          )}
          <div className="text-sm text-white/70">
            LAP {hud.lap}/{hud.totalLaps} · GATE {hud.nextGate + 1}/
            {hud.totalGates}
          </div>
          <div className="text-sm tabular-nums text-white/70">
            {fmtTime(hud.time)}
          </div>
          {hud.bestLap !== null && (
            <div className="text-xs text-emerald-300">
              BEST {fmtTime(hud.bestLap)}
            </div>
          )}
        </div>
      )}

      {/* next gate compass — bottom center */}
      {hud.phase === "racing" && hud.totalGates > 0 && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          <div
            className="mx-auto text-3xl transition-transform"
            style={{ transform: `rotate(${bearingDeg}deg)` }}
          >
            ▲
          </div>
          <div className="text-xs">{hud.gateDist.toFixed(0)}m</div>
        </div>
      )}

      {/* right-stick position widget — bottom right */}
      <div className={`absolute bottom-5 right-5 ${chip}`}>
        <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-white/60">
          stick · right-click center
        </div>
        <div className="relative h-20 w-20 rounded border border-white/25">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/20" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/20" />
          <div
            className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]"
            style={{
              left: `${50 + stick.roll * 44}%`,
              top: `${50 + stick.pitch * 44}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      {/* center messages */}
      {(hud.message || hud.phase === "countdown") && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center">
          <div className="text-7xl font-black tracking-widest text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            {hud.phase === "countdown" ? hud.countdown : hud.message}
          </div>
        </div>
      )}

      {/* tutorial panel */}
      {hud.tutorialText && (
        <div className="absolute left-1/2 top-8 w-[34rem] max-w-[90vw] -translate-x-1/2 rounded-xl border border-emerald-400/40 bg-slate-900/70 p-4 backdrop-blur">
          <div className="text-lg font-bold text-emerald-300">
            {hud.tutorialText}
          </div>
          <div className="mt-1 text-sm text-white/70">{hud.tutorialHint}</div>
        </div>
      )}

      {/* controls */}
      <div className="absolute bottom-4 left-5 rounded-lg bg-slate-900/45 px-2 py-1 text-[11px] leading-5 text-white/70 backdrop-blur-sm">
        MOUSE pitch/roll · RIGHT-CLICK center · W/S throttle · A/D yaw · R
        respawn · C camera · M {hud.flightMode === "assist" ? "→ acro" : "→ assist"}{" "}
        · ESC pause
        <br />
        <span className="text-white/50">
          PAD: right stick pitch/roll · left stick throttle/yaw · A respawn · Y
          camera · B mode · START pause
        </span>
      </div>
    </div>
  );
}
