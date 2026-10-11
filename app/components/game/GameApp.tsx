"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type GameConfig } from "./GameCanvas";
import { HUD } from "./HUD";
import { InputController } from "@/lib/game/input";
import type { FlightMode, HudSnapshot } from "@/lib/game/types";

const btn =
  "pointer-events-auto rounded-xl border border-slate-300 bg-white px-6 py-3 font-mono text-sm uppercase tracking-widest text-slate-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600";

const btnPrimary =
  "pointer-events-auto rounded-xl border border-emerald-500 bg-emerald-500 px-6 py-3 font-mono text-sm uppercase tracking-widest text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600";

export function GameApp() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [cfg, setCfg] = useState<GameConfig>({
    mode: "race",
    opponents: 7,
    flightMode: "assist",
  });
  const [flightMode, setFlightMode] = useState<FlightMode>("assist");
  const [opponents, setOpponents] = useState(7);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const [camMode, setCamMode] = useState<"fpv" | "chase">("fpv");
  const [session, setSession] = useState(0);
  const lockRef = useRef<(() => void) | null>(null);
  // Fresh controller per session so throttle/stick reset on restart.
  const [input, setInput] = useState(() => new InputController());

  const start = (mode: GameConfig["mode"]) => {
    setCfg({ mode, opponents: mode === "race" ? opponents : 0, flightMode });
    setPaused(false);
    setHud(null);
    setInput(new InputController());
    setSession((s) => s + 1);
    setScreen("game");
  };

  const onLockLost = useCallback(() => {
    setPaused(true);
  }, []);

  useEffect(() => {
    if (hud?.tutorialDone && screen === "game") {
      try {
        localStorage.setItem("droners.tutorialDone", "1");
      } catch {}
    }
  }, [hud?.tutorialDone, screen]);

  useEffect(() => {
    if (hud?.bestLap !== null && hud?.bestLap !== undefined) {
      try {
        const prev = Number(localStorage.getItem("droners.bestLap") ?? "inf");
        if (hud.bestLap < prev)
          localStorage.setItem("droners.bestLap", String(hud.bestLap));
      } catch {}
    }
  }, [hud?.bestLap]);

  if (screen === "menu") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-b from-sky-100 via-[#eef6ff] to-white font-mono text-slate-800">
        <div className="text-center">
          <h1 className="text-7xl font-black tracking-[0.3em] text-slate-900">
            DRON<span className="text-emerald-500">ERS</span>
          </h1>
          <p className="mt-3 text-sm tracking-[0.4em] text-slate-500">
            FPV RACING SIMULATOR
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/60 bg-white/70 px-10 py-6 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
            Flight mode
            {(["assist", "acro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFlightMode(m)}
                className={`${btn} ${flightMode === m ? "border-emerald-500 bg-emerald-500 text-white" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
            Opponents
            <input
              type="range"
              min={1}
              max={7}
              value={opponents}
              onChange={(e) => setOpponents(Number(e.target.value))}
              className="pointer-events-auto accent-emerald-500"
            />
            <span className="w-4 font-bold text-emerald-600">{opponents}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className={btnPrimary} onClick={() => start("race")}>
            ▷ Race — {opponents + 1} drones · 3 laps
          </button>
          <button className={btn} onClick={() => start("training")}>
            ▷ Training — free practice
          </button>
          <button className={btn} onClick={() => start("tutorial")}>
            ▷ Tutorial
          </button>
        </div>

        <div className="max-w-lg rounded-xl border border-white/60 bg-white/60 p-4 text-center text-[11px] leading-5 text-slate-500 backdrop-blur">
          <span className="font-bold text-slate-700">Radio-style controls</span>
          <br />
          MOUSE = pitch/roll stick (keeps its position) · RIGHT CLICK or X =
          center stick · W/S = throttle · A/D = yaw
          <br />
          <span className="font-bold text-slate-700">Gamepad supported</span> —
          right stick = pitch/roll · left stick = throttle/yaw · A = respawn ·
          Y = camera · B = flight mode · START = pause
          <br />
          R = respawn · C = camera · M = flight mode · ESC = pause. Click the
          game view to capture the mouse.
        </div>
      </div>
    );
  }

  const finished = hud?.phase === "finished";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-sky-200">
      <GameCanvas
        key={session}
        cfg={cfg}
        input={input}
        paused={paused}
        onHud={setHud}
        onLockLost={onLockLost}
        onToggleMode={() => setFlightMode((m) => (m === "assist" ? "acro" : "assist"))}
        onCamChange={setCamMode}
        lockRef={lockRef}
      />
      {hud && <HUD hud={hud} camMode={camMode} input={input} />}

      {/* pause overlay */}
      {paused && !finished && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="font-mono text-3xl font-bold tracking-widest text-white">
            PAUSED
          </div>
          <button
            className={btn}
            onClick={() => {
              setPaused(false);
              lockRef.current?.();
            }}
          >
            Resume
          </button>
          <button className={btn} onClick={() => start(cfg.mode)}>
            Restart
          </button>
          <button className={btn} onClick={() => setScreen("menu")}>
            Quit to menu
          </button>
        </div>
      )}

      {/* results overlay */}
      {finished && hud && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-slate-900/60 backdrop-blur-sm">
          <div className="font-mono text-4xl font-black tracking-widest text-emerald-400">
            {cfg.mode === "tutorial"
              ? "TUTORIAL COMPLETE"
              : hud.results[0]?.isPlayer
                ? "VICTORY"
                : `P${hud.position} — FINISH`}
          </div>
          {cfg.mode !== "tutorial" && (
            <div className="w-72 rounded-xl bg-slate-900/70 p-4 font-mono text-sm">
              {hud.results.map((r, i) => (
                <div
                  key={i}
                  className={`flex justify-between border-b border-white/10 py-1 ${r.isPlayer ? "text-emerald-300" : "text-white/70"}`}
                >
                  <span>
                    {i + 1}.{" "}
                    <span style={{ color: r.color }}>{r.name}</span>
                  </span>
                  <span className="tabular-nums">
                    {r.time !== null
                      ? `${Math.floor(r.time / 60)}:${(r.time % 60).toFixed(2).padStart(5, "0")}`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button className={btn} onClick={() => start(cfg.mode)}>
              Again
            </button>
            <button className={btn} onClick={() => setScreen("menu")}>
              Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
