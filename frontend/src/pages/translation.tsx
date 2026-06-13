import { useState, useRef, useEffect, useCallback } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { CameraFeed } from "@/components/workspace/CameraFeed";
import { Brain, Trash2, Plus, ArrowRight, Volume2, Mic, MicOff, RotateCw } from "lucide-react";

const GESTURE_API = "http://localhost:8000";
const TRANSLATION_API = "http://localhost:8001";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

interface SignItem {
  type: 'letter' | 'pause' | 'word_label';
  value: string;
}

export default function Translation() {
  const [activeMode, setActiveMode] = useState<'s2t' | 't2s'>('s2t');
  
  // Health checks
  const [gestureApiLive, setGestureApiLive] = useState(false);
  const [translationApiLive, setTranslationApiLive] = useState(false);

  // Sign to Text States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState<number[][]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [lastDetectedLetter, setLastDetectedLetter] = useState("");
  const [detectionTimer, setDetectionTimer] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  // Text to Sign States
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [glossWords, setGlossWords] = useState<string[]>([]);
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [activeSignIndex, setActiveSignIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.8); // seconds per letter

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Perform active API health checks
  useEffect(() => {
    const runHealthChecks = () => {
      fetch(`${GESTURE_API}/status`)
        .then(r => r.json())
        .then(() => setGestureApiLive(true))
        .catch(() => setGestureApiLive(false));

      fetch(`${TRANSLATION_API}/health`)
        .then(r => r.json())
        .then(() => setTranslationApiLive(true))
        .catch(() => setTranslationApiLive(false));
    };

    runHealthChecks();
    const timer = setInterval(runHealthChecks, 8000);
    return () => clearInterval(timer);
  }, []);

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
    setIsCameraActive(false);
    setPrediction(null);
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
        setConfidence(data.confidence);
        setLandmarks(data.landmarks || []);
      } catch {}
    }, 150);
  }, [captureFrame]);

  // Start camera stream
  const startCamera = async () => {
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

  // Accumulate predictions into stable letters inside the Sign Accumulator Queue
  useEffect(() => {
    if (prediction && prediction !== "untrained" && confidence > 0.82) {
      if (prediction === lastDetectedLetter) {
        setDetectionTimer(prev => {
          if (prev >= 6) { // Held for ~900ms (6 * 150ms)
            const cleanLetter = prediction === "space" ? " " : prediction;
            setQueue(q => [...q, cleanLetter]);
            setLastDetectedLetter("");
            return 0;
          }
          return prev + 1;
        });
      } else {
        setLastDetectedLetter(prediction);
        setDetectionTimer(1);
      }
    } else {
      setDetectionTimer(0);
    }
  }, [prediction, confidence, lastDetectedLetter]);

  // Draw landmarks on overlay canvas
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video || activeMode !== "s2t") return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!landmarks.length) return;

    const W = overlay.width, H = overlay.height;

    HAND_CONNECTIONS.forEach(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return;
      ctx.beginPath();
      ctx.moveTo(landmarks[a][0] * W, landmarks[a][1] * H);
      ctx.lineTo(landmarks[b][0] * W, landmarks[b][1] * H);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    landmarks.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 7 : 4.5, 0, Math.PI * 2);
      if (i === 0) {
        ctx.fillStyle = "#8b5cf6";
        ctx.shadowColor = "#8b5cf6";
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks, activeMode]);

  // Manual entry helper
  const addToQueue = (letter: string) => {
    if (letter) {
      const clean = letter.trim().toUpperCase();
      if (clean.length === 1) {
        setQueue([...queue, clean]);
      } else {
        setQueue([...queue, ...clean.split("")]);
      }
      setManualInput("");
    }
  };

  // Remove individual sequence item
  const removeQueueItem = (idx: number) => {
    setQueue(q => q.filter((_, i) => i !== idx));
  };

  // Perform translation: Sign Sequence (Letters) -> Grammatical English
  const translateQueue = async () => {
    if (queue.length === 0) return;
    setLoadingTranslation(true);
    try {
      const res = await fetch(`${TRANSLATION_API}/sign-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signs: queue }),
      });
      const data = await res.json();
      setTranslatedText(data.sentence);
    } catch {
      setTranslatedText(queue.join(""));
    }
    setLoadingTranslation(false);
  };

  // Speak translation using browser speech synthesis
  const speakTranslation = () => {
    if (!translatedText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Mode switcher cleanup
  const handleModeChange = (mode: 's2t' | 't2s') => {
    setActiveMode(mode);
    stopCamera();
    if (isListening) stopListening();
  };

  // Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // English (Indian dialect)

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e: any) => {
        const textTranscript = e.results[0][0].transcript;
        setInputText(textTranscript);
      };
      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }
    setInputText("");
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Perform English Text/Speech -> ISL Gloss Animation Playback
  const translateTextToSign = async () => {
    if (!inputText.trim()) return;
    setPlaying(false);
    setActiveSignIndex(-1);
    try {
      const res = await fetch(`${TRANSLATION_API}/text-to-signs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setGlossWords(data.gloss || []);
      setSigns(data.signs || []);
      if (data.signs && data.signs.length > 0) {
        setActiveSignIndex(0);
        setPlaying(true);
      }
    } catch {
      // Fallback: Fingerspell the raw text
      const cleanText = inputText.trim().toUpperCase();
      const gloss = cleanText.split(" ");
      const fallbackSigns: SignItem[] = [];
      gloss.forEach(word => {
        fallbackSigns.push({ type: "word_label", value: word });
        for (const char of word) {
          if (char.match(/[A-Z]/)) fallbackSigns.push({ type: "letter", value: char });
        }
        fallbackSigns.push({ type: "pause", value: "" });
      });
      setGlossWords(gloss);
      setSigns(fallbackSigns);
      if (fallbackSigns.length > 0) {
        setActiveSignIndex(0);
        setPlaying(true);
      }
    }
  };

  // Timeline playback timer
  useEffect(() => {
    let timer: any;
    if (playing && activeSignIndex >= 0 && activeSignIndex < signs.length) {
      const currentSign = signs[activeSignIndex];
      const delay = currentSign.type === "pause" ? 600 : playbackSpeed * 1000;
      timer = setTimeout(() => {
        setActiveSignIndex(prev => {
          if (prev + 1 < signs.length) return prev + 1;
          setPlaying(false);
          return -1;
        });
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [playing, activeSignIndex, signs, playbackSpeed]);

  const renderActiveSign = () => {
    if (activeSignIndex < 0 || activeSignIndex >= signs.length) {
      return (
        <div className="text-center text-muted-foreground flex flex-col items-center justify-center p-6">
          <RotateCw className="w-10 h-10 mb-3 opacity-30 animate-spin" />
          <p className="text-xs tracking-wider">Awaiting playback sequence...</p>
        </div>
      );
    }
    const current = signs[activeSignIndex];
    if (current.type === "letter") {
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-primary animate-spin" style={{ animationDuration: '10s' }} />
          <span className="absolute text-7xl font-space font-bold text-primary">{current.value}</span>
        </div>
      );
    } else if (current.type === "word_label") {
      return (
        <div className="text-center p-4">
          <div className="text-[10px] text-primary font-mono tracking-widest uppercase mb-1">GLOSS WORD</div>
          <div className="text-3xl font-space font-bold text-foreground tracking-tight">{current.value}</div>
        </div>
      );
    } else if (current.type === "pause") {
      return (
        <div className="text-center">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest">[ PAUSE ]</div>
        </div>
      );
    }
    return null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-background">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <WorkspaceHeader 
        title="SignAI"
        subtitle="Translation Studio"
        badge="Phase 2"
        action={
          <div className="flex bg-muted/50 p-1 rounded-md">
            <button 
              onClick={() => handleModeChange('s2t')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeMode === 's2t' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign/Gesture to Text (Claude LLM)
            </button>
            <button 
              onClick={() => handleModeChange('t2s')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeMode === 't2s' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Text/Speech to Sign (ISL Gloss Animation)
            </button>
          </div>
        }
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1600px] mx-auto w-full">
        {activeMode === 's2t' ? (
          <>
            {/* Left Column - Webcam & Accumulator */}
            <div className="flex flex-col gap-6">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <h3 className="font-space font-bold uppercase tracking-wider text-xs text-muted-foreground">Webcam Capture</h3>
                <CameraFeed 
                  isActive={isCameraActive}
                  onToggle={handleCameraToggle}
                  videoRef={videoRef}
                  overlayRef={overlayRef}
                  className="w-full aspect-video"
                  overlay={isCameraActive && prediction && prediction !== "untrained" && confidence > 0.65 ? (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center bg-black/75 px-6 py-2.5 rounded-2xl border border-primary/20 backdrop-blur-md">
                      <span className="text-4xl font-space font-bold text-teal-400">{prediction}</span>
                      <span className="text-[9px] text-teal-500/80 font-mono tracking-widest mt-1 uppercase">
                        {Math.round(confidence * 100)}% [ {Array(detectionTimer).fill("■").join("")} ]
                      </span>
                    </div>
                  ) : null}
                />
                <button
                  onClick={handleCameraToggle}
                  className={`w-full py-4 rounded-md font-bold uppercase tracking-widest text-sm transition-colors ${
                    isCameraActive 
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isCameraActive ? 'Stop Gesture Recognition' : 'Start Gesture Recognition'}
                </button>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-space font-bold uppercase tracking-wider text-xs text-muted-foreground">Sign Accumulator Queue</h3>
                  <div className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold font-mono">
                    {queue.length} items
                  </div>
                </div>
                
                <div className="flex-1 bg-background border border-border rounded-lg p-4 flex flex-wrap gap-2 content-start min-h-[120px] overflow-y-auto">
                  {queue.length === 0 ? (
                    <span className="text-muted-foreground text-sm italic">Queue is empty...</span>
                  ) : (
                    queue.map((item, i) => (
                      <span key={i} className="bg-card border border-border px-3 py-1 rounded text-lg font-space font-bold animate-in fade-in zoom-in duration-200 relative group">
                        {item}
                        <button 
                          onClick={() => removeQueueItem(i)}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground w-4 h-4 rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addToQueue(manualInput)}
                    placeholder="Manual entry..."
                    className="flex-1 bg-background border border-border rounded-md px-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <button 
                    onClick={() => addToQueue(manualInput)}
                    className="px-4 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center hover:bg-secondary/80"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setQueue([])}
                    className="px-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-center justify-center hover:bg-destructive/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Translate Output */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full justify-between gap-6">
              <h3 className="font-space font-bold uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">
                <Brain className="w-4 h-4" /> AI Translation Panel
              </h3>
              
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">LLM Translated Sentence</div>
                  <div className="bg-background border border-border rounded-lg p-6 min-h-[160px]">
                    {loadingTranslation ? (
                      <p className="text-muted-foreground italic animate-pulse">Claude is translating sequence...</p>
                    ) : translatedText ? (
                      <p className="text-xl leading-relaxed text-foreground font-semibold animate-in fade-in">{translatedText}</p>
                    ) : (
                      <p className="text-muted-foreground italic">Translated output will appear here...</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {translatedText && (
                    <button
                      onClick={speakTranslation}
                      disabled={speaking}
                      className="py-2.5 px-4 rounded-full bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest hover:bg-secondary/80 transition-colors flex items-center gap-2 w-fit"
                    >
                      <Volume2 className="w-4.5 h-4.5" />
                      {speaking ? "Speaking..." : "Listen TTS"}
                    </button>
                  )}

                  <button
                    onClick={translateQueue}
                    disabled={queue.length === 0 || loadingTranslation}
                    className="w-full py-5 bg-primary text-primary-foreground rounded-md font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Translate Sequence <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground font-space">Fingerspelling translation tips:</span>
                  <ol className="list-decimal pl-4 mt-2 space-y-1">
                    <li>Position your hand inside the webcam scanner frame.</li>
                    <li>Hold gestures static for ~1s to register.</li>
                    <li>FastAPI forwards sequences to Claude to correct mistakes and insert grammar.</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left Column - Text/Voice Input */}
            <div className="flex flex-col gap-6">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <h3 className="font-space font-bold uppercase tracking-wider text-xs text-muted-foreground">Interactive translation panel</h3>
                <div className="flex flex-col gap-4 bg-background/50 border border-border/60 rounded-xl p-4">
                  <textarea
                    className="w-full min-h-[90px] bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-primary resize-none"
                    placeholder="Type a sentence in English, or click the mic button to speak... (e.g. 'I am going to the store')"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`px-4 rounded-md border flex items-center justify-center hover:bg-accent/10 transition-colors ${
                        isListening ? 'bg-destructive/10 border-destructive text-destructive animate-pulse' : 'border-border text-muted-foreground'
                      }`}
                      title="Speak into Microphone"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={translateTextToSign}
                      disabled={!inputText.trim()}
                      className="flex-1 py-3 bg-primary text-primary-foreground rounded-md font-bold text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      Translate English to ISL Gloss
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 flex-1">
                <h3 className="font-space font-bold uppercase tracking-wider text-xs text-muted-foreground">ISL Structure Details</h3>
                <div className="bg-background border border-border rounded-lg p-5 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">ISL Gloss Path</span>
                    <p className="text-lg font-space font-bold text-primary tracking-tight">
                      {glossWords.length > 0 ? glossWords.join(" ➔ ") : "[ No Gloss Loaded ]"}
                    </p>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    ISL drops helping verbs/articles and uses <strong>Topic-Comment</strong> layout.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Visualizer Animation Player */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full justify-between gap-6">
              <h3 className="font-space font-bold uppercase tracking-wider text-xs text-muted-foreground">Sign Language Animation Player</h3>
              
              <div className="flex-grow flex flex-col gap-6 justify-between">
                {/* Timeline gloss timeline */}
                {glossWords.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/40 scrollbar-thin">
                    {glossWords.map((word, idx) => {
                      let isWordActive = false;
                      if (activeSignIndex >= 0 && activeSignIndex < signs.length) {
                        let targetWordIdx = -1;
                        for (let i = 0; i <= activeSignIndex; i++) {
                          if (signs[i].type === "word_label") targetWordIdx++;
                        }
                        isWordActive = targetWordIdx === idx;
                      }

                      return (
                        <span 
                          key={idx} 
                          className={`text-xs px-3 py-1.5 rounded font-mono font-bold border whitespace-nowrap ${
                            isWordActive 
                              ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(139,92,246,0.15)]' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Animated virtual display */}
                <div className="bg-zinc-950/80 border border-border rounded-xl flex items-center justify-center min-h-[220px] relative overflow-hidden">
                  {renderActiveSign()}
                  <span className="absolute bottom-3 left-3 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Signing Player</span>
                </div>

                {/* Playback Controls */}
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPlaying(!playing)}
                      disabled={signs.length === 0}
                      className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-md font-bold text-xs uppercase tracking-widest hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                    >
                      {playing ? "Pause" : "Play Animation"}
                    </button>
                    <button
                      onClick={() => { setActiveSignIndex(0); setPlaying(true); }}
                      disabled={signs.length === 0}
                      className="px-6 py-3 border border-border text-foreground rounded-md font-bold text-xs uppercase tracking-widest hover:bg-accent/10 disabled:opacity-50 transition-colors"
                    >
                      Replay
                    </button>
                  </div>

                  <div className="bg-background rounded-lg border border-border/85 p-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-mono mb-1.5">
                      <span>Playback Speed</span>
                      <span>{playbackSpeed}s / letter</span>
                    </div>
                    <input 
                      type="range"
                      min="0.3"
                      max="2.0"
                      step="0.1"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full accent-primary bg-zinc-900 border border-zinc-850 rounded-lg appearance-none h-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
