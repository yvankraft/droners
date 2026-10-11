"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, DoubleSide, Group, Mesh, Vector3 } from "three";

const IDLE_SPIN = 16; // rad/s — props idle like an armed quad
const FULL_SPIN = 90; // rad/s at full throttle

export function DroneModel({
  targetSize = 0.55,
  getThrottle,
}: {
  /** Longest model dimension, in meters. */
  targetSize?: number;
  /** Live throttle getter — defaults to a gentle idle spin. */
  getThrottle?: () => number;
}) {
  const { scene } = useGLTF("/drone/scene.gltf");
  const spinners = useRef<(Group | null)[]>([]);

  const { model, props } = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);

    // The baked "Propellor_Lowpoly" mesh merges all 4 props into one rigid
    // mesh, so it can't spin. Hide it and recover each prop's center by
    // clustering its vertices into the 4 corner quadrants.
    const centers: { pos: Vector3; radius: number }[] = [];
    const baked = clone.getObjectByName("Propellor_Lowpoly");
    if (baked) {
      baked.visible = false;
      const quads = new Map<
        string,
        { min: Vector3; max: Vector3; sy: number; n: number }
      >();
      baked.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const pos = mesh.geometry.getAttribute("position");
        const v = new Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
          const key = `${v.x > 0 ? 1 : -1}:${v.z > 0 ? 1 : -1}`;
          let q = quads.get(key);
          if (!q) {
            q = { min: v.clone(), max: v.clone(), sy: 0, n: 0 };
            quads.set(key, q);
          }
          q.min.min(v);
          q.max.max(v);
          q.sy += v.y;
          q.n++;
        }
      });
      for (const q of quads.values()) {
        centers.push({
          pos: new Vector3(
            (q.min.x + q.max.x) / 2,
            q.sy / q.n,
            (q.min.z + q.max.z) / 2,
          ),
          radius: Math.max(q.max.x - q.min.x, q.max.z - q.min.z) / 2,
        });
      }
    }

    // The GLTF is authored tiny — normalize it to `targetSize` meters.
    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    box.getSize(size);
    const s = targetSize / Math.max(size.x, size.y, size.z);
    const c = new Vector3();
    box.getCenter(c);
    clone.scale.setScalar(s);
    clone.position.copy(c).multiplyScalar(-s);

    return {
      model: clone,
      props: centers.map(({ pos, radius }) => ({
        pos: pos.sub(c).multiplyScalar(s),
        radius: radius * s,
      })),
    };
  }, [scene, targetSize]);

  useFrame((_, delta) => {
    const t = Math.min(1, Math.max(0, getThrottle?.() ?? 0.2));
    const w = IDLE_SPIN + (FULL_SPIN - IDLE_SPIN) * t;
    for (let i = 0; i < spinners.current.length; i++) {
      const g = spinners.current[i];
      // Adjacent motors spin in opposite directions, like a real quad.
      if (g) g.rotation.y += w * delta * (i % 2 === 0 ? 1 : -1);
    }
  });

  return (
    // model nose faces +Z — flip it to face -Z (our forward convention)
    <group rotation={[0, Math.PI, 0]}>
      <primitive object={model} />
      {props.map(({ pos, radius: r }, i) => (
        <group key={i} position={pos}>
          {/* spinning blades */}
          <group
            ref={(g) => {
              spinners.current[i] = g;
            }}
          >
            {[0, Math.PI / 2].map((a) => (
              <mesh key={a} rotation={[0, a, 0]}>
                <boxGeometry args={[r * 2, r * 0.06, r * 0.16]} />
                <meshStandardMaterial color="#15181c" />
              </mesh>
            ))}
            <mesh>
              <cylinderGeometry args={[r * 0.1, r * 0.12, r * 0.12, 10]} />
              <meshStandardMaterial color="#2a2f36" />
            </mesh>
          </group>
          {/* translucent prop-blur disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, r * 0.02, 0]}>
            <circleGeometry args={[r, 24]} />
            <meshBasicMaterial
              color="#101418"
              transparent
              opacity={0.16}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/drone/scene.gltf");
