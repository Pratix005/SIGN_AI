import { useState, useRef, useEffect, useCallback } from "react";

const GESTURE_API = "http://localhost:8000";
const TRANSLATION_API = "http://localhost:8001";

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// Stylized CSS for TranslationApp
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #09090b;
    --bg2: #0d0d10;
    --bg3: #131317;
    --border: rgba(139,92,246,0.12);
    --border-bright: rgba(139,92,246,0.35);
    --cyan: #8b5cf6;
    --cyan-dim: rgba(139,92,246,0.12);
    --amber: #10b981;
    --amber-dim: rgba(16,185,129,0.12);
    --green: #10b981;
    --green-dim: rgba(16,185,129,0.12);
    --red: #ef4444;
    --text: #f0f0f5;
    --text-dim: #71727a;
    --text-muted: #27272a;
    --font-display: 'Plus Jakarta Sans', sans-serif;
    --font-mono: 'Inter', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-mono); }

  .app {
    display: flex;
    flex-direction: column;
    background: var(--bg);
    position: relative;
    overflow: hidden;
  }

  .app::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .app::after {
    content: '';
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Header */
  .header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 14px 28px;
    border-bottom: 1px solid var(--border);
    background: rgba(4,7,15,0.8);
    backdrop-filter: blur(12px);
  }

  .header-logo {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 15px;
    letter-spacing: -0.01em;
    color: var(--cyan);
  }
  .header-logo span { color: var(--text-dim); font-weight: 400; }

  .api-status-group {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .api-status-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--red);
    box-shadow: 0 0 6px currentColor;
    transition: background 0.4s, box-shadow 0.4s;
  }
  .status-dot.live { background: var(--green); box-shadow: 0 0 8px var(--green); }

  .status-text {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.05em;
  }

  .phase-badge {
    margin-left: auto;
    font-size: 10px;
    color: var(--cyan);
    letter-spacing: 0.12em;
    border: 1px solid var(--cyan);
    padding: 3px 8px;
    border-radius: 3px;
    text-transform: uppercase;
    background: rgba(0,212,255,0.05);
  }

  /* Mode Bar */
  .tab-bar {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: rgba(8,13,26,0.3);
    border-bottom: 1px solid var(--border);
    position: relative;
    z-index: 5;
  }

  .tab-btn {
    padding: 10px 24px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tab-btn:hover {
    border-color: var(--border-bright);
    color: var(--text);
  }
  .tab-btn.active {
    background: var(--cyan-dim);
    border-color: var(--cyan);
    color: var(--cyan);
    box-shadow: 0 0 15px rgba(0,212,255,0.15);
  }

  /* Layout */
  .layout {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    gap: 0;
  }

  /* Columns */
  .main-col {
    flex: 1;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: visible;
  }

  .side-col {
    width: 380px;
    border-left: 1px solid var(--border);
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    background: rgba(8,13,26,0.4);
    overflow-y: visible;
  }

  /* Camera Container */
  .camera-wrap {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: var(--bg2);
    aspect-ratio: 4/3;
    border: 1px solid var(--border);
    transition: border-color 0.4s;
    width: 100%;
    max-width: 580px;
    margin: 0 auto;
  }
  .camera-wrap.active { border-color: var(--border-bright); }
  .camera-wrap.active::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    box-shadow: inset 0 0 40px rgba(0,212,255,0.06);
    pointer-events: none;
    z-index: 2;
  }

  .camera-wrap video {
    width: 100%; height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
    display: block;
  }

  .camera-wrap canvas.overlay {
    position: absolute;
    inset: 0;
    width: 100%; height: 100%;
    transform: scaleX(-1);
    pointer-events: none;
    z-index: 3;
  }

  .scanline {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(transparent, rgba(0,212,255,0.15), transparent);
    animation: scanline 3s linear infinite;
    z-index: 4;
    pointer-events: none;
  }
  @keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }

  .corner { position: absolute; width: 20px; height: 20px; z-index: 4; }
  .corner-tl { top: 12px; left: 12px; border-top: 2px solid var(--cyan); border-left: 2px solid var(--cyan); border-radius: 4px 0 0 0; }
  .corner-tr { top: 12px; right: 12px; border-top: 2px solid var(--cyan); border-right: 2px solid var(--cyan); border-radius: 0 4px 0 0; }
  .corner-bl { bottom: 12px; left: 12px; border-bottom: 2px solid var(--cyan); border-left: 2px solid var(--cyan); border-radius: 0 0 0 4px; }
  .corner-br { bottom: 12px; right: 12px; border-bottom: 2px solid var(--cyan); border-right: 2px solid var(--cyan); border-radius: 0 0 4px 0; }

  .camera-idle {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .idle-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }
  .idle-text { font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; }

  .btn-start {
    width: 100%;
    max-width: 580px;
    margin: 0 auto;
    padding: 14px;
    border-radius: 10px;
    border: 1px solid;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: all 0.2s;
  }
  .btn-start.start { background: var(--cyan-dim); border-color: var(--border-bright); color: var(--cyan); }
  .btn-start.start:hover { background: rgba(0,212,255,0.22); box-shadow: 0 0 20px rgba(0,212,255,0.15); }
  .btn-start.stop { background: transparent; border-color: var(--border); color: var(--text-dim); }
  .btn-start.stop:hover { border-color: var(--red); color: var(--red); }

  /* Sign input bar */
  .sign-sequence-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 580px;
    margin: 0 auto;
  }

  .sequence-label {
    font-size: 9px;
    color: var(--text-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
  }

  .sequence-wrapper {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    min-height: 72px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 8px;
  }

  .sequence-empty {
    color: var(--text-muted);
    font-size: 11px;
    align-self: center;
    margin: auto;
  }

  .seq-pill {
    padding: 6px 12px;
    border-radius: 6px;
    background: rgba(0,212,255,0.06);
    border: 1px solid rgba(0,212,255,0.2);
    color: var(--cyan);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: pop-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  @keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  .seq-pill button {
    background: transparent;
    border: none;
    color: var(--cyan);
    opacity: 0.5;
    cursor: pointer;
    font-size: 10px;
    font-family: var(--font-mono);
  }
  .seq-pill button:hover { opacity: 1; }

  .manual-input-box {
    display: flex;
    gap: 8px;
  }

  .manual-input-box input {
    flex: 1;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
  }
  .manual-input-box input:focus {
    outline: none;
    border-color: var(--cyan);
  }

  .manual-input-box button {
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid var(--border-bright);
    background: var(--cyan-dim);
    color: var(--cyan);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    cursor: pointer;
  }
  .manual-input-box button:hover {
    background: rgba(0,212,255,0.22);
  }

  /* Right column (Translation details) */
  .trans-section-label {
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .trans-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .result-card {
    background: linear-gradient(135deg, rgba(8,13,26,0.8) 0%, rgba(13,20,36,0.6) 100%);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
  }
  .result-card.glow {
    border-color: var(--border-bright);
    box-shadow: 0 0 30px rgba(0,212,255,0.04);
  }

  .result-label {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .translated-text {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--green);
    line-height: 1.4;
    min-height: 36px;
  }

  .raw-seq-label {
    font-size: 11px;
    color: var(--text-dim);
  }
  .raw-seq-label span {
    color: var(--cyan);
    font-family: var(--font-mono);
  }

  .btn-action-big {
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    border: 1px solid rgba(0,229,160,0.4);
    background: var(--green-dim);
    color: var(--green);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-action-big:hover:not(:disabled) {
    background: rgba(0,229,160,0.22);
    box-shadow: 0 0 20px rgba(0,229,160,0.15);
  }
  .btn-action-big:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .voice-out-btn {
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--border);
    padding: 6px 12px;
    border-radius: 20px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .voice-out-btn:hover {
    color: var(--text);
    border-color: var(--border-bright);
  }

  /* Live prediction overlay box in Phase 2 Sign-to-text */
  .predict-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0,212,255,0.04);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
  }

  .predict-letter {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    color: var(--amber);
  }

  /* Text-to-Sign Visualizer Styling */
  .input-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
  }

  .text-textarea {
    width: 100%;
    min-height: 80px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text);
    resize: none;
  }
  .text-textarea:focus {
    outline: none;
    border-color: var(--cyan);
  }

  .input-controls {
    display: flex;
    gap: 12px;
  }

  .mic-btn {
    aspect-ratio: 1;
    width: 46px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.2s;
  }
  .mic-btn:hover { border-color: var(--border-bright); color: var(--cyan); }
  .mic-btn.listening {
    background: rgba(255,77,109,0.12);
    border-color: var(--red);
    color: var(--red);
    animation: mic-pulse 1.5s infinite;
  }
  @keyframes mic-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

  .visualizer-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .avatar-display {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 12px;
    background: var(--bg3);
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .active-letter-circle {
    width: 140px; height: 140px;
    border-radius: 50%;
    border: 2px dashed var(--cyan);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 72px;
    font-weight: 800;
    color: var(--cyan);
    text-shadow: 0 0 30px rgba(0,212,255,0.4);
    animation: rotate-border 20s linear infinite;
  }
  @keyframes rotate-border { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .letter-display-inner {
    position: absolute;
    font-family: var(--font-display);
    font-size: 80px;
    font-weight: 800;
    color: var(--cyan);
  }

  .avatar-label {
    position: absolute;
    bottom: 12px;
    left: 12px;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .playback-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

  .btn-ctrl {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
  }
  .btn-ctrl:hover { border-color: var(--border-bright); color: var(--text); }
  .btn-ctrl.primary { background: var(--cyan-dim); border-color: var(--cyan); color: var(--cyan); }

  .speed-slider {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10px;
    color: var(--text-dim);
  }
  .speed-slider input {
    flex: 1;
    accent-color: var(--cyan);
  }

  .gloss-timeline {
    width: 100%;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .gloss-item {
    padding: 6px 12px;
    border-radius: 6px;
    background: var(--bg3);
    border: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-dim);
    white-space: nowrap;
    transition: all 0.2s;
  }
  .gloss-item.active {
    border-color: var(--cyan);
    color: var(--cyan);
    background: var(--cyan-dim);
  }

  .tips {
    margin-top: auto;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .tips strong { color: var(--text-dim); font-weight: 500; }
`;

export default function TranslationApp() {
  const [activeTab, setActiveTab] = useState("sign-to-text"); // sign-to-text | text-to-sign

  // Camera & Gesture States
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const intervalRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState([]);
  const [gestureApiStatus, setGestureApiStatus] = useState(null);
  const [translationApiStatus, setTranslationApiStatus] = useState(null);

  // Signed Sequence State
  const [signedSequence, setSignedSequence] = useState([]);
  const [lastDetectedLetter, setLastDetectedLetter] = useState("");
  const [detectionTimer, setDetectionTimer] = useState(0);
  const [manualSign, setManualSign] = useState("");

  // Translation States
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [tipMessage, setTipMessage] = useState("");

  // Text-to-Sign States
  const [inputText, setInputText] = useState("");
  const [glossWords, setGlossWords] = useState([]);
  const [signs, setSigns] = useState([]); // Array of {type: 'letter' | 'pause' | 'word_label', value: 'H'}
  const [activeSignIndex, setActiveSignIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1 = 1s, 0.5 = 0.5s per letter
  const [listening, setListening] = useState(false);

  // Speech Recognition (Web Speech API)
  const recognitionRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Health check APIs
  useEffect(() => {
    // Check Gesture API on 8000
    fetch(`${GESTURE_API}/status`)
      .then(r => r.json())
      .then(setGestureApiStatus)
      .catch(() => setGestureApiStatus(null));

    // Check Translation API on 8001
    fetch(`${TRANSLATION_API}/health`)
      .then(r => r.json())
      .then(setTranslationApiStatus)
      .catch(() => setTranslationApiStatus(null));
  }, []);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // English (Indian) or standard English

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.72);
  }, []);

  // Auto-accumulate predictions into letters
  useEffect(() => {
    if (prediction && prediction !== "untrained" && confidence > 0.85) {
      if (prediction === lastDetectedLetter) {
        setDetectionTimer(prev => {
          if (prev >= 6) { // Held for ~900ms (6 * 150ms)
            // Add to signed sequence
            setSignedSequence(seq => {
              // Avoid duplicate contiguous letters to handle slow gestures
              if (seq.length === 0 || seq[seq.length - 1] !== prediction) {
                return [...seq, prediction];
              }
              return seq;
            });
            setLastDetectedLetter(""); // Reset
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

  const startPredicting = useCallback(() => {
    clearInterval(intervalRef.current);
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("running");
      startPredicting();
    } catch {
      alert("Camera access denied. Please allow camera in browser settings.");
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    clearInterval(intervalRef.current);
    setStatus("idle");
    setPrediction(null);
    setLandmarks([]);
  };

  // Turn active tab on and clean up camera if needed
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (status === "running") {
      stopCamera();
    }
  };

  // Draw hand skeleton
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video || activeTab !== "sign-to-text") return;
    const ctx = overlay.getContext("2d");
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
      ctx.strokeStyle = "rgba(139,92,246,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    landmarks.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 7 : 4, 0, Math.PI * 2);
      if (i === 0) {
        ctx.fillStyle = "#8b5cf6";
        ctx.shadowColor = "#8b5cf6";
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks, activeTab]);

  // Manual sequence controls
  const addManualSign = () => {
    if (!manualSign) return;
    const clean = manualSign.trim().toUpperCase();
    if (clean.length === 1) {
      setSignedSequence(prev => [...prev, clean]);
    } else {
      // Split into letters
      setSignedSequence(prev => [...prev, ...clean.split("")]);
    }
    setManualSign("");
  };

  const removeSeqItem = (idx) => {
    setSignedSequence(prev => prev.filter((_, i) => i !== idx));
  };

  // Perform translation: Sign Sequence -> Grammatical English
  const translateSignToText = async () => {
    if (signedSequence.length === 0) return;
    setLoadingTranslation(true);
    try {
      const res = await fetch(`${TRANSLATION_API}/sign-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signs: signedSequence }),
      });
      const data = await res.json();
      setTranslatedSentence(data.sentence);
      setTipMessage(data.llm_used ? "Translated using Claude AI Layer" : "Raw Joined String (Claude API key missing)");
    } catch {
      setTranslatedSentence(signedSequence.join(""));
      setTipMessage("API Offline (translation server fallback)");
    }
    setLoadingTranslation(false);
  };

  // Perform Speech/Text -> Sign Conversion
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
      // Offline fallback: spell everything letter by letter
      const text = inputText.trim().toUpperCase();
      const gloss = text.split(" ");
      const fallbackSigns = [];
      gloss.forEach(word => {
        fallbackSigns.push({ type: "word_label", value: word });
        for (let l of word) {
          if (l.match(/[A-Z]/)) fallbackSigns.push({ type: "letter", value: l });
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

  // Sign Animation Loop
  useEffect(() => {
    let timer;
    if (playing && activeSignIndex >= 0 && activeSignIndex < signs.length) {
      const currentSign = signs[activeSignIndex];
      // Pauses last longer, letters depend on slider
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

  // Speak translation using browser speech synthesis
  const speakText = () => {
    if (!translatedSentence) return;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel(); // Cancel active speech
      const utterance = new SpeechSynthesisUtterance(translatedSentence);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      synth.speak(utterance);
    }
  };

  // Visualizer letter layout mapping for basic visual feedback
  const renderActiveSign = () => {
    if (activeSignIndex < 0 || activeSignIndex >= signs.length) {
      return (
        <div className="camera-idle">
          <div className="idle-icon">⏳</div>
          <div className="idle-text">No active sign</div>
        </div>
      );
    }
    const current = signs[activeSignIndex];
    if (current.type === "letter") {
      return (
        <>
          <div className="active-letter-circle" />
          <div className="letter-display-inner">{current.value}</div>
          <div className="avatar-label">Fingerspelling letter</div>
        </>
      );
    } else if (current.type === "word_label") {
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Next Word</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800, color: "var(--text)" }}>{current.value}</div>
          <div className="avatar-label">Displaying Word Label</div>
        </div>
      );
    } else if (current.type === "pause") {
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, color: "var(--text-muted)", letterSpacing: "0.1em" }}>[ PAUSE ]</div>
          <div className="avatar-label">Between words</div>
        </div>
      );
    }
  };

  const isActive = status === "running";

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-logo">SignAI <span>/ Phase 2</span></div>
        <div className="api-status-group">
          <div className="api-status-item">
            <div className={`status-dot ${gestureApiStatus ? "live" : ""}`} />
            <div className="status-text">Gesture API (8000)</div>
          </div>
          <div className="api-status-item">
            <div className={`status-dot ${translationApiStatus ? "live" : ""}`} />
            <div className="status-text">Translation API (8001)</div>
          </div>
        </div>
        <div className="phase-badge">Speech & LLM Translation</div>
      </div>

      {/* Tab Switcher */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "sign-to-text" ? "active" : ""}`}
          onClick={() => handleTabChange("sign-to-text")}
        >
          Sign / Gesture → Text (Claude LLM)
        </button>
        <button
          className={`tab-btn ${activeTab === "text-to-sign" ? "active" : ""}`}
          onClick={() => handleTabChange("text-to-sign")}
        >
          Text / Speech → Sign (ISL Gloss Animation)
        </button>
      </div>

      <div className="layout">
        {activeTab === "sign-to-text" ? (
          <>
            {/* SIGN TO TEXT - MAIN COLUMN */}
            <div className="main-col">
              <div className="trans-section-label">Webcam Capture</div>

              <div className={`camera-wrap ${isActive ? "active" : ""}`}>
                <video ref={videoRef} muted playsInline />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <canvas ref={overlayRef} className="overlay" />

                {isActive && <div className="scanline" />}

                {isActive && (
                  <>
                    <div className="corner corner-tl" />
                    <div className="corner corner-tr" />
                    <div className="corner corner-bl" />
                    <div className="corner corner-br" />
                  </>
                )}

                {!isActive && (
                  <div className="camera-idle">
                    <div className="idle-icon">◎</div>
                    <div className="idle-text">Camera stream inactive</div>
                  </div>
                )}
              </div>

              <button
                className={`btn-start ${isActive ? "stop" : "start"}`}
                onClick={isActive ? stopCamera : startCamera}
              >
                {isActive ? "■ Stop Session" : "▶ Start Gesture Recognition"}
              </button>

              {/* Accumulator feedback */}
              {isActive && (
                <div className="predict-indicator">
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {prediction ? `Detecting gesture (Hold to register):` : "Show letters A-Z to sign accumulator..."}
                  </div>
                  {prediction && prediction !== "untrained" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="predict-letter">{prediction}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {Math.round(confidence * 100)}% [ {Array(detectionTimer).fill("■").join("")} ]
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sign Accumulator Box */}
              <div className="sign-sequence-panel">
                <div className="sequence-label">
                  <span>Sign Accumulator Sequence (Live Letter Queue)</span>
                  <span>{signedSequence.length} items</span>
                </div>

                <div className="sequence-wrapper">
                  {signedSequence.length === 0 ? (
                    <div className="sequence-empty">No signs accumulated yet. Use webcam or manual entry below.</div>
                  ) : (
                    signedSequence.map((letter, idx) => (
                      <div key={idx} className="seq-pill">
                        {letter}
                        <button onClick={() => removeSeqItem(idx)}>×</button>
                      </div>
                    ))
                  )}
                </div>

                {/* Manual entry fallback */}
                <div className="manual-input-box">
                  <input
                    type="text"
                    placeholder="Type letter/word manually to test sequence (e.g. HELLO)"
                    value={manualSign}
                    onChange={e => setManualSign(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addManualSign()}
                  />
                  <button onClick={addManualSign}>Add to Queue</button>
                  <button
                    style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-dim)" }}
                    onClick={() => setSignedSequence([])}
                    disabled={signedSequence.length === 0}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* SIGN TO TEXT - SIDEBAR */}
            <div className="side-col">
              <div className="trans-section-label">AI Translation Engine</div>

              <div className={`result-card ${translatedSentence ? "glow" : ""}`}>
                <div className="result-label">LLM Translated Sentence</div>
                <div className="translated-text">
                  {loadingTranslation ? (
                    <span style={{ color: "var(--text-muted)" }}>Interpreting sequence...</span>
                  ) : (
                    translatedSentence || <span style={{ color: "var(--text-muted)", fontSize: 16 }}>Your translation will appear here</span>
                  )}
                </div>

                {translatedSentence && (
                  <>
                    <button className="voice-out-btn" onClick={speakText}>
                      🗣 Listen (Text-to-Speech)
                    </button>
                    {tipMessage && (
                      <div style={{ fontSize: 10, color: "var(--text-dim)", fontStyle: "italic", marginTop: 8 }}>
                        Engine: {tipMessage}
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                className="btn-action-big"
                disabled={signedSequence.length === 0 || loadingTranslation}
                onClick={translateSignToText}
              >
                ⚡ Translate Sequence
              </button>

              <div className="tips">
                <strong>Fingerspelling translation tips:</strong>
                <ol style={{ paddingLeft: 16, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>Position your hand clearly inside the scanning frame.</li>
                  <li>Hold the gesture static for ~1 second until the character pops into the accumulator queue.</li>
                  <li>Spaces/breaks are handled by the AI backend automatically.</li>
                  <li>Click <strong>Translate Sequence</strong> to send the raw letters to Claude for spelling and grammar correction!</li>
                </ol>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* TEXT TO SIGN - MAIN COLUMN */}
            <div className="main-col">
              <div className="trans-section-label">Interactive Translation Panel</div>

              <div className="input-panel">
                <textarea
                  className="text-textarea"
                  placeholder="Type a sentence in English, or click the mic button to speak... (e.g. 'I am going to the store')"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />

                <div className="input-controls">
                  <button
                    className={`mic-btn ${listening ? "listening" : ""}`}
                    onClick={toggleListening}
                    title="Speak into Microphone"
                  >
                    {listening ? "🎙" : "🎤"}
                  </button>
                  <button
                    className="btn-start start"
                    style={{ flex: 1 }}
                    onClick={translateTextToSign}
                    disabled={!inputText.trim()}
                  >
                    Translate English → Indian Sign Language (ISL) Gloss
                  </button>
                </div>
              </div>

              <div className="trans-section-label">Sign Language Animation Player</div>

              <div className="visualizer-card">
                {/* Active Gloss display timeline */}
                {glossWords.length > 0 && (
                  <div className="gloss-timeline">
                    {glossWords.map((word, idx) => {
                      // Determine if this word is currently active in playback
                      let isWordActive = false;
                      if (activeSignIndex >= 0 && activeSignIndex < signs.length) {
                        // Traverse signs list to check if activeSignIndex corresponds to this word
                        let targetWordIdx = -1;
                        for (let i = 0; i <= activeSignIndex; i++) {
                          if (signs[i].type === "word_label") {
                            targetWordIdx++;
                          }
                        }
                        isWordActive = targetWordIdx === idx;
                      }

                      return (
                        <div key={idx} className={`gloss-item ${isWordActive ? "active" : ""}`}>
                          {word}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Animated virtual display */}
                <div className="avatar-display">
                  {renderActiveSign()}
                </div>

                {/* Playback Controls */}
                <div className="playback-controls">
                  <button
                    className="btn-ctrl primary"
                    onClick={() => setPlaying(!playing)}
                    disabled={signs.length === 0}
                  >
                    {playing ? "⏸ Pause" : "▶ Play Animation"}
                  </button>
                  <button
                    className="btn-ctrl"
                    onClick={() => { setActiveSignIndex(0); setPlaying(true); }}
                    disabled={signs.length === 0}
                  >
                    ↺ Replay
                  </button>

                  <div className="speed-slider">
                    <span>Speed</span>
                    <input
                      type="range"
                      min="0.3"
                      max="2.0"
                      step="0.1"
                      value={playbackSpeed}
                      onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                    />
                    <span>{playbackSpeed}s/letter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TEXT TO SIGN - SIDEBAR */}
            <div className="side-col">
              <div className="trans-section-label">ISL Structure Details</div>

              <div className="result-card">
                <div className="result-label">ISL GLOSS TRANSLATION</div>
                <div className="translated-text" style={{ fontSize: 20, color: "var(--cyan)" }}>
                  {glossWords.length > 0 ? glossWords.join(" ➔ ") : "[ No Gloss Loaded ]"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  ISL drops helping verbs/articles and uses <strong>Topic-Comment</strong> layout.
                </div>
              </div>

              <div className="tips">
                <strong>Sign Animation Details:</strong>
                <ul style={{ paddingLeft: 16, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>Translates natural English into grammatical ISL Gloss labels.</li>
                  <li>Animates letters sequentially in high-contrast circular scanner dials.</li>
                  <li>Adjust the <strong>Speed slider</strong> to customize animation comfort.</li>
                  <li>Speaks input using Chrome speech API fallback.</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
