"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Float } from "@react-three/drei";
import { Suspense, ReactNode } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useGLTF } from "@react-three/drei";
import { useRef } from "react";

function SingleModel({ url, position }: { url: string; position: number[] }) {
  const meshRef = useRef(null);
  const { scene } = useGLTF(url);
  return (
    <Float speed={2} rotationIntensity={0.5}>
      <primitive
        ref={meshRef}
        object={scene.clone()}
        position={position}
        rotation={[0, Math.PI, 0]}
        scale={100}
      />
    </Float>
  );
}

export default function Home() {
  return (
    <main className="bg-[rgba(0,0,0,0,7)]">
      <section className="h-screen absolute w-screen  flex justify-center items-center bg-[linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,0.7))]">
        <Canvas camera={{ position: [0, 2, 20], fov: 60 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight intensity={1}>
              <Stage
                intensity={0.5}
                environment="night"
                adjustCamera={false}
                shadows={false}
              >
                <SingleModel url="/drone/scene.gltf" position={[0, 0, 0]} />
              </Stage>
            </directionalLight>
          </Suspense>
          <OrbitControls enableZoom={false} makeDefault />
        </Canvas>
      </section>
      <section>
        <div>
          <h1>how to build a drone</h1>
          <p>in this Page we are going to learn how to build a drone</p>
        </div>
        <div>
          <h1>for this cours we going to build a ... model.</h1>
        </div>
      </section>
    </main>
  );
}
