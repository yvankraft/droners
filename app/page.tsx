"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { Suspense } from "react";
import Link from "next/link";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DroneModel } from "./components/game/DroneModel";

gsap.registerPlugin(ScrollTrigger);

const cards = [
  {
    title: "How to build a drone",
    body: "Learn to assemble a competition-grade FPV quad step by step — from bare carbon plates to a tuned, maiden-ready racer. No prior soldering or electronics experience needed.",
  },
  {
    title: 'The Project: JeNo 3" / 3.5"',
    body: "For this course, we have selected a frame that has become a benchmark in the community: the JeNo. Available in 3 or 3.5-inch versions, it strikes the perfect balance between the compactness of a small drone and the cinematic quality of larger rigs.",
  },
  {
    title: "Why this specific frame",
    body: "The JeNo is a high-performance open-source project born from the passion of French designers. Its 'Deadcat' geometry clears your field of view: no props will ever obstruct your HD footage. Its T700 carbon structure offers exceptional rigidity and durability.",
  },
];

const parts = [
  ["The Frame", 'JeNo 3" or 3.5" (carbon plates, hardware, TPU 3D prints)'],
  ["The Stack", "20x20 Mini Stack (combined FC & ESC), at least 35A"],
  ["Motors", '1404 to 1604 brushless motors (3" or 3.5")'],
  ["Video", "DJI O3, Walksnail, or an analog VTX system"],
  ["The Props", "HQProp or Ethix propellers matching your motor size"],
  ["Battery", "4S or 6S LiPo — 850mAh is the sweet spot"],
];

const steps = [
  ["Frame Assembly", "Carbon structure setup and arm securing"],
  ["The Electronic Heart", "Stack installation: ESC/FC orientation and data flow"],
  ["Propulsion & Soldering", "Motor mounting and wire management to prevent interference"],
  ["Video & Radio Link", "Setting up HD/analog transmission and the control link"],
  ["Software Configuration", "Betaflight flashing, flight modes, motor direction testing"],
];

export default function Home() {
  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>(".reveal").forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        y: 60,
        opacity: 0,
        duration: 0.9,
        delay: (i % 3) * 0.08,
        ease: "power2.out",
      });
    });
  }, []);

  return (
    <main className="bg-gradient-to-b from-sky-100 via-[#eef6ff] to-white text-slate-800">
      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/50 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="5" cy="5" r="2.5" />
              <circle cx="19" cy="5" r="2.5" />
              <circle cx="5" cy="19" r="2.5" />
              <circle cx="19" cy="19" r="2.5" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
              <path d="M7 7l2.5 2.5M17 7l-2.5 2.5M7 17l2.5-2.5M17 17l-2.5-2.5" />
            </svg>
            <span className="font-mono text-lg font-black tracking-[0.25em] text-slate-900">
              DRON<span className="text-emerald-500">ERS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="#course"
              className="rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-widest text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Course
            </a>
            <a
              href="#roadmap"
              className="hidden rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-widest text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              Roadmap
            </a>
            <Link
              href="/game"
              className="ml-2 rounded-lg bg-emerald-500 px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-600"
            >
              ▷ Play
            </Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="relative h-screen w-full">
        <Canvas camera={{ position: [0, 1.2, 7], fov: 45 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <hemisphereLight args={["#e8f4ff", "#7a9a5a", 1.2]} />
            <directionalLight position={[6, 8, 4]} intensity={1.8} color="#fff4e0" />
            <directionalLight position={[-5, 4, -4]} intensity={0.5} color="#cfe4ff" />
            <Float speed={2.4} rotationIntensity={0.4} floatIntensity={0.9}>
              <DroneModel targetSize={2.6} />
            </Float>
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1.4}
          />
        </Canvas>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 text-center">
          <h1 className="font-mono text-5xl font-black tracking-[0.25em] text-slate-900 drop-shadow-sm sm:text-7xl">
            DRON<span className="text-emerald-500">ERS</span>
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.4em] text-slate-500 sm:text-sm">
            Build it. Fly it. Race it.
          </p>
          <div className="pointer-events-auto mt-8 flex gap-4">
            <Link
              href="/game"
              className="rounded-xl bg-emerald-500 px-8 py-3 font-mono text-sm uppercase tracking-widest text-white shadow-lg shadow-emerald-400/40 transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              ▷ Play — FPV Racing
            </Link>
            <a
              href="#course"
              className="rounded-xl border border-slate-300 bg-white/80 px-8 py-3 font-mono text-sm uppercase tracking-widest text-slate-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-500 hover:text-emerald-600"
            >
              Build a drone ↓
            </a>
          </div>
        </div>
      </section>

      {/* course */}
      <section id="course" className="mx-auto max-w-6xl scroll-mt-20 px-8 py-24">
        <h2 className="reveal font-mono text-xs uppercase tracking-[0.4em] text-emerald-600">
          The course
        </h2>
        <p className="reveal mt-3 max-w-2xl text-4xl font-bold text-slate-900">
          From a pile of carbon to your first race gate.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <article
              key={c.title}
              className="reveal rounded-2xl border border-slate-200 bg-white/80 p-7 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
            >
              <h3 className="text-xl font-bold uppercase text-slate-900">
                {c.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{c.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          {/* parts list */}
          <div className="reveal rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur">
            <h3 className="text-xl font-bold uppercase text-slate-900">
              The essentials
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Before picking up the soldering iron, get the right parts.
            </p>
            <ul className="mt-5 space-y-3">
              {parts.map(([name, desc]) => (
                <li key={name} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span>
                    <strong className="text-slate-800">{name}:</strong>{" "}
                    <span className="text-slate-500">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* roadmap */}
          <div
            id="roadmap"
            className="reveal scroll-mt-24 rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur"
          >
            <h3 className="text-xl font-bold uppercase text-slate-900">
              Course roadmap
            </h3>
            <ol className="mt-6 space-y-0">
              {steps.map(([name, desc], i) => (
                <li key={name} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className="absolute left-[13px] top-7 h-full w-px bg-slate-200" />
                  )}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-mono text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-800">{name}</div>
                    <div className="text-sm text-slate-500">{desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* bottom CTA */}
      <section className="border-t border-slate-200 bg-slate-900 py-20 text-center">
        <h2 className="font-mono text-3xl font-black tracking-[0.2em] text-white">
          READY TO <span className="text-emerald-400">FLY</span>?
        </h2>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-slate-400">
          Tutorial · Free practice · 8-drone race
        </p>
        <Link
          href="/game"
          className="mt-8 inline-block rounded-xl bg-emerald-500 px-10 py-4 font-mono text-sm uppercase tracking-widest text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
        >
          ▷ Launch the simulator
        </Link>
      </section>
    </main>
  );
}
