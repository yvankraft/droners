"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Float } from "@react-three/drei";
import { Suspense, ReactNode } from "react";

type SceneProps = {
  fov: number;
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

const scenes = ({
  fov = 45,
  children,
  position,
  rotation,
  scale,
}: SceneProps) => {
  return (
    <div className="relative h-screen bg-transparent w-screen">
      <Canvas camera={{ position: [0, 0, 5], fov: fov }}>
        <Suspense fallback={null}>
          <Stage
            intensity={0.5}
            environment="night"
            adjustCamera={true}
            position={position}
            rotation={rotation}
            scale={scale}
            shadows={false}
          >
            {children}
          </Stage>
        </Suspense>
        <OrbitControls enableZoom={false} makeDefault />
      </Canvas>
    </div>
  );
};

export default scenes;
