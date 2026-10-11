"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Euler, Quaternion, Vector3 } from "three";
import { RaceSim } from "@/lib/game/race";
import { InputController } from "@/lib/game/input";
import { DroneMesh } from "./DroneMesh";
import { TrackMesh } from "./TrackMesh";
import type {
  FlightMode,
  GameMode,
  HudSnapshot,
  Vec3,
} from "@/lib/game/types";

const FIXED_DT = 1 / 120;
const FPV_CAM_TILT = 0.35; // radians of camera up-tilt, like a real FPV cam

export interface GameConfig {
  mode: GameMode;
  opponents: number;
  flightMode: FlightMode;
}

function SimLoop({
  sim,
  input,
  paused,
  camMode,
  onHud,
  onVisual,
}: {
  sim: RaceSim;
  input: InputController;
  paused: boolean;
  camMode: React.MutableRefObject<"fpv" | "chase">;
  onHud: (s: HudSnapshot) => void;
  onVisual: (v: { nextGate: number; tutorialTarget: Vec3 | null }) => void;
}) {
  const acc = useRef(0);
  const hudAcc = useRef(0);
  const chasePos = useRef(new Vector3(0, 3, 8));
  const _q = useRef(new Quaternion());
  const _tilt = useRef(new Quaternion());
  const _v = useRef(new Vector3());
  const _look = useRef(new Vector3());

  useFrame((state, delta) => {
    const camera = state.camera as import("three").PerspectiveCamera;
    if (!paused) {
      acc.current = Math.min(acc.current + delta, 0.25);
      while (acc.current >= FIXED_DT) {
        sim.step(FIXED_DT, input.frame(FIXED_DT));
        acc.current -= FIXED_DT;
      }
    }

    // --- camera ---
    const d = sim.player.drone;
    _q.current.set(d.quat[0], d.quat[1], d.quat[2], d.quat[3]);
    if (camMode.current === "fpv") {
      camera.position.set(d.pos[0], d.pos[1] + 0.08, d.pos[2]);
      _tilt.current.setFromEuler(new Euler(FPV_CAM_TILT, 0, 0));
      camera.quaternion.copy(_q.current).multiply(_tilt.current);
    } else {
      // desired chase position = drone pos + offset in drone frame
      _look.current.set(d.pos[0], d.pos[1], d.pos[2]);
      const desired = _v.current
        .set(0, 1.4, 4.2)
        .applyQuaternion(_q.current)
        .add(_look.current);
      chasePos.current.lerp(desired, Math.min(1, 8 * delta));
      if (chasePos.current.y < 0.4) chasePos.current.y = 0.4;
      camera.position.copy(chasePos.current);
      camera.lookAt(
        d.pos[0] + d.vel[0] * 0.12,
        d.pos[1] + d.vel[1] * 0.12,
        d.pos[2] + d.vel[2] * 0.12,
      );
    }

    // speed-scaled FOV
    const speed = Math.hypot(...d.vel);
    const targetFov = 70 + Math.min(25, speed * 0.35);
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, 6 * delta);
      camera.updateProjectionMatrix();
    }

    hudAcc.current += delta;
    if (hudAcc.current > 0.1) {
      hudAcc.current = 0;
      onHud(sim.snapshot());
      onVisual({
        nextGate: sim.player.nextGate,
        tutorialTarget:
          sim.mode === "tutorial" ? sim.tutorial.currentTarget : null,
      });
    }
  });
  return null;
}

export function GameCanvas({
  cfg,
  input,
  paused,
  onHud,
  onLockLost,
  onToggleMode,
  onCamChange,
  lockRef,
}: {
  cfg: GameConfig;
  input: InputController;
  paused: boolean;
  onHud: (s: HudSnapshot) => void;
  onLockLost: () => void;
  onToggleMode: () => void;
  onCamChange: (m: "fpv" | "chase") => void;
  lockRef: React.MutableRefObject<(() => void) | null>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const sim = useMemo(
    () =>
      new RaceSim(cfg.mode, {
        opponents: cfg.opponents,
        flightMode: cfg.flightMode,
      }),
    [cfg],
  );
  const camMode = useRef<"fpv" | "chase">("fpv");
  const [visual, setVisual] = useState<{
    nextGate: number;
    tutorialTarget: Vec3 | null;
  }>({ nextGate: 0, tutorialTarget: null });

  useEffect(() => {
    const detach = input.attach(container.current!);
    input.onCameraToggle = () => {
      camMode.current = camMode.current === "fpv" ? "chase" : "fpv";
      onCamChange(camMode.current);
    };
    input.onModeToggle = () => {
      sim.toggleFlightMode();
      onToggleMode();
    };
    const onLockChange = () => {
      if (document.pointerLockElement !== container.current) onLockLost();
    };
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      detach();
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement) document.exitPointerLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLock = () => {
    container.current?.requestPointerLock();
  };
  lockRef.current = requestLock;

  return (
    <div
      ref={container}
      className="absolute inset-0 cursor-crosshair"
      onClick={requestLock}
    >
      <Canvas
        camera={{ position: [0, 3, 14], fov: 70, near: 0.05, far: 600 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <SimLoop
            sim={sim}
            input={input}
            paused={paused}
            camMode={camMode}
            onHud={onHud}
            onVisual={setVisual}
          />
          <TrackMesh
            playerNextGate={visual.nextGate}
            tutorialTarget={visual.tutorialTarget}
          />
          {sim.racers.map((r, i) => (
            <DroneMesh key={i} drone={r.drone} color={r.color} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
