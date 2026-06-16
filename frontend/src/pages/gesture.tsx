import { useState, useRef, useEffect, useCallback } from "react";
import { Activity, RotateCcw, Play, Square, Volume2, Mic, MicOff, RotateCw, Brain, Trash2 } from "lucide-react";
import { CameraFeed } from "@/components/workspace/CameraFeed";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";

const GESTURE_API = "https://sign-ai-ag5z.onrender.com";
const TRANSLATION_API = "https://signai-translation.onrender.com";


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

export default function Gesture() {
  const [activeTab, setActiveTab] = useState<'sign-to-text' | 'speech-to-sign' | 'train-model'>('sign-to-text');
  
  // Sign to Text States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState<number[][]>([]);
  const [detectedText, setDetectedText] = useState("");
  const [lastDetectedLetter, setLastDetectedLetter] = useState("");
  const [speaking, setSpeaking] = useState(false);

  // Data Collection & Training States
  const [collectedSamples, setCollectedSamples] = useState<{ coords: number[]; label: string }[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectLabel, setCollectLabel] = useState("A");
  const [isTraining, setIsTraining] = useState(false);


  // Speech to Sign States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
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
  const detectionTimerRef = useRef(0);
  const recognitionRef = useRef<any>(null);

  const isCollectingRef = useRef(false);
  const collectLabelRef = useRef("A");

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
    setIsCollecting(false);
  }, []);

  // Sync ref flags to prevent setInterval closures
  useEffect(() => {
    isCollectingRef.current = isCollecting;
  }, [isCollecting]);

  useEffect(() => {
    collectLabelRef.current = collectLabel;
  }, [collectLabel]);

  const trainModel = async () => {
    if (collectedSamples.length < 10) {
      alert("Please collect at least 10 samples first!");
      return;
    }
    setIsTraining(true);
    try {
      const res = await fetch(`${GESTURE_API}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: collectedSamples }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Model trained successfully on ${data.samples} samples! Classes: ${data.classes.join(", ")}`);
        setPrediction(null);
      } else {
        alert(`Training failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error reaching gesture backend training API: ${err.message || err}`);
    }
    setIsTraining(false);
  };

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

        if (data.coords && isCollectingRef.current) {
          setCollectedSamples(prev => [
            ...prev,
            { coords: data.coords, label: collectLabelRef.current }
          ]);
        }
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

  // Toggle Camera
  const handleCameraToggle = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Accumulate predictions into stable text
  useEffect(() => {
    if (prediction && prediction !== "untrained" && confidence > 0.82) {
      if (prediction === lastDetectedLetter) {
        detectionTimerRef.current += 1;
        if (detectionTimerRef.current >= 6) { // Held for ~900ms (6 * 150ms)
          setDetectedText(text => {
            // Append letter (or space if predicted gap)
            const cleanLetter = prediction === "space" ? " " : prediction;
            return text + cleanLetter;
          });
          setLastDetectedLetter("");
          detectionTimerRef.current = 0;
        }
      } else {
        setLastDetectedLetter(prediction);
        detectionTimerRef.current = 1;
      }
    } else {
      detectionTimerRef.current = 0;
    }
  }, [prediction, confidence, lastDetectedLetter]);

  // Draw hand landmarks on overlay canvas
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video || activeTab !== "sign-to-text") return;
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
  }, [landmarks, activeTab]);

  // Speak accumulated output text
  const speakText = () => {
    if (!detectedText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(detectedText);
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Switch tabs & stop camera/speech recognition if running
  const handleTabChange = (tab: 'sign-to-text' | 'speech-to-sign' | 'train-model') => {
    setActiveTab(tab);
    stopCamera();
    if (isRecording) {
      stopRecording();
    }
  };

  // Speech to Sign Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // English (Indian dialect)

      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      rec.onresult = async (e: any) => {
        const textTranscript = e.results[0][0].transcript;
        setTranscript(textTranscript);
        
        // Translate speech transcript to signs
        try {
          const res = await fetch(`${TRANSLATION_API}/text-to-signs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textTranscript }),
          });
          const data = await res.json();
          setGlossWords(data.gloss || []);
          setSigns(data.signs || []);
          if (data.signs && data.signs.length > 0) {
            setActiveSignIndex(0);
            setPlaying(true);
          }
        } catch {
          // Fallback: Fingerspell the transcript
          const upperText = textTranscript.trim().toUpperCase();
          const gloss = upperText.split(" ");
          const fallbackSigns: SignItem[] = [];
          gloss.forEach((word: string) => {
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
      recognitionRef.current = rec;
    }
  }, []);

  // Playback timer for fingerspelling animations
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

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }
    setTranscript("");
    setGlossWords([]);
    setSigns([]);
    setActiveSignIndex(-1);
    setPlaying(false);
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const renderActiveSign = () => {
    if (activeSignIndex < 0 || activeSignIndex >= signs.length) {
      return (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
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
        subtitle="Gesture Workspace"
        badge="Phase 1"
        action={
          <div className="flex bg-muted/50 p-1 rounded-md">
            <button 
              data-testid="tab-gesture-sign-to-text"
              onClick={() => handleTabChange('sign-to-text')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeTab === 'sign-to-text' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign to Text
            </button>
            <button 
              data-testid="tab-gesture-speech-to-sign"
              onClick={() => handleTabChange('speech-to-sign')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeTab === 'speech-to-sign' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Speech to Sign
            </button>
            <button 
              onClick={() => handleTabChange('train-model')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeTab === 'train-model' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Train Gestures
            </button>
          </div>
        }
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-screen-2xl mx-auto w-full">
        {activeTab === 'sign-to-text' ? (
          <>
            {/* Sign to Text Panel */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <CameraFeed 
                isActive={isCameraActive}
                onToggle={handleCameraToggle}
                videoRef={videoRef}
                overlayRef={overlayRef}
                className="w-full aspect-[16/9] lg:aspect-auto lg:h-[550px]"
                overlay={isCameraActive && prediction && prediction !== "untrained" && confidence > 0.65 ? (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center bg-black/75 px-6 py-3 rounded-2xl border border-primary/20 backdrop-blur-md">
                    <span className="text-5xl font-space font-bold text-teal-400">{prediction}</span>
                    <span className="text-[10px] text-teal-500/80 font-mono tracking-widest mt-1 uppercase">
                      Confidence: {Math.round(confidence * 100)}%
                    </span>
                  </div>
                ) : null}
              />

              <div className="flex gap-3">
                <button
                  data-testid="button-toggle-recognition"
                  onClick={handleCameraToggle}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-md font-semibold transition-colors ${
                    isCameraActive 
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isCameraActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                </button>
                <button
                  data-testid="button-clear-output"
                  onClick={() => setDetectedText("")}
                  className="px-6 py-3.5 rounded-md bg-card border border-border text-foreground font-semibold hover:bg-accent/10 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-[550px]">
                <h3 className="font-space font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                  <Activity className="w-4 h-4 text-primary" />
                  Live Output
                </h3>
                
                <div className="flex-1 bg-background/50 rounded-lg border border-border/50 p-4 mb-4 overflow-y-auto">
                  <p className={`font-space text-lg leading-relaxed ${detectedText.length === 0 ? 'text-muted-foreground italic text-sm' : 'text-foreground font-bold'}`}>
                    {detectedText || "Signs you hold for ~1s will build a sentence here..."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <button
                    onClick={speakText}
                    disabled={!detectedText}
                    className="w-full py-3 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                  >
                    <Volume2 className="w-4 h-4" />
                    {speaking ? "Speaking..." : "Speak Text"}
                  </button>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Model</div>
                      <div className="font-medium text-xs font-mono">FastAPI Predict</div>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Stability</div>
                      <div className="font-medium text-xs text-green-500 font-mono flex items-center gap-1">
                        900ms Hold
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'speech-to-sign' ? (
          <>
            {/* Speech to Sign Panel */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center h-[550px] relative">
                {renderActiveSign()}
                
                {signs.length > 0 && activeSignIndex >= 0 && (
                  <div className="absolute bottom-6 flex gap-1 justify-center max-w-[90%] overflow-x-auto p-1">
                    {signs.filter(s => s.type === "letter").map((_, i) => {
                      // Map active index from the global signs list to the sublist of letters
                      let letterIndex = -1;
                      for (let j = 0; j <= activeSignIndex; j++) {
                        if (signs[j].type === "letter") letterIndex++;
                      }
                      return (
                        <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i < letterIndex ? 'bg-primary' : i === letterIndex ? 'bg-teal-400' : 'bg-zinc-800'}`} />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 py-3.5 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isRecording 
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 animate-pulse' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Listening... Tap to stop' : 'Tap to Speak English'}
                </button>
                {signs.length > 0 && (
                  <button
                    onClick={() => { setActiveSignIndex(0); setPlaying(true); }}
                    className="px-6 py-3.5 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors"
                  >
                    Replay
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-[550px]">
                <h3 className="font-space font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                  Interactive Timeline
                </h3>

                <div className="space-y-4 flex-1">
                  <div className="bg-background/50 rounded-lg border border-border/50 p-4 min-h-[80px]">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Transcript</span>
                    <p className={`text-sm ${!transcript ? 'text-muted-foreground italic' : 'text-foreground font-medium'}`}>
                      {transcript || "Speak to see translation transcript..."}
                    </p>
                  </div>

                  <div className="bg-background/50 rounded-lg border border-border/50 p-4 min-h-[100px]">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-2">ISL Gloss Timeline</span>
                    <div className="flex flex-wrap gap-2">
                      {glossWords.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No gloss loaded</span>
                      ) : (
                        glossWords.map((word, idx) => {
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
                              className={`text-xs px-2.5 py-1 rounded font-mono font-bold border transition-colors ${
                                isWordActive 
                                  ? 'bg-primary/20 border-primary text-primary' 
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-lg border border-border/50 p-4">
                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-mono mb-2">
                      <span>Speed Multiplier</span>
                      <span>{playbackSpeed}s / letter</span>
                    </div>
                    <input 
                      type="range"
                      min="0.3"
                      max="2.0"
                      step="0.1"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full accent-primary bg-zinc-900 border border-zinc-800 rounded-lg appearance-none h-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Train Gestures Panel */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-amber-500/10 border border-amber-500/35 text-amber-500 rounded-xl p-4 text-xs font-semibold">
                ⚠️ TRAINING HUB: Select a target label, start the camera, click "Start Collection", and hold the gesture. Collect 30+ samples per label, then click "Train Local Classifier".
              </div>

              <CameraFeed 
                isActive={isCameraActive}
                onToggle={handleCameraToggle}
                videoRef={videoRef}
                overlayRef={overlayRef}
                className="w-full aspect-[16/9] lg:aspect-auto lg:h-[480px]"
                overlay={
                  isCameraActive && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center bg-black/80 px-6 py-3 rounded-2xl border border-amber-500/20 backdrop-blur-md">
                      <span className="text-4xl font-space font-bold text-amber-400">Collecting: "{collectLabel}"</span>
                      <span className="text-xs text-muted-foreground font-mono mt-1 uppercase">
                        Current Class Count: {collectedSamples.filter(s => s.label === collectLabel).length} samples
                      </span>
                    </div>
                  )
                }
              />

              <div className="flex gap-3">
                <button
                  onClick={handleCameraToggle}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-md font-semibold transition-colors ${
                    isCameraActive 
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isCameraActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                </button>

                <button
                  onClick={() => setIsCollecting(c => !c)}
                  disabled={!isCameraActive}
                  className={`flex-1 py-3.5 rounded-md font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    isCollecting 
                      ? 'bg-amber-500 text-black border-amber-600 hover:bg-amber-400 font-bold animate-pulse' 
                      : 'bg-card border-border text-foreground hover:bg-accent/10 disabled:opacity-50'
                  }`}
                >
                  <Activity className="w-4 h-4 animate-pulse" style={{ display: isCollecting ? 'block' : 'none' }} />
                  {isCollecting ? 'Recording Coords...' : 'Start Collection'}
                </button>
              </div>
            </div>

            {/* Right Column - Dataset Coordinator */}
            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full justify-between min-h-[480px]">
                <div>
                  <h3 className="font-space font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Brain className="w-4 h-4 text-amber-400" />
                    Dataset Coordinator
                  </h3>

                  <div className="mb-4">
                    <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1.5">Active Target Label</label>
                    <div className="grid grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1 bg-zinc-950 border border-zinc-900 rounded-lg">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
                        const count = collectedSamples.filter(s => s.label === letter).length;
                        return (
                          <button
                            key={letter}
                            onClick={() => setCollectLabel(letter)}
                            className={`py-1.5 rounded font-mono font-bold text-xs border transition-all ${
                              collectLabel === letter 
                                ? 'bg-amber-500 border-amber-600 text-black' 
                                : count >= 30 
                                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' 
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            {letter}
                            <span className="block text-[8px] opacity-70 font-normal">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-lg border border-border/50 p-4 mb-4">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Status Summary</span>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono mt-2">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Total Samples</span>
                        <span className="text-lg font-bold text-foreground">{collectedSamples.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Classes Active</span>
                        <span className="text-lg font-bold text-amber-400">
                          {new Set(collectedSamples.map(s => s.label)).size} classes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  <button
                    onClick={trainModel}
                    disabled={isTraining || collectedSamples.length < 10}
                    className="w-full py-3.5 rounded-md bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                  >
                    {isTraining ? 'Training Model...' : '⚡ Train Local Classifier'}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear your current local training dataset?")) {
                        setCollectedSamples([]);
                      }
                    }}
                    className="w-full py-3 rounded-md bg-card border border-border text-destructive font-semibold hover:bg-destructive/10 transition-colors text-xs uppercase tracking-widest"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                    Clear Dataset
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
