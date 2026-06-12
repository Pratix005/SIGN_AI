import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Activity, Cpu, ArrowRight, Terminal, Heart, Info, Award } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Badge } from '../app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../app/components/ui/card';

interface LandingPageProps {
  onNavigate: (page: 'dashboard' | 'gesture' | 'practice' | 'translation' | 'ai') => void;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const mockLogs = [
  "[SYSTEM] Initializing MediaPipe Hand Landmarker network...",
  "[OK] Loaded TensorFlow Lite XNNPACK CPU delegate.",
  "[READY] Core classification layer pipeline operational.",
  "[SOCKET] Listening for real-time video frames on port 8000.",
  "[CONNECT] Scoring API connected successfully on port 8002.",
  "[CONNECT] Translation API online on port 8001.",
  "[INFO] Running gesture inference loop at latency ~14ms.",
  "[SYSTEM] Telemetry telemetry feed connected.",
  "[OK] Hand landmarks calibration matches default ISL/ASL profile.",
  "[SOCKET] established WebSocket tunnel for live vector updates."
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [activeLetter, setActiveLetter] = useState<string>('A');
  const [logs, setLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState<number>(0);

  // Dynamic log printing inside the mock terminal
  useEffect(() => {
    setLogs([mockLogs[0], mockLogs[1], mockLogs[2]]);
    setLogIndex(3);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLogs(prev => {
        const nextLogs = [...prev, mockLogs[logIndex % mockLogs.length]];
        if (nextLogs.length > 6) {
          nextLogs.shift();
        }
        return nextLogs;
      });
      setLogIndex(prev => prev + 1);
    }, 4000);

    return () => clearInterval(timer);
  }, [logIndex]);

  return (
    <div className="space-y-16 animate-fade-in pb-12">
      
      {/* 1. FUTURISTIC HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
        <div className="lg:col-span-7 space-y-6">
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight text-white">
            Empowering Silent Voices with <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-300 to-emerald-400">Real-Time AI</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
            SIGN_AI translates sign gestures to speech and converts spoken language into visual sign glosses instantly. Built with Python, React, and MediaPipe to bridge communication barriers.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button 
              onClick={() => onNavigate('gesture')} 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-6 py-5 rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/20 transition-all hover:translate-y-[-1px] flex items-center gap-2"
            >
              <Play className="h-4 w-4 fill-white" /> Launch Live Translate
            </Button>
            <Button 
              onClick={() => onNavigate('practice')} 
              variant="outline" 
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900/60 hover:text-white px-6 py-5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-violet-400" /> Start AI Learning
            </Button>
          </div>
        </div>

        {/* Hand Skeleton Interactive Graphic */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-zinc-950/40 rounded-3xl border border-zinc-800 flex items-center justify-center shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%) pointer-events-none" />
            
            {/* Animated SVG Hand Skeleton */}
            <svg viewBox="0 0 200 200" className="w-56 h-56 text-violet-500/80 filter drop-shadow-[0_0_15px_rgba(139, 92, 246, 0.3)] animate-pulse">
              {/* Wrist (0) */}
              <circle cx="100" cy="180" r="5" className="fill-violet-400" />
              
              {/* Palm Lines */}
              <line x1="100" y1="180" x2="55" y2="140" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              <line x1="100" y1="180" x2="80" y2="125" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              <line x1="100" y1="180" x2="115" y2="125" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              <line x1="100" y1="180" x2="145" y2="140" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              
              {/* Thumb (1-4) */}
              <path d="M 100 180 Q 75 175 60 160 T 45 150" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="75" cy="175" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="60" cy="160" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="45" cy="150" r="3" className="fill-emerald-400 animate-ping" />
              <circle cx="45" cy="150" r="3" className="fill-emerald-400 stroke-violet-500" strokeWidth="1" />

              {/* Index Finger (5-8) */}
              <path d="M 55 140 Q 50 100 45 75 T 40 50" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="55" cy="140" r="3.5" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="50" cy="100" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="45" cy="75" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="40" cy="50" r="4.5" className="fill-violet-400" />

              {/* Middle Finger (9-12) */}
              <path d="M 80 125 Q 80 85 80 60 T 80 35" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="80" cy="125" r="3.5" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="80" cy="85" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="80" cy="60" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="80" cy="35" r="4.5" className="fill-violet-400" />

              {/* Ring Finger (13-16) */}
              <path d="M 115 125 Q 115 90 115 65 T 115 42" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="115" cy="125" r="3.5" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="115" cy="90" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="115" cy="65" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="115" cy="42" r="4.5" className="fill-violet-400" />

              {/* Pinky Finger (17-20) */}
              <path d="M 145 140 Q 150 110 155 90 T 160 70" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="145" cy="140" r="3.5" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="150" cy="110" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="155" cy="90" r="3" className="fill-zinc-300 stroke-violet-500" strokeWidth="1" />
              <circle cx="160" cy="70" r="4.5" className="fill-violet-400" />
            </svg>

            {/* Corner Indicators */}
            <div className="absolute top-4 left-4 h-4 w-4 border-t-2 border-l-2 border-violet-500/40 rounded-tl" />
            <div className="absolute top-4 right-4 h-4 w-4 border-t-2 border-r-2 border-violet-500/40 rounded-tr" />
            <div className="absolute bottom-4 left-4 h-4 w-4 border-b-2 border-l-2 border-violet-500/40 rounded-bl" />
            <div className="absolute bottom-4 right-4 h-4 w-4 border-b-2 border-r-2 border-violet-500/40 rounded-br" />
          </div>
        </div>
      </section>

      {/* 2. STATS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Inference Latency', value: '14ms', desc: 'Real-time classification speeds', icon: Activity, color: 'text-violet-400 bg-violet-500/5' },
          { label: 'Tracking Accuracy', value: '98.2%', desc: 'High precision skeleton capture', icon: Award, color: 'text-emerald-400 bg-emerald-500/5' },
          { label: 'Hand Joint Nodes', value: '21 Points', desc: 'Normalized MediaPipe landmarks', icon: Cpu, color: 'text-cyan-400 bg-cyan-500/5' }
        ].map((stat, i) => (
          <Card key={i} className="bg-zinc-900/30 border-zinc-800/80 backdrop-blur-sm shadow-xl hover:border-zinc-700 transition-colors">
            <CardContent className="pt-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-heading font-extrabold tracking-tight text-white">{stat.value}</h3>
                <p className="text-xs text-zinc-400">{stat.desc}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* 3. CORE CHANNELS */}
      <section className="space-y-6">
        <div className="space-y-1">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-mono">
            Platform Capabilities
          </Badge>
          <h2 className="font-heading font-bold text-2xl text-white">Three Modules. One Seamless Pipeline.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Gesture Capture',
              desc: 'Translate signs on the fly. Captures camera frames, normalizes wrist coordinates, and displays predictions instantly.',
              badge: 'Phase 1 Core',
              page: 'gesture' as const
            },
            {
              title: 'Translation Engine',
              desc: 'Convert fingerspelled letters into grammatical sentences using Claude, or translate text to visual animated signs.',
              badge: 'Phase 2 Core',
              page: 'translation' as const
            },
            {
              title: 'Scoring & Feedback',
              desc: 'Compare sign accuracy using Dynamic Time Warping (DTW). Get per-finger feedback highlighting curl and position.',
              badge: 'Phase 3 Core',
              page: 'practice' as const
            }
          ].map((item, idx) => (
            <Card key={idx} className="bg-zinc-900/30 border-zinc-800/80 flex flex-col justify-between hover:border-violet-500/20 transition-all hover:translate-y-[-2px] duration-300">
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono text-violet-400 border-violet-500/20 bg-violet-500/5">
                    {item.badge}
                  </Badge>
                </div>
                <CardTitle className="font-heading text-lg font-bold text-white">{item.title}</CardTitle>
                <CardDescription className="text-zinc-400 text-xs leading-relaxed mt-2">{item.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => onNavigate(item.page)} 
                  variant="ghost" 
                  className="w-full justify-between p-0 hover:bg-transparent text-violet-400 hover:text-violet-300 font-mono text-xs"
                >
                  Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. DIAGNOSTICS & TELEMETRY MOCK TERMINAL */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-mono w-fit">
            System Telemetry
          </Badge>
          <h2 className="font-heading font-extrabold text-3xl text-white">Diagnostics Command Console</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Monitor classification pipelines, active WebSockets, API calls, and neural net model allocations in real-time. Keep track of package latency and accuracy diagnostics.
          </p>
        </div>

        <div className="lg:col-span-7">
          <Card className="bg-zinc-950/80 border-zinc-900 shadow-2xl h-full flex flex-col min-h-[260px]">
            <CardHeader className="pb-2 border-b border-zinc-900 bg-zinc-950/50 flex flex-row items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-violet-400" />
                <span className="font-mono text-xs text-zinc-400">system_diagnostics.log</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500/60" />
                <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
                <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
              </div>
            </CardHeader>
            <CardContent className="font-mono text-[11px] p-4 flex-grow flex flex-col justify-start space-y-2 text-zinc-400 leading-relaxed overflow-hidden">
              {logs.map((log, idx) => {
                let colorClass = "text-zinc-400";
                if (log.startsWith("[OK]")) colorClass = "text-emerald-400";
                else if (log.startsWith("[READY]")) colorClass = "text-violet-400";
                else if (log.startsWith("[SOCKET]") || log.startsWith("[CONNECT]")) colorClass = "text-cyan-400";
                else if (log.startsWith("[SYSTEM]")) colorClass = "text-zinc-500";
                
                return (
                  <div key={idx} className={`${colorClass} whitespace-nowrap overflow-hidden text-ellipsis`}>
                    {log}
                  </div>
                );
              })}
              <div className="text-zinc-600 animate-pulse">_</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. INTERACTIVE ALPHABET HOVER GRID */}
      <section className="space-y-6">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div className="space-y-1">
            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-mono">
              Fingerspelling Dictionary
            </Badge>
            <h2 className="font-heading font-bold text-2xl text-white">Interactive ISL/ASL Guide</h2>
          </div>
          <div className="text-zinc-500 text-xs font-mono">
            Hover over a letter to inspect details
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-zinc-950/20 border border-zinc-850 rounded-2xl p-6 shadow-inner">
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
              {LETTERS.map(letter => (
                <button
                  key={letter}
                  onMouseEnter={() => setActiveLetter(letter)}
                  className={`aspect-square rounded-xl border font-heading font-extrabold text-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    activeLetter === letter
                      ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/10 scale-105'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm h-full">
              <CardHeader className="pb-3 border-b border-zinc-850">
                <CardDescription className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Inspect Sign Character</CardDescription>
                <CardTitle className="font-heading text-4xl font-extrabold text-white mt-1 flex items-baseline gap-2">
                  <span className="text-violet-400">{activeLetter}</span>
                  <span className="text-xs font-mono text-zinc-500 font-normal">/ Fingerspell</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Sign Structure</div>
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans">
                    For {activeLetter}, position hand in the front viewport. Focus is key for the primary landmarks. Ensure wrist is stable.
                  </div>
                </div>
                <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-1.5 font-mono text-[10px]">
                  <div className="text-zinc-500">Telemetry Info:</div>
                  <div className="text-violet-400">Class Label: {activeLetter}</div>
                  <div className="text-emerald-400">Calibration Profile: Nominal</div>
                  <div className="text-zinc-400">Reference: Captured ✓</div>
                </div>
                <Button 
                  onClick={() => {
                    onNavigate('practice');
                  }} 
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-750 hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold py-4 rounded-xl transition-all"
                >
                  Go Practice Sign "{activeLetter}"
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. IMMERSIVE BOTTOM FOOTER SIGN OFF */}
      <section className="pt-4 border-t border-zinc-900 flex justify-between items-center flex-wrap gap-4 text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
          <span>Made for the Deaf & Hard-of-Hearing Community</span>
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-300">ISL Project</a>
          <a href="#" className="hover:text-zinc-300">Privacy</a>
          <a href="#" className="hover:text-zinc-300">MIT License</a>
        </div>
      </section>

    </div>
  );
}
