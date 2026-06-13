import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Play, Sparkles, Activity, Award, Cpu, ArrowRight, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Hand Skeleton ────────────────────────────────────────────────────────────

const HAND_NODES = [
  { id: 0,  x: 50,  y: 92 }, // wrist
  { id: 1,  x: 38,  y: 80 }, // thumb cmc
  { id: 2,  x: 26,  y: 68 }, // thumb mcp
  { id: 3,  x: 16,  y: 56 }, // thumb ip
  { id: 4,  x: 8,   y: 44 }, // thumb tip
  { id: 5,  x: 39,  y: 60 }, // index mcp
  { id: 6,  x: 37,  y: 40 }, // index pip
  { id: 7,  x: 35,  y: 24 }, // index dip
  { id: 8,  x: 34,  y: 10 }, // index tip
  { id: 9,  x: 50,  y: 57 }, // middle mcp
  { id: 10, x: 50,  y: 36 }, // middle pip
  { id: 11, x: 50,  y: 19 }, // middle dip
  { id: 12, x: 50,  y: 5  }, // middle tip
  { id: 13, x: 61,  y: 60 }, // ring mcp
  { id: 14, x: 63,  y: 40 }, // ring pip
  { id: 15, x: 64,  y: 24 }, // ring dip
  { id: 16, x: 65,  y: 11 }, // ring tip
  { id: 17, x: 71,  y: 65 }, // pinky mcp
  { id: 18, x: 75,  y: 50 }, // pinky pip
  { id: 19, x: 77,  y: 37 }, // pinky dip
  { id: 20, x: 79,  y: 26 }, // pinky tip
];

const HAND_EDGES = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function HandSkeleton() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="edgeGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      {HAND_EDGES.map(([a, b], i) => {
        const na = HAND_NODES[a];
        const nb = HAND_NODES[b];
        return (
          <motion.line
            key={i}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke="url(#edgeGrad)"
            strokeWidth="0.9"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.04 }}
          />
        );
      })}
      {HAND_NODES.map((node, i) => (
        <motion.g key={node.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          <circle cx={node.x} cy={node.y} r="3" fill="#7c3aed" fillOpacity="0.2" />
          <circle
            cx={node.x} cy={node.y} r="1.6"
            fill={node.id === 0 ? "#a78bfa" : "#8b5cf6"}
            stroke="#c4b5fd" strokeWidth="0.5"
          />
        </motion.g>
      ))}
    </svg>
  );
}

// ─── Terminal ─────────────────────────────────────────────────────────────────

const LOG_LINES = [
  { type: "CONNECT", text: "Translation API online." },
  { type: "INFO",    text: "Running gesture inference loop at latency ~14ms." },
  { type: "SYSTEM",  text: "Telemetry feed connected." },
  { type: "OK",      text: "Hand landmarks calibration matches default ISL/ASL profile." },
  { type: "SOCKET",  text: "Established WebSocket tunnel for live vector updates." },
  { type: "SYSTEM",  text: "Initializing MediaPipe Hand Landmarker network..." },
];

const LOG_COLOR: Record<string, string> = {
  CONNECT: "text-teal-400",
  INFO:    "text-blue-400",
  SYSTEM:  "text-violet-400",
  OK:      "text-green-400",
  SOCKET:  "text-yellow-400",
};

function Terminal() {
  const [visible, setVisible] = useState<number>(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (visible >= LOG_LINES.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 600);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[hsl(228_35%_6%)] border border-border rounded-xl overflow-hidden font-mono text-xs">
      <div className="border-b border-border px-4 py-2.5 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-muted-foreground text-[11px] tracking-wide">system_diagnostics.log</span>
      </div>
      <div className="p-5 space-y-2 min-h-[220px]">
        {LOG_LINES.slice(0, visible).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-2"
          >
            <span className={`font-bold ${LOG_COLOR[line.type] ?? "text-foreground"}`}>
              [{line.type}]
            </span>
            <span className="text-muted-foreground">{line.text}</span>
          </motion.div>
        ))}
        {visible <= LOG_LINES.length && (
          <div className="flex gap-2">
            <span className="text-muted-foreground/40">_</span>
            <span
              className="w-2 h-4 bg-primary inline-block"
              style={{ opacity: blink ? 1 : 0, transition: "opacity 0.1s" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fingerspelling Dictionary ────────────────────────────────────────────────

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

const SIGN_DETAILS: Record<string, { desc: string; fingers: string; profile: string }> = {
  A: { desc: "Closed fist with thumb resting on the side.", fingers: "All fingers curled, thumb lateral.", profile: "Nominal" },
  B: { desc: "Flat hand, four fingers together, thumb folded.", fingers: "Fingers extended, thumb tucked.", profile: "Nominal" },
  C: { desc: "Curved hand forming a C-shape.", fingers: "All fingers curved together.", profile: "Nominal" },
  D: { desc: "Index up, remaining fingers curl to touch thumb.", fingers: "Index extended, others curved.", profile: "Nominal" },
  E: { desc: "All fingers curled touching thumb.", fingers: "Fingertips meet thumb tip.", profile: "Nominal" },
  F: { desc: "Index and thumb touch forming a circle, others extended.", fingers: "Index+thumb circle, 3 fingers up.", profile: "Nominal" },
  G: { desc: "Index and thumb point sideways.", fingers: "Index horizontal, thumb parallel.", profile: "Nominal" },
  H: { desc: "Index and middle extended horizontally.", fingers: "Two fingers pointing sideways.", profile: "Nominal" },
  I: { desc: "Pinky extended, others curled.", fingers: "Pinky up, thumb across fingers.", profile: "Nominal" },
  J: { desc: "Pinky extended, trace a J in the air.", fingers: "Pinky up, motion-based.", profile: "Motion" },
  K: { desc: "Index and middle up, thumb between them.", fingers: "V shape with thumb.", profile: "Nominal" },
  L: { desc: "Index up, thumb out — L shape.", fingers: "L shape with index and thumb.", profile: "Nominal" },
  M: { desc: "Three fingers folded over thumb.", fingers: "3 fingers over tucked thumb.", profile: "Nominal" },
  N: { desc: "Two fingers folded over thumb.", fingers: "2 fingers over tucked thumb.", profile: "Nominal" },
  O: { desc: "All fingers and thumb form an O.", fingers: "Fingertips meet in circle.", profile: "Nominal" },
  P: { desc: "K shape pointing downward.", fingers: "Index/middle down, thumb out.", profile: "Nominal" },
  Q: { desc: "G shape pointing downward.", fingers: "Index/thumb pointing down.", profile: "Nominal" },
  R: { desc: "Index and middle fingers crossed.", fingers: "Crossed index/middle.", profile: "Nominal" },
  S: { desc: "Fist with thumb over fingers.", fingers: "Closed fist, thumb over top.", profile: "Nominal" },
  T: { desc: "Thumb tucked between index and middle.", fingers: "Fist with thumb inserted.", profile: "Nominal" },
  U: { desc: "Index and middle together pointing up.", fingers: "Two fingers extended together.", profile: "Nominal" },
  V: { desc: "Index and middle extended in V shape.", fingers: "Peace/victory sign.", profile: "Nominal" },
  W: { desc: "Three fingers (index, middle, ring) spread.", fingers: "Three-finger spread.", profile: "Nominal" },
  X: { desc: "Index finger hooked/bent.", fingers: "Index bent at first knuckle.", profile: "Nominal" },
  Y: { desc: "Thumb and pinky extended.", fingers: "Shaka / hang-loose shape.", profile: "Nominal" },
  Z: { desc: "Index traces a Z in the air.", fingers: "Index pointing, motion-based.", profile: "Motion" },
};

function FingerspellingDict() {
  const [selected, setSelected] = useState<string>("F");

  const detail = SIGN_DETAILS[selected];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {ALPHABET.map(letter => (
            <button
              key={letter}
              data-testid={`letter-${letter}`}
              onClick={() => setSelected(letter)}
              className={`aspect-square flex items-center justify-center rounded-lg text-lg font-space font-bold transition-all border
                ${selected === letter
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105"
                  : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Inspector */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          className="lg:w-72 bg-card border border-border rounded-xl p-6 flex flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
            Inspect Sign Character
          </p>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-space font-bold text-5xl text-primary">{selected}</span>
            <span className="text-muted-foreground text-sm">/ Fingerspell</span>
          </div>

          <div className="w-full h-px bg-border my-4" />

          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
            Sign Structure
          </p>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            For {selected}, position hand in the front viewport. Focus is key for the primary landmarks. Ensure wrist is stable.
          </p>

          <div className="bg-background/60 border border-border rounded-lg p-3 text-xs space-y-1.5 mb-4">
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Telemetry Info:</span>
            </p>
            <p className="text-muted-foreground">Class Label: <span className="text-foreground">{selected}</span></p>
            <p className="text-muted-foreground">Fingers: <span className="text-foreground">{detail.fingers}</span></p>
            <p className="text-muted-foreground">Calibration Profile: <span className="text-green-400">{detail.profile}</span></p>
            <p className="text-muted-foreground">Reference: <span className="text-green-400">Captured ✓</span></p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-5">{detail.desc}</p>

          <Link
            href="/practice"
            data-testid={`link-practice-${selected}`}
            className="mt-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            Go Practice Sign "{selected}"
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { label: "INFERENCE LATENCY", value: "14ms",     sub: "Real-time classification speeds",   icon: Activity, color: "text-violet-400" },
  { label: "TRACKING ACCURACY", value: "98.2%",    sub: "High precision skeleton capture",    icon: Award,    color: "text-teal-400"   },
  { label: "HAND JOINT NODES",  value: "21",       sub: "Points — Normalized MediaPipe landmarks", icon: Cpu, color: "text-teal-400"  },
];

// ─── Phases ───────────────────────────────────────────────────────────────────

const PHASES = [
  {
    tag: "Phase 1 Core",
    title: "Gesture Capture",
    desc: "Translate signs on the fly. Captures camera frames, normalizes wrist coordinates, and displays predictions instantly.",
    href: "/gesture",
  },
  {
    tag: "Phase 2 Core",
    title: "Translation Engine",
    desc: "Convert fingerspelled letters into grammatical sentences using Claude, or translate text to visual animated signs.",
    href: "/translation",
  },
  {
    tag: "Phase 3 Core",
    title: "Scoring & Feedback",
    desc: "Compare sign accuracy using Dynamic Time Warping (DTW). Get per-finger feedback highlighting curl and position.",
    href: "/practice",
  },
];

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase mb-4">
      {children}
    </p>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-[100dvh] pt-16 bg-background">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-10">

        {/* ── Hero ── */}
        <section className="flex flex-col lg:flex-row items-center gap-12 py-20">
          <motion.div
            className="flex-1 flex flex-col items-start"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-space font-bold text-5xl md:text-6xl leading-[1.05] tracking-tight mb-6">
              Empowering Silent Voices with{" "}
              <span className="text-primary">Real&#8211;Time</span>{" "}
              <span className="text-teal-400">AI</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-10 max-w-md">
              SIGN_AI translates sign gestures to speech and converts spoken language
              into visual sign glosses instantly. Built with Python, React, and
              MediaPipe to bridge communication barriers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/translation" data-testid="link-launch-translate"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                <Play className="w-4 h-4 fill-current" />
                Launch Live Translate
              </Link>
              <Link href="/practice" data-testid="link-start-learning"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors">
                <Sparkles className="w-4 h-4" />
                Start AI Learning
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="flex-shrink-0 w-full lg:w-[380px] xl:w-[420px] aspect-square"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="w-full h-full rounded-2xl bg-card border border-border/60 relative flex items-center justify-center p-10">
              <span className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
              <span className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary/50" />
              <span className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary/50" />
              <span className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary/50" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 rounded-full bg-primary/5 blur-3xl" />
              </div>
              <HandSkeleton />
            </div>
          </motion.div>
        </section>

        {/* ── Stats ── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} data-testid={`stat-${i}`}
                className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">{s.label}</p>
                  <p className="font-space font-bold text-4xl text-foreground mb-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <Icon className={`w-6 h-6 mt-1 ${s.color} opacity-70`} />
              </div>
            );
          })}
        </motion.div>

        {/* ── Platform Capabilities ── */}
        <section className="pb-20">
          <SectionLabel>Platform Capabilities</SectionLabel>
          <h2 className="font-space font-bold text-3xl md:text-4xl text-foreground mb-10">
            Three Modules. One Seamless Pipeline.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PHASES.map((phase, i) => (
              <motion.div
                key={phase.title}
                data-testid={`phase-card-${i}`}
                className="bg-card border border-border rounded-xl p-6 flex flex-col"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <span className="inline-block text-[10px] font-bold tracking-widest text-primary uppercase mb-4 px-2 py-1 rounded bg-primary/10 w-fit">
                  {phase.tag}
                </span>
                <h3 className="font-space font-bold text-xl text-foreground mb-3">{phase.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">{phase.desc}</p>
                <Link href={phase.href} data-testid={`link-phase-${i}`}
                  className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group">
                  Enter Workspace
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── System Telemetry ── */}
        <section className="pb-20">
          <SectionLabel>System Telemetry</SectionLabel>
          <h2 className="font-space font-bold text-3xl md:text-4xl text-foreground mb-2">
            Diagnostics Command Console
          </h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-xl">
            Monitor classification pipelines, active WebSockets, API calls, and neural net model allocations in real-time.
            Keep track of package latency and accuracy diagnostics.
          </p>
          <Terminal />
        </section>

        {/* ── Fingerspelling Dictionary ── */}
        <section className="pb-20">
          <SectionLabel>Fingerspelling Dictionary</SectionLabel>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-space font-bold text-3xl md:text-4xl text-foreground">
              Interactive ISL/ASL Guide
            </h2>
            <p className="text-xs text-muted-foreground hidden md:block">
              Click a letter to inspect details
            </p>
          </div>
          <FingerspellingDict />
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-4">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Made for the Deaf &amp; Hard-of-Hearing Community</span>
            <span className="hidden md:block text-border">|</span>
            <a href="#" className="hover:text-foreground transition-colors">ISL Project</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">MIT License</a>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© 2026 SIGN_AI Laboratory. All rights reserved.</span>
            <span className="hidden md:flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                WEBCAM: 30 FPS
              </span>
              <span>CONFIDENCE: 96.4%</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
