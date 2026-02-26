"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Float } from "@react-three/drei";
import { Suspense, ReactNode } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useGLTF } from "@react-three/drei";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

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
  useGSAP(() => {
    // --- Tes animations de Scroll existantes ---
    const boxes = ["#box1", "#box2", "#box3", "#box4"];

    boxes.forEach((id) => {
      // Scroll Animation
      gsap.from(id, {
        scrollTrigger: {
          trigger: id,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        x: id === "#box1" || id === "#box3" ? -800 : 800,
        duration: 3,
      });

      // --- Hover Effect avec GSAP ---
      const element = document.querySelector(id);
      if (element) {
        element.addEventListener("mouseenter", () => {
          gsap.to(element, { scale: 1.05, duration: 0.3, ease: "power1.out" });
        });
        element.addEventListener("mouseleave", () => {
          gsap.to(element, { scale: 1, duration: 0.3, ease: "power1.in" });
        });
        element.addEventListener("mousedown", () => {
          gsap.to(element, { scale: 0.95, duration: 0.1 });
        });
        element.addEventListener("mouseup", () => {
          gsap.to(element, { scale: 1.05, duration: 0.1 });
        });
      }
    });
  }, []);

  return (
    <main className=" p-8">
      <section className="fixed h-screen w-screen inset-0 flex justify-center items-center bg-[linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,0.7))] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.7),rgba(255,255,255,0.7))] z-0">
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
      <section className="grid relative gap-[50vh]">
        <div
          id="box1"
          className=" w-1/3  p-8 relative z-20 
                backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 
                border border-slate-400 dark:border-slate-700 
                rounded-2xl shadow-2xl mt-[50vh] mr-0 ml-auto"
        >
          <h2 className="text-3xl font-bold uppercase mb-4 dark:text-white">
            how to build a drone
          </h2>
          <p className="dark:text-slate-400">
            For this course, we have selected a frame that has become a
            benchmark in the community: the JeNo. Available in 3 or 3.5-inch
            versions, this model strikes the perfect balance for those seeking
            the compactness of a small drone without sacrificing the power and
            cinematic quality of larger rigs. It is the ideal learning
            platform—forgiving of mistakes yet capable of competition-level
            performance.
          </p>
        </div>
        <div
          id="box2"
          className=" w-1/3  p-8 relative z-20 
                backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 
                border border-slate-400 dark:border-slate-700 
                rounded-2xl shadow-2xl"
        >
          <h2 className="text-3xl font-bold uppercase mb-4 dark:text-white">
            The Project: JeNo 3" / 3.5
          </h2>
          <p className="dark:text-slate-400">
            For this course, we have selected a frame that has become a
            benchmark in the community: the JeNo. Available in 3 or 3.5-inch
            versions, this model strikes the perfect balance for those seeking
            the compactness of a small drone without sacrificing the power and
            cinematic quality of larger rigs. It is the ideal learning
            platform—forgiving of mistakes yet capable of competition-level
            performance.
          </p>
        </div>
        <div
          id="box3"
          className=" w-1/3  p-8 relative z-20 
                backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 
                border border-slate-400 dark:border-slate-700 
                rounded-2xl shadow-2xl  mr-0 ml-auto"
        >
          <h2 className="text-3xl font-bold uppercase mb-4 dark:text-white">
            Why this specific frame
          </h2>
          <p className="dark:text-slate-400">
            The JeNo is a high-performance 'Open Source' project born from the
            passion of French designers. Unlike generic industrial products, its
            'Deadcat' geometry was engineered to clear your field of view: no
            props will ever obstruct your HD footage. Its T700 carbon structure
            offers exceptional rigidity, making it easier to tune your flight
            controller and ensuring maximum durability during intense freestyle
            sessions.
          </p>
        </div>
        <div
          id="box4"
          className=" w-1/3  p-8 relative z-20 
                backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 
                border border-slate-400 dark:border-slate-700 
                rounded-2xl shadow-2xl"
        >
          <h2 className="text-3xl font-bold uppercase mb-4 dark:text-white">
            The Essentials:
          </h2>
          <p className="dark:text-slate-400">
            Before picking up the soldering iron, the very first step is getting
            the right parts, Here is the essentials to get started.
          </p>
          <ul className=" dark:text-white list-disc list-inside mt-1">
            <li>
              <strong>The Frame:</strong> JeNo 3" or 3.5" (Carbon plates,
              hardware, and TPU 3D prints)
            </li>
            <li>
              <strong>The Stack:</strong> 20x20 Mini Stack (Combined FC & ESC)
              capable of at least 35A.
            </li>
            <li>
              <strong>Motors:</strong> 1404 to 1604 brushless motors (depending
              on 3" or 3.5" choice.
            </li>
            <li>
              <strong>Digital/Analog VTX:</strong> DJI O3, Walksnail, or Analog
              system for your video feed.
            </li>
            <li>
              <strong> The Props:</strong>
              HQProp or Ethix propellers matching your motor size.
            </li>
            <li>
              Battery: 4S or 6S LiPo (850mAh is the sweet spot for this build).
            </li>
          </ul>
        </div>
        <div id="box5" className="h-[40vh] w-full p-8 bg-white rounded-2xl">
          Course Roadmap
          <p>
            Step 1: Frame Assembly (Carbon structure setup and arm securing).
            Step 2: The Electronic Heart (Stack installation: ESC/FC orientation
            and data flow). Step 3: Propulsion & Soldering (Motor mounting and
            critical wire management to prevent interference). Step 4: Video &
            Radio Link (Setting up HD/Analog transmission and the control link).
            Step 5: Software Configuration (Betaflight flashing, flight modes
            setup, and motor direction testing).
          </p>
        </div>
      </section>
    </main>
  );
}
