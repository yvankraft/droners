"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GATES, TOWER, TREES } from "@/lib/game/track";
import type { Vec3 } from "@/lib/game/types";

function Gate({
  pos,
  yaw,
  radius,
  state,
}: {
  pos: Vec3;
  yaw: number;
  radius: number;
  state: "next" | "upcoming" | "idle";
}) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    const mat = m.material as MeshStandardMaterial;
    if (state === "next") {
      mat.emissiveIntensity = 1.8 + Math.sin(clock.elapsedTime * 6) * 0.9;
    } else {
      mat.emissiveIntensity = state === "upcoming" ? 0.9 : 0.3;
    }
  });
  const color =
    state === "next" ? "#00ff66" : state === "upcoming" ? "#ff9500" : "#5a7a9a";
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh ref={ring}>
        <torusGeometry args={[radius, 0.14, 12, 40]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* gate posts */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (radius + 0.6), -pos[1] / 2, 0]}>
          <cylinderGeometry args={[0.07, 0.07, pos[1], 6]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
      ))}
    </group>
  );
}

export function TrackMesh({
  playerNextGate,
  tutorialTarget,
}: {
  playerNextGate: number;
  tutorialTarget: Vec3 | null;
}) {
  return (
    <group>
      {/* lighting — kept local, no CDN-dependent environment maps */}
      <hemisphereLight args={["#bcd6f5", "#4a7a35", 1.1]} />
      <directionalLight position={[60, 90, 40]} intensity={1.6} color="#fff4e0" />
      <directionalLight position={[-40, 50, -60]} intensity={0.4} color="#cfe4ff" />
      <fog attach="fog" args={["#a8c8ea", 90, 420]} />
      <color attach="background" args={["#87b5e3"]} />

      {/* grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[300, 48]} />
        <meshStandardMaterial color="#5da244" />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[600, 600]}
        cellSize={5}
        cellColor="#4c8a3a"
        sectionSize={25}
        sectionColor="#3d7530"
        fadeDistance={240}
        fadeStrength={2}
      />

      {/* start/finish line under gate 0 */}
      <group
        position={[GATES[0].pos[0], 0, GATES[0].pos[2]]}
        rotation={[0, GATES[0].yaw, 0]}
      >
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 1.6]} />
          <meshStandardMaterial color="#f2f2f2" />
        </mesh>
      </group>

      {/* race gates */}
      {GATES.map((g, i) => (
        <Gate
          key={i}
          pos={g.pos}
          yaw={g.yaw}
          radius={g.radius}
          state={
            i === playerNextGate
              ? "next"
              : i === (playerNextGate + 1) % GATES.length
                ? "upcoming"
                : "idle"
          }
        />
      ))}

      {/* tutorial target ring */}
      {tutorialTarget && (
        <mesh position={tutorialTarget}>
          <torusGeometry args={[2.4, 0.14, 12, 40]} />
          <meshStandardMaterial
            color="#ffcc33"
            emissive="#ffcc33"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* tower obstacle */}
      <mesh position={[TOWER.pos[0], TOWER.height / 2, TOWER.pos[2]]}>
        <cylinderGeometry args={[TOWER.radius, TOWER.radius * 1.3, TOWER.height, 10]} />
        <meshStandardMaterial color="#b8bfc9" />
      </mesh>
      <mesh position={[TOWER.pos[0], TOWER.height + 0.5, TOWER.pos[2]]}>
        <sphereGeometry args={[0.8, 10, 10]} />
        <meshStandardMaterial
          color="#ff3344"
          emissive="#ff3344"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* trees */}
      {TREES.map((t, i) => (
        <group key={i} position={t}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.25, 0.4, 2.4, 6]} />
            <meshStandardMaterial color="#7a5230" />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <coneGeometry args={[2.2, 6, 8]} />
            <meshStandardMaterial color="#2e7a32" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
