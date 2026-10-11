"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Quaternion } from "three";
import type { DroneState } from "@/lib/game/types";
import { DroneModel } from "./DroneModel";

// The GLTF model is normalized to a ~0.55 m quad and rotated so its
// visual nose aligns with our -Z forward convention.
const TARGET_SIZE = 0.55;

export function DroneMesh({
  drone,
  color,
}: {
  drone: DroneState;
  color: string;
}) {
  const group = useRef<Group>(null);
  const _q = useRef(new Quaternion());

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.set(drone.pos[0], drone.pos[1], drone.pos[2]);
    _q.current.set(
      drone.quat[0],
      drone.quat[1],
      drone.quat[2],
      drone.quat[3],
    );
    g.quaternion.copy(_q.current);
  });

  return (
    <group ref={group}>
      <DroneModel targetSize={TARGET_SIZE} getThrottle={() => drone.throttle} />
      {/* LED strip for identifying racers */}
      <mesh position={[0, -0.06, 0.18]}>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.5}
        />
      </mesh>
    </group>
  );
}
