import { useState, useRef, useEffect, useCallback } from "react";
import { CameraFeed } from "@/components/workspace/CameraFeed";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { Flame, Target, ChevronRight, Save, Play, Square } from "lucide-react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const GESTURE_API = "https://sign-ai-ag5z.onrender.com";
const SCORING_API = "https://signai-scoring.onrender.com";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const SIGN_LIBRARY = {
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
};

interface FeedbackItem {
  finger: string;
  status: 'correct' | 'warning' | 'error';
  message: string;
}

// Retro Web Audio Synth Cues
function playAudioCue(type: 'success' | 'good' | 'try_again') {
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
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "good") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

export default function Practice() {
  const [activeLang, setActiveLang] = useState<'ISL' | 'ASL'>('ISL');
  const [activeTab, setActiveTab] = useState<'Letters' | 'Words'>('Letters');
  const [activeLetter, setActiveLetter] = useState('A');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handLandmarkerRef = useRef<any>(null);
  const isLandmarkerLoadingRef = useRef(false);
  const [isLandmarkerReady, setIsLandmarkerReady] = useState(false);

  // Initialize HandLandmarker on mount
  useEffect(() => {
    const initLandmarker = async () => {
      if (handLandmarkerRef.current || isLandmarkerLoadingRef.current) return;
      isLandmarkerLoadingRef.current = true;
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setIsLandmarkerReady(true);
      } catch (err) {
        console.error("Failed to load MediaPipe HandLandmarker:", err);
      } finally {
        isLandmarkerLoadingRef.current = false;
      }
    };
    initLandmarker();
  }, []);
  
  // Scoring / Reference States
  const [mode, setMode] = useState<'practice' | 'capture'>('practice');
  const [score, setScore] = useState<number | null>(null);
  const [grade, setGrade] = useState("");
  const [scoreMsg, setScoreMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isScoring, setIsScoring] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [hint, setHint] = useState("");

  const [landmarks, setLandmarks] = useState<number[][]>([]);
  const lastCoordsRef = useRef<number[] | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<any>(null);
  const scoreTimerRef = useRef<any>(null);

  // Update explanation hints
  useEffect(() => {
    const HINTS: Record<string, string> = {
      HELLO: "Open hand, fingers together, touch forehead then move outward.",
      THANKS: "Flat hand, touch chin then move forward.",
      HELP: "Dominant thumb-up fist resting on open helper palm, raise both hands.",
      YES: "Make a closed fist and tilt it up and down like a head nodding.",
      NO: "Index and middle finger tap thumb twice.",
      PLEASE: "Flat hand rubbing chest in a circle.",
      SORRY: "Closed fist rubbing chest in a circle.",
      WATER: "Extend three middle fingers (W shape) and tap your chin twice.",
      FOOD: "Touch fingertips of flat O hand shape to mouth twice.",
      HOME: "Touch flat O hand shape to cheek, then open hand to cheek.",
      GOOD: "Move flat hand from chin forward and down.",
      BAD: "Move flat hand from chin, flip palm down and push away.",
      MORE: "Touch fingertips of both hands together.",
      STOP: "Dominant hand chops onto helper hand's palm.",
      GO: "Point both index fingers forward in an arcing motion.",
    };
    setHint(HINTS[activeLetter] || `Position hand in front viewport to sign "${activeLetter}".`);
    setScore(null);
    setGrade("");
    setScoreMsg("");
    setFeedback([]);
  }, [activeLetter, activeLang]);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (scoreTimerRef.current) {
      clearInterval(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }
    setIsCameraActive(false);
    setLandmarks([]);
  }, []);

  // Capture frame as Base64 string
  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.72);
  }, []);

  // Frame processing loop
  const startPredicting = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !handLandmarkerRef.current) return;
      try {
        const timestamp = performance.now();
        const result = handLandmarkerRef.current.detectForVideo(video, timestamp);
        if (result.landmarks && result.landmarks.length > 0) {
          const lm = result.landmarks[0];
          const wrist = lm[0];
          const coords: number[] = [];
          for (const pt of lm) {
            coords.push(pt.x - wrist.x, pt.y - wrist.y, pt.z - wrist.z);
          }
          const raw = lm.map(pt => [pt.x, pt.y]);
          
          setLandmarks(raw);
          lastCoordsRef.current = coords;
        } else {
          setLandmarks([]);
          lastCoordsRef.current = null;
        }
      } catch (e) {
        console.error("Local hand landmark extraction failed:", e);
      }
    }, 120);
  }, []);

  // Start camera stream
  const startCamera = async () => {
    if (!handLandmarkerRef.current) {
      alert("MediaPipe Hand Tracker model is still loading. Please wait a moment and try again.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      startPredicting();
    } catch {
      alert("Camera access denied. Please verify camera permissions.");
    }
  };

  const handleCameraToggle = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Perform DTW Pose Scoring against Reference Library
  const scorePose = useCallback(async () => {
    if (!lastCoordsRef.current || isScoring) return;
    setIsScoring(true);
    try {
      const res = await fetch(`${SCORING_API}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sign: activeLetter, 
          language: activeLang, 
          coords: lastCoordsRef.current 
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`No reference template found for "${activeLetter}". Record one first by entering Capture mode.`);
        setIsScoring(false);
        return;
      }
      setScore(data.score);
      setGrade(data.grade);
      setScoreMsg(data.message);
      setFeedback(data.feedback || []);
      playAudioCue(data.audio_cue);

      if (data.score >= 70) {
        setStreak(s => s + 1);
      } else {
        setStreak(0);
      }
    } catch {
      console.warn("Scoring API is offline. Make sure scoring backend runs on port 8002.");
    }
    setIsScoring(false);
  }, [activeLetter, activeLang, isScoring]);

  // Auto-scoring timer inside Practice mode
  useEffect(() => {
    if (isCameraActive && mode === "practice") {
      scoreTimerRef.current = setInterval(scorePose, 1500);
    } else {
      if (scoreTimerRef.current) {
        clearInterval(scoreTimerRef.current);
        scoreTimerRef.current = null;
      }
    }
    return () => {
      if (scoreTimerRef.current) clearInterval(scoreTimerRef.current);
    };
  }, [isCameraActive, mode, scorePose]);

  // Capture Reference sequence frames
  const handleCapture = () => {
    if (capturing) return;
    setCapturing(true);
    const frames: number[][] = [];
    const captureInterval = setInterval(() => {
      if (lastCoordsRef.current) {
        frames.push([...lastCoordsRef.current]);
      }
      if (frames.length >= 10) {
        clearInterval(captureInterval);
        saveReference(frames);
        setCapturing(false);
      }
    }, 100);
  };

  const saveReference = async (frames: number[][]) => {
    try {
      await fetch(`${SCORING_API}/capture-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sign: activeLetter,
          language: activeLang,
          category: activeTab === "Letters" ? "letter" : "word",
          coords_sequence: frames,
        }),
      });
      playAudioCue("success");
      alert(`Successfully saved reference sign for "${activeLetter}"!`);
    } catch {
      alert("Scoring API not reachable. Check port 8002.");
    }
  };

  // Draw hand skeleton with status coloring
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!landmarks.length) return;

    const W = overlay.width, H = overlay.height;

    // Map finger status coloring
    const fingerStatus: Record<string, string> = {};
    feedback.forEach(f => {
      fingerStatus[f.finger] = f.status;
    });

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
      idxs.forEach(idx => {
        jointStatus[idx] = st;
      });
    });

    HAND_CONNECTIONS.forEach(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return;
      ctx.beginPath();
      ctx.moveTo(landmarks[a][0] * W, landmarks[a][1] * H);
      ctx.lineTo(landmarks[b][0] * W, landmarks[b][1] * H);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    });

    landmarks.forEach((pt, i) => {
      const st = jointStatus[i];
      let col = "rgba(255, 255, 255, 0.8)";
      if (st === "correct") col = "#10b981";
      else if (st === "warning") col = "#fbbf24";
      else if (st === "error") col = "#ef4444";
      else if (i === 0) col = "#8b5cf6";

      ctx.beginPath();
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = col;
      if (i === 0 || st !== "neutral") {
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks, feedback]);

  const signs = activeTab === 'Letters' ? SIGN_LIBRARY[activeLang].letters : SIGN_LIBRARY[activeLang].words;
  const gradeColor = grade === "excellent" ? "text-emerald-400" : grade === "good" ? "text-teal-400" : grade === "fair" ? "text-amber-400" : "text-rose-500";

  // Clean up timers
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-background">
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <WorkspaceHeader 
        title="SignAI"
        subtitle="Practice Workspace"
        badge="Learning"
        action={
          <div className="flex bg-muted/50 p-1 rounded-md border border-border">
            {['practice', 'capture'].map(m => (
              <button 
                key={m}
                onClick={() => setMode(m as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {m === "practice" ? "Practice Sign" : "Capture Template"}
              </button>
            ))}
          </div>
        }
      />

      <main className="flex-1 flex overflow-hidden max-h-[calc(100dvh-7.5rem)]">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-border bg-sidebar flex flex-col">
          <div className="p-4 border-b border-border space-y-4">
            <div className="flex bg-background p-1 rounded-md border border-border">
              <button 
                onClick={() => { setActiveLang('ISL'); setActiveLetter(SIGN_LIBRARY.ISL.letters[0]); }}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeLang === 'ISL' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                ISL
              </button>
              <button 
                onClick={() => { setActiveLang('ASL'); setActiveLetter(SIGN_LIBRARY.ASL.letters[0]); }}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeLang === 'ASL' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                ASL
              </button>
            </div>
            
            <div className="flex gap-4 px-2">
              <button 
                onClick={() => { setActiveTab('Letters'); setActiveLetter(SIGN_LIBRARY[activeLang].letters[0]); }}
                className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'Letters' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Letters
              </button>
              <button 
                onClick={() => { setActiveTab('Words'); setActiveLetter(SIGN_LIBRARY[activeLang].words[0]); }}
                className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'Words' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Words
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {signs.map(letter => (
              <button
                key={letter}
                onClick={() => { setActiveLetter(letter); }}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors border ${
                  activeLetter === letter 
                    ? 'bg-primary/20 border-primary text-primary-foreground' 
                    : 'bg-transparent border-transparent hover:bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-space font-bold w-6 ${activeLetter === letter ? 'text-primary' : ''}`}>
                    {letter}
                  </span>
                  <span className="text-xs uppercase tracking-wider opacity-70">
                    {activeTab === 'Letters' ? 'Fingerspell' : 'Gloss word'}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeLetter === letter ? 'text-primary' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 p-6 flex flex-col gap-6 relative overflow-y-auto">
          {mode === "capture" && (
            <div className="bg-amber-500/10 border border-amber-500/35 text-amber-500 rounded-xl p-4 text-xs font-medium">
              <span className="font-bold">CAPTURE TEMPLATE:</span> Align your hand perfectly inside the frame representing "{activeLetter}" sign and click <strong>Capture Reference</strong>.
            </div>
          )}

          <div className="flex-grow min-h-[360px] relative">
            <CameraFeed 
              isActive={isCameraActive}
              onToggle={handleCameraToggle}
              videoRef={videoRef}
              overlayRef={overlayRef}
              className="w-full h-full"
              overlay={isCameraActive ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                  <span className="text-[10px] text-primary/70 font-mono tracking-widest block">TARGET SIGN</span>
                  <span className="text-6xl font-space font-extrabold text-primary/30 tracking-wide">{activeLetter}</span>
                </div>
              ) : null}
            />
          </div>

          <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-mono">Sign Guide</p>
              <h2 className="text-xl font-space font-bold mb-1">Make the {activeLang} sign for "{activeLetter}"</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                data-testid="button-start-practice-camera"
                onClick={handleCameraToggle}
                className={`px-6 py-3 rounded-md font-semibold transition-colors flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-wider ${
                  isCameraActive 
                    ? 'bg-card border border-border hover:bg-accent/10' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isCameraActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isCameraActive ? 'Stop Camera' : 'Start Camera'}
              </button>
              
              {mode === "practice" ? (
                <button
                  data-testid="button-score-now"
                  onClick={scorePose}
                  disabled={!isCameraActive || isScoring}
                  className="px-6 py-3 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-wider"
                >
                  <Target className="w-3.5 h-3.5" />
                  {isScoring ? 'Scoring...' : 'Score Now'}
                </button>
              ) : (
                <button
                  onClick={handleCapture}
                  disabled={!isCameraActive || capturing}
                  className="px-6 py-3 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-wider"
                >
                  <Save className="w-3.5 h-3.5" />
                  {capturing ? 'Recording...' : 'Capture Reference'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-border bg-card/30 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="w-full flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Streak</span>
            <div className="flex items-center gap-2 text-orange-500 font-bold font-mono">
              <Flame className="w-5 h-5 fill-current" />
              {streak}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4 bg-background border border-border rounded-xl">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" className="stroke-zinc-900 fill-none stroke-[8]" />
                <circle 
                  cx="80"
                  cy="80"
                  r="70" 
                  className="stroke-primary fill-none stroke-[8]" 
                  strokeDasharray="440"
                  strokeDashoffset={score !== null ? 440 - (440 * score) / 100 : 440}
                  style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-space font-bold">{score !== null ? Math.round(score) : "-"}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Accuracy</span>
              </div>
            </div>
            
            {score !== null && (
              <div className="mt-4 text-center px-4 space-y-1">
                <span className={`text-sm font-bold capitalize font-space ${gradeColor}`}>{grade}</span>
                <p className="text-xs text-muted-foreground">{scoreMsg}</p>
              </div>
            )}
          </div>

          {/* Per-finger breakdown feedback */}
          {feedback.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block">Joint Breakdown</span>
              <div className="grid grid-cols-1 gap-2">
                {feedback.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${FINGER_COLORS[f.status]}`}>
                    <span className="h-2 w-2 mt-1 rounded-full bg-current" />
                    <div>
                      <span className="font-bold capitalize font-space block mb-0.5">{f.finger}</span>
                      <p className="opacity-80">{f.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
