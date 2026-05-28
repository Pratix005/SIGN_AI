import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Hand, MessageCircle, Mic, Play, Pause, Volume2, Zap, Activity, Target, Flame, RotateCcw, ShieldAlert } from "lucide-react";

const GESTURE_API = "http://localhost:8000";
const TRANSLATION_API = "http://localhost:8001";
const SCORING_API = "http://localhost:8002";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

// Built-in sign library (shown before user records references)
const SIGN_LIBRARY: Record<"ISL" | "ASL", { letters: string[]; words: string[] }> = {
  ISL: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    words: ["HELLO", "THANKS", "HELP", "YES", "NO", "PLEASE", "SORRY", "WATER", "FOOD", "HOME", "GOOD", "BAD", "MORE", "STOP", "GO"],
  },
  ASL: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    words: ["HELLO", "THANKS", "HELP", "YES", "NO", "PLEASE", "SORRY", "WATER", "FOOD", "HOME", "GOOD", "BAD", "MORE", "STOP", "GO"],
  },
};

const FINGER_COLORS: Record<string, string> = {
  correct: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  warning: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  error: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  neutral: "text-muted-foreground border-border/40 bg-card/20",
};

// ── Audio cues using Web Audio API ───────────────────────────────────────────
function playAudioCue(type: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);       // C5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "good") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // try_again — low tone
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch { }
}

export default function App() {
  const [activeMode, setActiveMode] = useState<"practice" | "sign-to-text" | "text-to-sign">("sign-to-text");

  // Camera & Gesture States
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState<number[][]>([]);
  const [gestureApiLive, setGestureApiLive] = useState(false);
  const [translationApiLive, setTranslationApiLive] = useState(false);
  const [scoringApiLive, setScoringApiLive] = useState(false);

  // Sign-to-Text States
  const [signBuffer, setSignBuffer] = useState<string[]>([]);
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);
  const lastSignRef = useRef<string | null>(null);
  const holdCountRef = useRef(0);

  // Text-to-Sign States
  const [inputText, setInputText] = useState("");
  const [glossSequence, setGlossSequence] = useState<string[]>([]);
  const [signFrames, setSignFrames] = useState<Array<{ type: string; value: string }>>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Practice Mode (Phase 3) States
  const [practiceMode, setPracticeMode] = useState<"practice" | "capture">("practice");
  const [targetLanguage, setTargetLanguage] = useState<"ISL" | "ASL">("ISL");
  const [targetCategory, setTargetCategory] = useState<"letters" | "words">("letters");
  const [targetSign, setTargetSign] = useState("A");

  const [capturedSigns, setCapturedSigns] = useState<Set<string>>(new Set());
  const [practicedSigns, setPracticedSigns] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [practiceHint, setPracticeHint] = useState("");

  const [practiceScore, setPracticeScore] = useState<number | null>(null);
  const [practiceGrade, setPracticeGrade] = useState("");
  const [practiceMsg, setPracticeMsg] = useState("");
  const [feedback, setFeedback] = useState<Array<{ finger: string; status: string; message: string }>>([]);
  const [isScoring, setIsScoring] = useState(false);

  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  const lastCoordsRef = useRef<number[] | null>(null);
  const scoreTimerRef = useRef<number | null>(null);

  // Check API health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await fetch(`${GESTURE_API}/status`);
        setGestureApiLive(true);
      } catch { setGestureApiLive(false); }

      try {
        await fetch(`${TRANSLATION_API}/health`);
        setTranslationApiLive(true);
      } catch { setTranslationApiLive(false); }

      try {
        const res = await fetch(`${SCORING_API}/health`);
        if (res.ok) {
          setScoringApiLive(true);
          // Sync captured library signs
          const libRes = await fetch(`${SCORING_API}/library`);
          const libData = await libRes.json();
          if (libData.signs) {
            const keys = libData.signs.map((s: any) => `${s.language}_${s.sign}`);
            setCapturedSigns(new Set(keys));
          }
        }
      } catch { setScoringApiLive(false); }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
      };
      recognitionRef.current = rec;
    }
  }, []);

  // Load hint when target sign changes
  useEffect(() => {
    const HINTS: Record<string, string> = {
      HELLO: "Open hand, fingers together, touch forehead then move outward",
      THANKS: "Flat hand, touch chin then move forward",
      HELP: "Thumb-up fist on open palm, raise both hands",
      YES: "Fist, nod it up and down",
      NO: "Index + middle tap thumb twice",
      PLEASE: "Flat hand, circular motion on chest",
      SORRY: "Fist, circular motion on chest",
      WATER: "W handshape (3 fingers up), tap chin twice",
      FOOD: "Flat O handshape, tap mouth twice",
      HOME: "Flat O to cheek then flat hand to cheek",
      GOOD: "Flat hand from chin, forward and down into palm",
      BAD: "Flat hand from chin, flip down and away",
      MORE: "Both flat O hands, tap fingertips together",
      STOP: "Dominant hand chops down onto palm of other hand",
      GO: "Both index fingers point out, arc forward",
    };
    setPracticeHint(HINTS[targetSign] || `Make the ${targetLanguage} sign for "${targetSign}"`);
    setPracticeScore(null);
    setPracticeGrade("");
    setPracticeMsg("");
    setFeedback([]);
  }, [targetSign, targetLanguage]);

  // Adjust sign target if category changes
  useEffect(() => {
    const signs = targetCategory === "letters" ? SIGN_LIBRARY[targetLanguage].letters : SIGN_LIBRARY[targetLanguage].words;
    if (!signs.includes(targetSign)) {
      setTargetSign(signs[0]);
    }
  }, [targetCategory, targetLanguage]);

  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.72);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startPredictionLoop();
      }
    } catch {
      alert("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setPrediction(null);
    setLandmarks([]);
  };

  const startPredictionLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(async () => {
      const frame = captureFrame();
      if (!frame) return;

      try {
        const res = await fetch(`${GESTURE_API}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame }),
        });
        const data = await res.json();
        setPrediction(data.sign);
        setConfidence(data.confidence || 0);
        setLandmarks(data.landmarks || []);
        if (data.coords) lastCoordsRef.current = data.coords;

        // Auto-accumulate for sign-to-text mode
        if (activeMode === "sign-to-text" && data.sign && data.sign !== "untrained" && data.confidence > 0.8) {
          if (data.sign === lastSignRef.current) {
            holdCountRef.current++;
            if (holdCountRef.current >= 5) {
              setSignBuffer((prev: string[]) => {
                if (prev.length === 0 || prev[prev.length - 1] !== data.sign) {
                  return [...prev, data.sign];
                }
                return prev;
              });
              holdCountRef.current = 0;
              lastSignRef.current = null;
            }
          } else {
            lastSignRef.current = data.sign;
            holdCountRef.current = 1;
          }
        }
      } catch { }
    }, 120);
  }, [captureFrame, activeMode]);

  // Draw hand skeleton & dynamically color code by accuracy status
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (landmarks.length === 0) return;

    const W = overlay.width;
    const H = overlay.height;

    // Color joints by finger feedback status
    const fingerStatus: Record<string, string> = {};
    feedback.forEach((f: { finger: string; status: string; message: string }) => { fingerStatus[f.finger] = f.status; });
    const FINGER_IDX: Record<string, number[]> = {
      thumb: [1, 2, 3, 4],
      index: [5, 6, 7, 8],
      middle: [9, 10, 11, 12],
      ring: [13, 14, 15, 16],
      pinky: [17, 18, 19, 20]
    };
    const jointStatus = new Array(21).fill("neutral");
    Object.entries(FINGER_IDX).forEach(([name, idxs]) => {
      const st = fingerStatus[name] || "neutral";
      idxs.forEach(i => { jointStatus[i] = st; });
    });

    // Draw connections
    HAND_CONNECTIONS.forEach(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return;
      ctx.beginPath();
      ctx.moveTo(landmarks[a][0] * W, landmarks[a][1] * H);
      ctx.lineTo(landmarks[b][0] * W, landmarks[b][1] * H);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw joints with color logic
    landmarks.forEach((pt: number[], i: number) => {
      const st = jointStatus[i];
      let col = "rgba(196, 181, 253, 0.9)";
      if (st === "correct") col = "#10b981";      // correct -> green
      else if (st === "warning") col = "#f59e0b"; // warning -> amber
      else if (st === "error") col = "#ef4444";   // error -> red
      else if (i === 0) col = "#7c3aed";          // wrist -> purple

      ctx.beginPath();
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = col;
      if (i === 0 || st !== "neutral") {
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks, feedback]);

  const translateSignsToText = async () => {
    if (signBuffer.length === 0) return;
    setTranslating(true);
    try {
      const res = await fetch(`${TRANSLATION_API}/sign-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signs: signBuffer }),
      });
      const data = await res.json();
      setTranslatedText(data.sentence || signBuffer.join(""));
    } catch {
      setTranslatedText(signBuffer.join(""));
    }
    setTranslating(false);
  };

  const speakText = () => {
    if (!translatedText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const convertTextToSigns = async () => {
    if (!inputText.trim()) return;
    setIsPlaying(false);
    setCurrentFrameIndex(-1);

    try {
      const res = await fetch(`${TRANSLATION_API}/text-to-signs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setGlossSequence(data.gloss || []);
      setSignFrames(data.signs || []);
      if (data.signs && data.signs.length > 0) {
        setCurrentFrameIndex(0);
        setIsPlaying(true);
      }
    } catch {
      // Fallback: fingerspell
      const letters = inputText.toUpperCase().split("").filter((c: string) => /[A-Z ]/.test(c));
      const frames = letters.map((c: string) =>
        c === " " ? { type: "pause", value: "" } : { type: "letter", value: c }
      );
      setGlossSequence(inputText.split(" "));
      setSignFrames(frames);
      if (frames.length > 0) {
        setCurrentFrameIndex(0);
        setIsPlaying(true);
      }
    }
  };

  // Animation playback
  useEffect(() => {
    if (!isPlaying || currentFrameIndex < 0 || currentFrameIndex >= signFrames.length) return;

    const frame = signFrames[currentFrameIndex];
    const delay = frame.type === "pause" ? 500 : playbackSpeed * 1000;

    const timer = setTimeout(() => {
      setCurrentFrameIndex((prev: number) => {
        if (prev + 1 < signFrames.length) return prev + 1;
        setIsPlaying(false);
        return -1;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, currentFrameIndex, signFrames, playbackSpeed]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported. Use Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // ── Practice Mode Scoring & Capture Handlers ────────────────────────────────
  const scorePose = useCallback(async () => {
    if (!lastCoordsRef.current || isScoring) return;
    setIsScoring(true);
    try {
      const res = await fetch(`${SCORING_API}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign: targetSign, language: targetLanguage, coords: lastCoordsRef.current }),
      });
      const data = await res.json();
      if (data.error) {
        setPracticeScore(null);
        setPracticeGrade("No Ref");
        setPracticeMsg(`No reference captured for "${targetSign}". Switch to Capture Reference first.`);
        setFeedback([]);
        setIsScoring(false);
        return;
      }
      setPracticeScore(data.score);
      setPracticeGrade(data.grade);
      setPracticeMsg(data.message);
      setFeedback(data.feedback || []);
      playAudioCue(data.audio_cue);

      if (data.score >= 70) {
        setStreak((s: number) => s + 1);
        setPracticedSigns((prev: Record<string, number>) => ({ ...prev, [targetSign]: (prev[targetSign] || 0) + 1 }));
      } else {
        setStreak(0);
      }
    } catch {
      console.log("Scoring API not reachable.");
    }
    setIsScoring(false);
  }, [targetSign, targetLanguage, isScoring]);

  // Auto score timer inside Practice Mode
  useEffect(() => {
    if (cameraActive && activeMode === "practice" && practiceMode === "practice") {
      scoreTimerRef.current = window.setInterval(scorePose, 1500);
    } else {
      if (scoreTimerRef.current) clearInterval(scoreTimerRef.current);
    }
    return () => {
      if (scoreTimerRef.current) clearInterval(scoreTimerRef.current);
    };
  }, [cameraActive, activeMode, practiceMode, scorePose]);

  const startCapture = () => {
    setCapturing(true);
    setCaptureProgress(0);
    const frames: number[][] = [];
    const interval = window.setInterval(() => {
      if (lastCoordsRef.current) {
        frames.push([...lastCoordsRef.current]);
        setCaptureProgress((prev: number) => Math.min(prev + 10, 100));
      }
      if (frames.length >= 10) {
        clearInterval(interval);
        saveReference(frames);
        setCapturing(false);
        setCaptureProgress(0);
      }
    }, 120);
  };

  const saveReference = async (frames: number[][]) => {
    try {
      const res = await fetch(`${SCORING_API}/capture-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sign: targetSign,
          language: targetLanguage,
          category: targetCategory === "letters" ? "letter" : "word",
          coords_sequence: frames,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCapturedSigns((prev: Set<string>) => new Set([...prev, `${targetLanguage}_${targetSign}`]));
        playAudioCue("success");
      }
    } catch {
      alert("Scoring API not reachable. Reference was not saved.");
    }
  };

  const currentSign = signFrames[currentFrameIndex];
  const signsList = targetCategory === "letters" ? SIGN_LIBRARY[targetLanguage].letters : SIGN_LIBRARY[targetLanguage].words;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/40 backdrop-blur-xl bg-background/80 z-10">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
                  <Hand className="w-5 h-5 text-primary" strokeWidth={2.5} />
                  {cameraActive && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">SignAI</h1>
                  <p className="text-xs text-muted-foreground font-medium">Neural Sign Language Platform</p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border/30">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${gestureApiLive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-muted-foreground/30'}`} />
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Gesture API</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border/30">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${translationApiLive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-muted-foreground/30'}`} />
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Translation API</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border/30">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${scoringApiLive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-muted-foreground/30'}`} />
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Scoring API</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/20 bg-primary/5">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Neural Core Engaged</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mode selectors */}
      <div className="relative border-b border-border/30 bg-card/30 z-10">
        <div className="max-w-[1800px] mx-auto px-8 py-5">
          <div className="flex gap-3">
            {[
              { id: "sign-to-text", label: "Sign → Text", icon: MessageCircle, desc: "Gesture-to-speech translation" },
              { id: "text-to-sign", label: "Text → Sign", icon: Hand, desc: "Gloss sequence visualization" },
              { id: "practice", label: "Neural Practice", icon: Target, desc: "Interactive pose accuracy trainer" }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id as any);
                  setPracticeScore(null);
                  setFeedback([]);
                }}
                className={`group relative flex-1 flex flex-col items-start gap-1 px-6 py-4 rounded-xl transition-all duration-300 ${activeMode === mode.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.01]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  } border ${activeMode === mode.id ? 'border-primary/20' : 'border-border/30 bg-card/10'}`}
              >
                <div className="flex items-center gap-2.5 w-full">
                  <mode.icon className={`w-4 h-4 transition-transform ${activeMode === mode.id ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span className="font-bold text-sm tracking-tight">{mode.label}</span>
                </div>
                <span className={`text-[10px] tracking-wide transition-opacity ${activeMode === mode.id ? 'opacity-85' : 'opacity-60'}`}>
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main dashboard space */}
      <main className="relative max-w-[1800px] mx-auto px-6 md:px-8 py-8 md:py-10 z-10">
        {activeMode === "practice" ? (
          /* ── THREE COLUMN NEURAL TRAINING WORKSPACE ──────────────────────────────── */
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_420px] gap-8">

            {/* Column 1: Custom Sign Picker Sidebar */}
            <div className="flex flex-col gap-5 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-xl p-5 shadow-2xl h-[650px] overflow-hidden">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sign Library</h3>
                  <span className="text-[10px] font-mono text-primary font-bold px-1.5 py-0.5 rounded bg-primary/10">
                    {signsList.length} total
                  </span>
                </div>
                {/* Language Select */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-background/50 border border-border/30">
                  {(["ISL", "ASL"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setTargetLanguage(lang)}
                      className={`py-1.5 rounded-md text-[10px] font-bold font-mono tracking-wider transition-all uppercase ${targetLanguage === lang
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                {/* Category Select */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-background/50 border border-border/30">
                  {(["letters", "words"] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTargetCategory(cat)}
                      className={`py-1.5 rounded-md text-[10px] font-bold font-mono tracking-wider transition-all uppercase ${targetCategory === cat
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                {signsList.map((s: string) => {
                  const key = `${targetLanguage}_${s}`;
                  const isCaptured = capturedSigns.has(key);
                  const count = practicedSigns[s] || 0;
                  const isSelected = targetSign === s;

                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setTargetSign(s);
                        setPracticeScore(null);
                        setFeedback([]);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${isSelected
                          ? 'bg-primary/15 border-primary text-primary font-bold'
                          : 'border-border/30 bg-background/20 hover:border-border/50 hover:bg-background/40'
                        }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-bold tracking-tight">{s}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {targetCategory === "letters" ? "Fingerspell" : "Word Gesture"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
                            🔥 {count}
                          </span>
                        )}
                        <div className={`w-2 h-2 rounded-full ${isCaptured
                            ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                            : 'bg-border/60'
                          }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Live Tracking Viewfinder */}
            <div className="flex flex-col gap-6">
              {/* Capture mode Banner */}
              {practiceMode === "capture" && (
                <div className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 animate-pulse">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <strong>Capture Mode Active:</strong> Perform the perfect sign for <strong className="text-amber-300 uppercase font-bold">"{targetSign}"</strong> in the camera, then click **Capture Reference** below to log 10 spatial frames.
                  </div>
                </div>
              )}

              {/* Viewport */}
              <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-2xl shadow-black/10 aspect-video flex-1 min-h-[400px]">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas ref={canvasRef} className="hidden" />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none z-10"
                />

                {cameraActive && (
                  <>
                    <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-20">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/90 backdrop-blur-xl border border-border/50 shadow-lg">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />
                        <span className="text-xs font-semibold text-foreground">Spatial Skeleton Mesh</span>
                      </div>

                      <div className="px-5 py-3 rounded-xl bg-background/90 backdrop-blur-xl border border-primary/30 shadow-xl shadow-primary/10 text-center min-w-[120px]">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-0.5">Target</span>
                        <span className="text-3xl font-extrabold text-primary leading-none">{targetSign}</span>
                      </div>
                    </div>

                    {/* Corner frames */}
                    <div className="absolute top-5 left-5 w-12 h-12 border-l-2 border-t-2 border-primary/50 rounded-tl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-5 right-5 w-12 h-12 border-r-2 border-t-2 border-primary/50 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-5 left-5 w-12 h-12 border-l-2 border-b-2 border-primary/50 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-5 right-5 w-12 h-12 border-r-2 border-b-2 border-primary/50 rounded-br-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Scanline */}
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-[scan_4s_ease-in-out_infinite]" />
                  </>
                )}

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-background/40 to-background/20 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/20 border border-border/30">
                      <Camera className="w-10 h-10 text-muted-foreground/30" strokeWidth={1.5} />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold text-foreground tracking-tight">Camera Feed Inactive</p>
                      <p className="text-xs text-muted-foreground">Launch custom camera stream to generate mesh</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewport Playback Actions */}
              <div className="flex gap-3">
                <button
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all duration-300 ${cameraActive
                      ? 'bg-destructive/10 text-destructive border-2 border-destructive/20 hover:bg-destructive/20'
                      : 'bg-gradient-to-r from-primary to-primary/95 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] border-2 border-primary/20'
                    }`}
                >
                  <Camera className="w-5 h-5" />
                  <span>{cameraActive ? 'Deactivate Camera' : 'Activate Camera Stream'}</span>
                </button>
              </div>
            </div>

            {/* Column 3: Live Score Ring, Streak, and Finger Details */}
            <div className="space-y-6">

              {/* Practice Mode Selector Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-card/40 border border-border/40 backdrop-blur-xl">
                <button
                  onClick={() => setPracticeMode("practice")}
                  className={`py-3.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${practiceMode === "practice"
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  ▶ Practice
                </button>
                <button
                  onClick={() => setPracticeMode("capture")}
                  className={`py-3.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${practiceMode === "capture"
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20 shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  ⏺ Log Reference
                </button>
              </div>

              {/* Dynamic Score Panel */}
              <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-xl overflow-hidden p-6 flex flex-col items-center gap-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground self-start">Accuracy Score</h3>

                {/* Score Indicator Ring */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="6" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={practiceScore !== null ? (practiceScore >= 85 ? "#10b981" : practiceScore >= 70 ? "#3b82f6" : practiceScore >= 50 ? "#f59e0b" : "#f43f5e") : "rgba(255, 255, 255, 0.08)"}
                      strokeWidth="6"
                      strokeDasharray={`${(practiceScore !== null ? practiceScore : 0) * 2.51} 251.2`}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {practiceScore !== null ? (
                      <>
                        <span className="text-4xl font-extrabold tracking-tight">{Math.round(practiceScore)}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">accuracy</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-muted-foreground/30 tracking-tight">--</span>
                        <span className="text-[9px] text-muted-foreground/40 text-center px-6">Stream active to track</span>
                      </>
                    )}
                  </div>
                </div>

                {practiceScore !== null && (
                  <div className="text-center space-y-1">
                    <div className={`text-base font-bold uppercase tracking-widest ${practiceGrade === "excellent" ? "text-emerald-400" :
                        practiceGrade === "good" ? "text-blue-400" :
                          practiceGrade === "fair" ? "text-amber-400" : "text-rose-400"
                      }`}>
                      {practiceGrade}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed px-4">{practiceMsg}</p>
                  </div>
                )}

                {/* Score Action Buttons */}
                <div className="w-full flex gap-3 mt-1">
                  {practiceMode === "capture" ? (
                    <button
                      onClick={startCapture}
                      disabled={!cameraActive || capturing}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <Play className="w-4 h-4" />
                      <span>{capturing ? `Logging (${captureProgress}%)` : 'Log 10 reference frames'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={scorePose}
                      disabled={!cameraActive || isScoring}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{isScoring ? "Evaluating Mesh..." : "Trigger Scoring"}</span>
                    </button>
                  )}

                  {/* Streak widget */}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/30">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="text-base font-extrabold text-amber-500 leading-none">{streak}</span>
                      <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-mono">streak</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Hint Block */}
              <div className="rounded-2xl bg-card/30 border border-border/40 p-5 space-y-2.5">
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Mesh Instructions</h4>
                <p className="text-xs text-foreground/80 leading-relaxed">{practiceHint}</p>
              </div>

              {/* Spatial Finger Breakdowns */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Spatial Joint Feedback</h4>
                  <span className="text-[9px] text-muted-foreground font-mono">5 Channels Tracked</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {feedback.length > 0 ? (
                    feedback.map((f: { finger: string; status: string; message: string }, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${FINGER_COLORS[f.status] || FINGER_COLORS.neutral
                          }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-current mt-1.5 shadow" />
                        <div className="flex-1 space-y-0.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                            {f.finger} Channel
                          </p>
                          <p className="text-xs opacity-80 leading-relaxed">
                            {f.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    ["thumb", "index", "middle", "ring", "pinky"].map((name: string) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-border/20 bg-card/10 text-muted-foreground/40"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="text-xs font-bold uppercase tracking-wide">{name} Channel awaiting mesh</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ── TWO COLUMN TRANSLATION & DIALOGUE STACK ────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">

            {/* Left Column: Camera Feed */}
            <div className="space-y-6">
              <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-2xl shadow-black/10 aspect-video">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas ref={canvasRef} className="hidden" />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none z-10"
                />

                {cameraActive && (
                  <>
                    <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-20">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/90 backdrop-blur-xl border border-border/50 shadow-lg">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />
                        <span className="text-xs font-medium text-foreground">Neural Tracking Active</span>
                      </div>

                      {activeMode === "sign-to-text" && prediction && prediction !== "untrained" && confidence > 0.7 && (
                        <div className="px-5 py-3 rounded-xl bg-background/90 backdrop-blur-xl border border-primary/30 shadow-xl shadow-primary/10">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-primary leading-none">
                              {prediction}
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="text-xs text-muted-foreground font-mono">Confidence</div>
                              <div className="text-sm font-bold text-primary">{Math.round(confidence * 100)}%</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Corner brackets */}
                    <div className="absolute top-5 left-5 w-12 h-12 border-l-2 border-t-2 border-primary/50 rounded-tl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-5 right-5 w-12 h-12 border-r-2 border-t-2 border-primary/50 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-5 left-5 w-12 h-12 border-l-2 border-b-2 border-primary/50 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-5 right-5 w-12 h-12 border-r-2 border-b-2 border-primary/50 rounded-br-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Subtle scanline */}
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[scan_4s_ease-in-out_infinite]" />
                  </>
                )}

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-background/40 to-background/20 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/20 border border-border/30">
                      <Camera className="w-10 h-10 text-muted-foreground/40" strokeWidth={1.5} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">Camera Inactive</p>
                      <p className="text-xs text-muted-foreground">Start camera to begin tracking</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${cameraActive
                      ? 'bg-destructive/10 text-destructive border-2 border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50'
                      : 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] border-2 border-primary/20'
                    }`}
                >
                  <Camera className={`w-5 h-5 transition-transform ${!cameraActive && 'group-hover:scale-110'}`} />
                  <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Mode-specific Controls */}
            <div className="space-y-6">
              {activeMode === "sign-to-text" && (
                <>
                  <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Sign Buffer</h3>
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                          <span className="text-xs font-mono text-primary font-semibold">{signBuffer.length}</span>
                          <span className="text-xs text-muted-foreground">signs</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="min-h-[120px] flex flex-wrap gap-2 p-5 rounded-xl bg-background/60 border border-border/30">
                        {signBuffer.length === 0 ? (
                          <div className="m-auto text-center space-y-1">
                            <p className="text-sm text-muted-foreground">Signs will appear here</p>
                            <p className="text-xs text-muted-foreground/60">Hold gestures to register</p>
                          </div>
                        ) : (
                          signBuffer.map((sign: string, i: number) => (
                            <div
                              key={i}
                              className="px-4 py-2.5 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 text-primary font-bold text-lg shadow-sm hover:shadow-md hover:scale-105 transition-all"
                            >
                              {sign}
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        onClick={() => setSignBuffer([])}
                        disabled={signBuffer.length === 0}
                        className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Clear Buffer
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Translation Result</h3>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="min-h-[140px] p-5 rounded-xl bg-gradient-to-br from-background/60 to-background/40 border border-border/30 flex items-center justify-center">
                        {translating ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Translating...</p>
                          </div>
                        ) : translatedText ? (
                          <div className="w-full">
                            <p className="text-xl leading-relaxed text-emerald-400 font-semibold">
                              {translatedText}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center space-y-1">
                            <p className="text-sm text-muted-foreground">Translation will appear here</p>
                            <p className="text-xs text-muted-foreground/60">Click translate when ready</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={translateSignsToText}
                          disabled={signBuffer.length === 0 || translating}
                          className="group flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-300 border-2 border-primary/20 hover:scale-[1.02]"
                        >
                          <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Translate</span>
                        </button>

                        <button
                          onClick={speakText}
                          disabled={!translatedText}
                          className="px-4 py-3.5 rounded-xl border-2 border-border/50 hover:bg-muted/50 hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeMode === "text-to-sign" && (
                <>
                  <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Input Text</h3>
                    </div>

                    <div className="p-6 space-y-4">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a sentence or use voice input..."
                        className="w-full h-36 px-4 py-3 rounded-xl bg-background/60 border border-border/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={toggleMic}
                          className={`px-4 py-3.5 rounded-xl transition-all border-2 ${listening
                              ? 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse shadow-lg shadow-destructive/20'
                              : 'border-border/50 hover:bg-muted/50 hover:border-border hover:scale-105'
                            }`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>

                        <button
                          onClick={convertTextToSigns}
                          disabled={!inputText.trim()}
                          className="group flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-300 border-2 border-primary/20 hover:scale-[1.02]"
                        >
                          <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Convert to Signs</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {glossSequence.length > 0 && (
                    <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
                      <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">ISL Gloss Sequence</h3>
                      </div>

                      <div className="p-6">
                        <div className="flex flex-wrap gap-2">
                          {glossSequence.map((word: string, i: number) => (
                            <div
                              key={i}
                              className="px-3.5 py-2 rounded-lg bg-gradient-to-br from-accent/40 to-accent/20 border border-accent-foreground/30 text-accent-foreground text-sm font-semibold shadow-sm"
                            >
                              {word}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {signFrames.length > 0 && (
                    <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
                      <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Sign Visualizer</h3>
                      </div>

                      <div className="p-6 space-y-5">
                        <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-primary/8 via-accent/5 to-primary/8 border-2 border-border/30 flex items-center justify-center overflow-hidden group">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          {currentSign ? (
                            currentSign.type === "letter" ? (
                              <div className="relative z-10 text-9xl font-bold text-primary drop-shadow-2xl animate-[pulse_2s_ease-in-out_infinite]">
                                {currentSign.value}
                              </div>
                            ) : currentSign.type === "pause" ? (
                              <div className="text-3xl text-muted-foreground font-light tracking-widest">···</div>
                            ) : (
                              <div className="text-3xl font-semibold text-foreground">{currentSign.value}</div>
                            )
                          ) : (
                            <div className="text-center space-y-2">
                              <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                <Play className="w-6 h-6 text-muted-foreground/50" />
                              </div>
                              <p className="text-sm text-muted-foreground">Ready to animate</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 border-2 border-primary/20 hover:scale-105"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
                          </button>

                          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/30">
                            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">Speed</span>
                            <input
                              type="range"
                              min="0.3"
                              max="2"
                              step="0.1"
                              value={playbackSpeed}
                              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                              className="flex-1 accent-primary"
                            />
                            <span className="text-xs text-foreground font-mono font-semibold w-12 text-right">{playbackSpeed}s</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-border/30 bg-background/50 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-6 md:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                <Hand className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">SignAI</p>
                <p className="text-xs text-muted-foreground">Neural Sign Language Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="font-mono">MediaPipe Hands</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="font-mono">React + TypeScript</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="font-mono">Tailwind CSS v4</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0.5; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.5; }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.2);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 4px;
        }

        /* Custom Scrollbar utility class */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.15);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.3);
        }

        /* Smooth animations */
        * {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
