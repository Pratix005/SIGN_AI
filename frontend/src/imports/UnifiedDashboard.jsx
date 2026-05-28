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

const SIGN_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #030208;
    --bg2: #080715;
    --bg3: #0f0e22;
    --border: rgba(139, 92, 246, 0.15);
    --border-bright: rgba(139, 92, 246, 0.42);
    --cyan: #8b5cf6;
    --cyan-dim: rgba(139, 92, 246, 0.16);
    --amber: #f59e0b;
    --amber-dim: rgba(245, 158, 11, 0.12);
    --green: #10b981;
    --green-dim: rgba(16, 185, 129, 0.12);
    --red: #ff385c;
    --text: #f1f5f9;
    --text-dim: #94a3b8;
    --text-muted: #475569;
    --font-logo: 'Inter', sans-serif;
    --font-display: 'Inter', sans-serif;
    --font-body: 'Plus Jakarta Sans', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

  .app {
    min-height: 100vh;
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
      linear-gradient(rgba(139, 92, 246, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 92, 246, 0.02) 1px, transparent 1px);
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
    background: radial-gradient(ellipse, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Unified Header */
  .header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 28px;
    border-bottom: 1px solid var(--border);
    background: rgba(4,7,15,0.8);
    backdrop-filter: blur(12px);
  }

  .header-logo {
    font-family: var(--font-logo);
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.01em;
    color: var(--cyan);
  }
  .header-logo span { color: var(--text-dim); font-weight: 400; }

  .api-status-group {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-left: 24px;
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

  .unified-badge {
    margin-left: auto;
    font-size: 10px;
    color: var(--cyan);
    letter-spacing: 0.15em;
    border: 1px solid var(--cyan);
    padding: 4px 10px;
    border-radius: 4px;
    text-transform: uppercase;
    background: rgba(0,212,255,0.04);
    font-weight: 700;
  }

  /* Dual Screen Layout */
  .layout {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    gap: 0;
    height: calc(100vh - 60px);
  }

  /* Left Command Center Column */
  .center-col {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    border-right: 1px solid var(--border);
  }

  /* Right Control Sidebar */
  .sidebar-col {
    width: 440px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    background: rgba(8, 7, 21, 0.55);
    overflow-y: auto;
  }

  /* Dual Screen Command Center */
  .screens-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    width: 100%;
  }

  .screen-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    aspect-ratio: 4/3;
    display: flex;
    flex-direction: column;
    transition: border-color 0.4s, box-shadow 0.4s;
  }
  .screen-card.active {
    border-color: var(--border-bright);
    box-shadow: 0 0 30px rgba(0,212,255,0.03);
  }

  .screen-header {
    padding: 10px 16px;
    background: rgba(15, 14, 34, 0.75);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-logo);
    font-weight: 700;
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 5;
  }

  .screen-content {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
  }

  /* Camera styling inside Screen */
  .camera-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .camera-container video {
    width: 100%; height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
    display: block;
  }

  .camera-container canvas.overlay {
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
    background: linear-gradient(transparent, rgba(139, 92, 246, 0.16), transparent);
    animation: scanline 3s linear infinite;
    z-index: 4;
    pointer-events: none;
  }
  @keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }

  .corner { position: absolute; width: 14px; height: 14px; z-index: 4; }
  .corner-tl { top: 8px; left: 8px; border-top: 2px solid var(--cyan); border-left: 2px solid var(--cyan); border-radius: 2px 0 0 0; }
  .corner-tr { top: 8px; right: 8px; border-top: 2px solid var(--cyan); border-right: 2px solid var(--cyan); border-radius: 0 2px 0 0; }
  .corner-bl { bottom: 8px; left: 8px; border-bottom: 2px solid var(--cyan); border-left: 2px solid var(--cyan); border-radius: 0 0 0 2px; }
  .corner-br { bottom: 8px; right: 8px; border-bottom: 2px solid var(--cyan); border-right: 2px solid var(--cyan); border-radius: 0 0 2px 0; }

  /* Prediction Banner inside Screen */
  .live-predict-banner {
    position: absolute;
    bottom: 12px;
    left: 12px; right: 12px;
    background: rgba(3, 2, 8, 0.88);
    border: 1px solid var(--border-bright);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 5;
    backdrop-filter: blur(8px);
  }

  .predict-letter-pill {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 800;
    color: var(--amber);
    text-shadow: 0 0 10px rgba(255,183,77,0.4);
  }

  /* Circular Scanner Dial styling inside Screen */
  .visual-player-container {
    width: 100%;
    height: 100%;
    background: var(--bg3);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .scanner-ring {
    width: 110px; height: 110px;
    border-radius: 50%;
    border: 2px dashed var(--cyan);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 54px;
    font-weight: 800;
    color: var(--cyan);
    text-shadow: 0 0 20px rgba(0,212,255,0.4);
    animation: spin-ring 15s linear infinite;
  }
  @keyframes spin-ring { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .scanner-letter {
    position: absolute;
    font-family: var(--font-display);
    font-size: 60px;
    font-weight: 800;
    color: var(--cyan);
  }

  /* Central Command Grid */
  .command-button-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .cmd-btn {
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: rgba(8,13,26,0.3);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }
  .cmd-btn svg, .cmd-btn .icon {
    font-size: 18px;
    margin-bottom: 2px;
  }
  .cmd-btn:hover:not(:disabled) {
    border-color: var(--border-bright);
    color: var(--text);
    background: rgba(0,212,255,0.03);
  }
  .cmd-btn.active {
    background: var(--cyan-dim);
    border-color: var(--cyan);
    color: var(--cyan);
    box-shadow: 0 0 15px rgba(0,212,255,0.12);
  }
  .cmd-btn.special-train {
    background: var(--amber-dim);
    border-color: rgba(255,183,77,0.3);
    color: var(--amber);
  }
  .cmd-btn.special-train:hover:not(:disabled) {
    background: rgba(255,183,77,0.22);
    border-color: var(--amber);
  }
  .cmd-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* Unified Status Message Box */
  .unified-status-box {
    background: rgba(0,212,255,0.04);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 11px;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .unified-status-box span.highlight { color: var(--cyan); }
  .unified-status-box button.clear-btn {
    background: transparent; border: none; color: var(--red); cursor: pointer; font-family: var(--font-mono); font-size: 10px;
  }

  /* Sidebar Section & Tab selectors */
  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
    gap: 8px;
  }

  .side-tab-btn {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 11px;
    cursor: pointer;
    border-radius: 6px;
    text-align: center;
    transition: all 0.2s;
  }
  .side-tab-btn:hover { color: var(--text); }
  .side-tab-btn.active {
    background: var(--bg3);
    border-color: var(--border);
    color: var(--cyan);
  }

  .sidebar-section-label {
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sidebar-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* Interactive Panels inside sidebar */
  .control-card {
    background: linear-gradient(135deg, rgba(8,13,26,0.6) 0%, rgba(13,20,36,0.4) 100%);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .control-card.glow { border-color: var(--border-bright); box-shadow: 0 0 20px rgba(0,212,255,0.03); }

  /* Letter picker & sample lists */
  .letter-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .letter-btn {
    aspect-ratio: 1;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
  }
  .letter-btn:hover { border-color: var(--border-bright); color: var(--text); }
  .letter-btn.selected {
    background: var(--cyan-dim);
    border-color: var(--cyan);
    color: var(--cyan);
  }
  .letter-btn.has-data::after {
    content: ''; position: absolute; top: 2px; right: 2px;
    width: 4px; height: 4px; border-radius: 50%; background: var(--green);
  }

  .samples-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 100px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .sample-pill {
    font-size: 9px;
    padding: 3px 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text-dim);
  }
  .sample-pill.ready { color: var(--green); border-color: rgba(0,229,160,0.25); }

  /* Text & Sign Input/Outputs */
  .seq-timeline {
    min-height: 52px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
  }
  .seq-timeline-empty { color: var(--text-muted); font-size: 11px; margin: auto; }

  .seq-pill {
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(0,212,255,0.06);
    border: 1px solid rgba(0,212,255,0.2);
    color: var(--cyan);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .seq-pill button {
    background: transparent; border: none; color: var(--cyan); opacity: 0.5; cursor: pointer; font-size: 9px;
  }
  .seq-pill button:hover { opacity: 1; }

  .manual-input-box {
    display: flex;
    gap: 6px;
  }
  .manual-input-box input {
    flex: 1;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text);
  }
  .manual-input-box input:focus { outline: none; border-color: var(--cyan); }
  .manual-input-box button {
    padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-bright);
    background: var(--cyan-dim); color: var(--cyan); font-family: var(--font-mono); font-size: 11px; cursor: pointer;
  }

  .translated-result-box {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--green);
    line-height: 1.4;
    min-height: 30px;
  }

  .voice-out-btn {
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 12px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }
  .voice-out-btn:hover { color: var(--text); border-color: var(--border-bright); }

  .text-input-area {
    width: 100%;
    min-height: 60px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
    resize: none;
  }
  .text-input-area:focus { outline: none; border-color: var(--cyan); }

  .input-action-bar {
    display: flex;
    gap: 8px;
  }
  .input-action-bar button.mic {
    width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border);
    background: transparent; color: var(--text-dim); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .input-action-bar button.mic.listening {
    background: rgba(255,77,109,0.12); border-color: var(--red); color: var(--red); animation: mic-pulse 1.5s infinite;
  }
  .input-action-bar button.submit {
    flex: 1; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--cyan);
    background: var(--cyan-dim); color: var(--cyan); font-family: var(--font-mono); font-size: 11px; font-weight: 500; cursor: pointer;
  }
  .input-action-bar button.submit:disabled { opacity: 0.4; cursor: not-allowed; }

  .gloss-timeline {
    width: 100%;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 6px;
  }
  .gloss-timeline::-webkit-scrollbar { height: 3px; }
  .gloss-timeline::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 2px; }

  .gloss-timeline-item {
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--bg3);
    border: 1px solid var(--border);
    font-size: 10px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .gloss-timeline-item.active {
    border-color: var(--cyan);
    color: var(--cyan);
    background: var(--cyan-dim);
  }

  .speed-ctrl-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    color: var(--text-dim);
    margin-top: 6px;
  }
  .speed-ctrl-wrapper input { flex: 1; accent-color: var(--cyan); }

  .tips-list {
    margin-top: auto;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .tips-list strong { color: var(--text-dim); }

  .quickstart-step {
    display: flex;
    gap: 6px;
    font-size: 10px;
    color: var(--text-dim);
    margin-top: 6px;
  }
  .quickstart-step-num { color: var(--cyan); width: 14px; text-align: right; }

  /* Premium Idle Screens */
  .camera-idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100%;
    color: var(--text-dim);
  }
  .idle-icon {
    font-size: 32px;
    color: var(--cyan);
    opacity: 0.4;
    animation: pulse 2.5s infinite ease-in-out;
  }
  .idle-text {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.08); opacity: 0.6; }
    100% { transform: scale(1); opacity: 0.3; }
  }

  /* Action Buttons & Playback Control Buttons */
  .btn-action-big {
    background: linear-gradient(135deg, var(--cyan-dim) 0%, rgba(0,212,255,0.05) 100%);
    border: 1px solid var(--cyan);
    color: var(--cyan);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 15px rgba(0,212,255,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 10px;
  }
  .btn-action-big:hover:not(:disabled) {
    background: var(--cyan);
    color: var(--bg);
    box-shadow: 0 0 25px rgba(0,212,255,0.3);
  }
  .btn-action-big:disabled {
    opacity: 0.3;
    border-color: var(--border);
    color: var(--text-muted);
    background: transparent;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-ctrl {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: rgba(8,13,26,0.4);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .btn-ctrl:hover:not(:disabled) {
    border-color: var(--border-bright);
    color: var(--text);
    background: rgba(0,212,255,0.02);
  }
  .btn-ctrl.primary {
    border-color: var(--cyan);
    color: var(--cyan);
    background: var(--cyan-dim);
  }
  .btn-ctrl.primary:hover:not(:disabled) {
    background: rgba(0,212,255,0.22);
    box-shadow: 0 0 12px rgba(0,212,255,0.1);
  }
  .btn-ctrl:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

export default function UnifiedDashboard() {
  // Navigation Tabs in Sidebar
  const [activeTab, setActiveTab] = useState("translator"); // trainer | translator | visualizer

  // Video and Canvas Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const intervalRef = useRef(null);

  // APIs state
  const [status, setStatus] = useState("idle");
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState([]);
  const [gestureApiStatus, setGestureApiStatus] = useState(null);
  const [translationApiStatus, setTranslationApiStatus] = useState(null);

  // Phase 1: Gesture Collect & Training States
  const [mode, setMode] = useState("predict"); // predict | collect
  const [collectLabel, setCollectLabel] = useState("A");
  const [collectedSamples, setCollectedSamples] = useState({});
  const [trainingInProgress, setTrainingInProgress] = useState(false);
  const samplesRef = useRef([]);

  // Phase 2: Sign to Text Translator States
  const [signedSequence, setSignedSequence] = useState([]);
  const [lastDetectedLetter, setLastDetectedLetter] = useState("");
  const [detectionTimer, setDetectionTimer] = useState(0);
  const [manualLetter, setManualLetter] = useState("");
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [translating, setTranslating] = useState(false);
  const [engineMessage, setEngineMessage] = useState("");

  // Phase 2: Text to Sign Visualizer States
  const [inputText, setInputText] = useState("");
  const [glossTimeline, setGlossTimeline] = useState([]);
  const [signFrames, setSignFrames] = useState([]);
  const [activeFrameIdx, setActiveFrameIdx] = useState(-1);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0); // secs per frame
  const [micListening, setMicListening] = useState(false);

  // Helper system status message
  const [systemMessage, setSystemMessage] = useState("System idle. Start camera stream to predict.");

  // Speech recognition API Ref
  const speechRecRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Poll API health status checks
  useEffect(() => {
    const fetchHealth = () => {
      fetch(`${GESTURE_API}/status`)
        .then(r => r.json())
        .then(data => {
          setGestureApiStatus(data);
          // Sync available labels
          if (data && data.signs_available) {
            // Set initial collection mapping if present
          }
        })
        .catch(() => setGestureApiStatus(null));

      fetch(`${TRANSLATION_API}/health`)
        .then(r => r.json())
        .then(setTranslationApiStatus)
        .catch(() => setTranslationApiStatus(null));
    };

    fetchHealth();
    const t = setInterval(fetchHealth, 8000);
    return () => clearInterval(t);
  }, []);

  // Configure speech recognition (webkit)
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // English (Indian) or standard English

      rec.onstart = () => setMicListening(true);
      rec.onend = () => setMicListening(false);
      rec.onerror = () => setMicListening(false);
      rec.onresult = (e) => {
        const tr = e.results[0][0].transcript;
        setInputText(tr);
        setSystemMessage(`Recorded spoken text: "${tr}"`);
      };
      speechRecRef.current = rec;
    }
  }, []);

  const toggleMicListening = () => {
    if (!speechRecRef.current) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }
    if (micListening) {
      speechRecRef.current.stop();
    } else {
      speechRecRef.current.start();
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

  // Accumulate prediction letters for Sign to Text Translator
  useEffect(() => {
    // Only accumulate in prediction mode AND when translator tab is active
    if (status === "running" && prediction && prediction !== "untrained" && confidence > 0.85) {
      if (prediction === lastDetectedLetter) {
        setDetectionTimer(prev => {
          if (prev >= 6) { // held static for ~900ms (6 * 150ms)
            // Push letter into accumulator
            setSignedSequence(seq => {
              if (seq.length === 0 || seq[seq.length - 1] !== prediction) {
                setSystemMessage(`Registered letter '${prediction}' to sequence accumulator.`);
                return [...seq, prediction];
              }
              return seq;
            });
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
  }, [prediction, confidence, lastDetectedLetter, status]);

  // Main Webcam Predict Loop
  const startPredicting = useCallback((currMode, currLabel) => {
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

        // Accumulate training data if in collect mode
        if (currMode === "collect" && data.landmarks?.length > 0 && data.coords) {
          samplesRef.current.push({ coords: data.coords, label: currLabel });
          setCollectedSamples(prev => {
            const updated = { ...prev, [currLabel]: (prev[currLabel] || 0) + 1 };
            // Auto update status message
            setSystemMessage(`Collected sample #${updated[currLabel]} for letter '${currLabel}'`);
            return updated;
          });
        }
      } catch {}
    }, 150);
  }, [captureFrame]);

  // Webcam controls
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("running");
      startPredicting(mode, collectLabel);
      setSystemMessage("Camera online. MediaPipe hand tracking active.");
    } catch {
      setSystemMessage("Camera access blocked. Please check browser permissions.");
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    clearInterval(intervalRef.current);
    setStatus("idle");
    setPrediction(null);
    setLandmarks([]);
    setSystemMessage("Camera offline.");
  };

  // Phase togglers inside All-in-one Controls
  const togglePredictMode = () => {
    setMode("predict");
    setSystemMessage("Predict mode activated. Live gestures will display.");
    if (status === "running") startPredicting("predict", collectLabel);
  };

  const toggleCollectMode = () => {
    setMode("collect");
    setSystemMessage(`Data Collect Mode: Show letter '${collectLabel}' to webcam to log samples.`);
    if (status === "running") startPredicting("collect", collectLabel);
  };

  const selectCollectLabel = (label) => {
    setCollectLabel(label);
    setSystemMessage(`Switched target collect letter to '${label}'.`);
    if (status === "running" && mode === "collect") startPredicting("collect", label);
  };

  // Draw media pipe skeleton overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video || status !== "running") return;
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
      ctx.strokeStyle = "rgba(0,212,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    landmarks.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 7 : 4, 0, Math.PI * 2);
      if (i === 0) {
        ctx.fillStyle = "#00d4ff";
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks, status]);

  // Train MLP Model (Phase 1)
  const trainClassifier = async () => {
    if (samplesRef.current.length < 20) {
      setSystemMessage("Error: Capture at least 20 training samples before training.");
      return;
    }
    setTrainingInProgress(true);
    setSystemMessage("Training Sklearn MLP neural network backend...");
    try {
      const res = await fetch(`${GESTURE_API}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: samplesRef.current }),
      });
      const data = await res.json();
      if (data.success) {
        setSystemMessage(`Success: Classifier trained on ${data.samples} samples! Ready to predict.`);
        // Reload API status
        fetch(`${GESTURE_API}/status`).then(r => r.json()).then(setGestureApiStatus);
      } else {
        setSystemMessage(`Training failed: ${data.error}`);
      }
    } catch {
      setSystemMessage("Error: Training API offline.");
    }
    setTrainingInProgress(false);
  };

  // Translate Sequence (Phase 2 - Sign to Text)
  const translateLetters = async () => {
    if (signedSequence.length === 0) return;
    setTranslating(true);
    setSystemMessage("Translating fingerspelling sequence using Claude AI Layer...");
    try {
      const res = await fetch(`${TRANSLATION_API}/sign-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signs: signedSequence }),
      });
      const data = await res.json();
      setTranslatedSentence(data.sentence);
      setEngineMessage(data.llm_used ? "Interpreted by Claude AI" : "Raw spelled string (LLM API key missing)");
      setSystemMessage("Fingerspelling translation complete.");
    } catch {
      setTranslatedSentence(signedSequence.join(""));
      setEngineMessage("API Offline (local text joining)");
      setSystemMessage("Translation failed. Fell back to raw joining.");
    }
    setTranslating(false);
  };

  // Speak translation sentence (Text to Speech)
  const speakSentence = () => {
    if (!translatedSentence) return;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(translatedSentence);
      utterance.rate = 0.95;
      synth.speak(utterance);
    }
  };

  // Convert spoken/written text to Sign animation (Phase 2 - Text to Sign)
  const convertTextToSign = async () => {
    if (!inputText.trim()) return;
    setAnimationPlaying(false);
    setActiveFrameIdx(-1);
    setSystemMessage("Converting English phrase to grammatical Indian Sign Language...");
    try {
      const res = await fetch(`${TRANSLATION_API}/text-to-signs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setGlossTimeline(data.gloss || []);
      setSignFrames(data.signs || []);
      setSystemMessage(`Translation mapped to ${data.gloss.length} gloss signs. Launching visualizer player.`);
      if (data.signs && data.signs.length > 0) {
        setActiveFrameIdx(0);
        setAnimationPlaying(true);
      }
    } catch {
      // Offline fallback: fingerspell everything
      const cleanText = inputText.trim().toUpperCase();
      const words = cleanText.split(" ");
      const fallbackSigns = [];
      words.forEach(word => {
        fallbackSigns.push({ type: "word_label", value: word });
        for (let l of word) {
          if (l.match(/[A-Z]/)) fallbackSigns.push({ type: "letter", value: l });
        }
        fallbackSigns.push({ type: "pause", value: "" });
      });
      setGlossTimeline(words);
      setSignFrames(fallbackSigns);
      setSystemMessage("Translation API offline. Fingerspelling words letter-by-letter.");
      if (fallbackSigns.length > 0) {
        setActiveFrameIdx(0);
        setAnimationPlaying(true);
      }
    }
  };

  // Visualizer Animation player clock
  useEffect(() => {
    let t;
    if (animationPlaying && activeFrameIdx >= 0 && activeFrameIdx < signFrames.length) {
      const curr = signFrames[activeFrameIdx];
      const duration = curr.type === "pause" ? 600 : speedMultiplier * 1000;
      t = setTimeout(() => {
        setActiveFrameIdx(prev => {
          if (prev + 1 < signFrames.length) return prev + 1;
          setAnimationPlaying(false);
          return -1;
        });
      }, duration);
    }
    return () => clearTimeout(t);
  }, [animationPlaying, activeFrameIdx, signFrames, speedMultiplier]);

  // Render the circular dial animation
  const renderSignDial = () => {
    if (activeFrameIdx < 0 || activeFrameIdx >= signFrames.length) {
      return (
        <div className="camera-idle">
          <div className="idle-icon">⏳</div>
          <div className="idle-text">Visualizer player idle</div>
        </div>
      );
    }
    const currentFrame = signFrames[activeFrameIdx];
    if (currentFrame.type === "letter") {
      return (
        <>
          <div className="scanner-ring" />
          <div className="scanner-letter">{currentFrame.value}</div>
        </>
      );
    } else if (currentFrame.type === "word_label") {
      return (
        <div style={{ textAlign: "center", zIndex: 10 }}>
          <div style={{ fontSize: 9, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Signing Gloss Word</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--text)" }}>{currentFrame.value}</div>
        </div>
      );
    } else if (currentFrame.type === "pause") {
      return (
        <div style={{ zIndex: 10, color: "var(--text-muted)", fontSize: 18, letterSpacing: "0.08em" }}>
          [ BREAK ]
        </div>
      );
    }
  };

  // Manual accumulate controllers
  const pushManualLetter = () => {
    if (!manualLetter) return;
    const clean = manualLetter.trim().toUpperCase();
    if (clean.length === 1) {
      setSignedSequence(prev => [...prev, clean]);
    } else {
      setSignedSequence(prev => [...prev, ...clean.split("")]);
    }
    setManualLetter("");
  };

  const removeAccumulatedLetter = (idx) => {
    setSignedSequence(prev => prev.filter((_, i) => i !== idx));
  };

  const isCameraActive = status === "running";
  const showOverlayPrediction = isCameraActive && prediction && prediction !== "untrained" && prediction !== null;

  return (
    <div className="app">
      {/* Unified Header */}
      <div className="header">
        <div className="header-logo">SignAI <span>/ Integrated Workspace</span></div>
        <div className="api-status-group">
          <div className="api-status-item">
            <div className={`status-dot ${gestureApiStatus ? "live" : ""}`} />
            <div className="status-text">Gesture Core (8000)</div>
          </div>
          <div className="api-status-item">
            <div className={`status-dot ${translationApiStatus ? "live" : ""}`} />
            <div className="status-text">Translation Core (8001)</div>
          </div>
        </div>
        <div className="unified-badge">Phase 1 & Phase 2 Active</div>
      </div>

      {/* Main Unified Dual-Screen Layout */}
      <div className="layout">
        
        {/* LEFT COLUMN: DUAL SCREEN COMMAND CENTER */}
        <div className="center-col">
          
          <div className="screens-grid">
            
            {/* Screen 1: Live Input Feed */}
            <div className={`screen-card ${isCameraActive ? "active" : ""}`}>
              <div className="screen-header">
                <span>[ SCREEN 01 · WEBCAM FEED ]</span>
                <span style={{ color: isCameraActive ? "var(--green)" : "var(--text-muted)" }}>
                  {isCameraActive ? "LIVE TRACKING" : "OFFLINE"}
                </span>
              </div>
              <div className="screen-content">
                <div className="camera-container">
                  <video ref={videoRef} muted playsInline />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <canvas ref={overlayRef} className="overlay" />

                  {isCameraActive && <div className="scanline" />}

                  {isCameraActive && (
                    <>
                      <div className="corner corner-tl" />
                      <div className="corner corner-tr" />
                      <div className="corner corner-bl" />
                      <div className="corner corner-br" />
                    </>
                  )}

                  {!isCameraActive && (
                    <div className="camera-idle">
                      <div className="idle-icon">◎</div>
                      <div className="idle-text">Camera stream inactive</div>
                    </div>
                  )}

                  {showOverlayPrediction && (
                    <div className="live-predict-banner">
                      <div style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Predicted Sign</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="predict-letter-pill">{prediction}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                          {Math.round(confidence * 100)}% [ {Array(detectionTimer).fill("■").join("")} ]
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Screen 2: Animated Sign Visualizer */}
            <div className={`screen-card ${animationPlaying ? "active" : ""}`}>
              <div className="screen-header">
                <span>[ SCREEN 02 · ISL ANIMATION PLAYER ]</span>
                <span style={{ color: animationPlaying ? "var(--cyan)" : "var(--text-muted)" }}>
                  {animationPlaying ? `PLAYING FRAME ${activeFrameIdx + 1}/${signFrames.length}` : "IDLE"}
                </span>
              </div>
              <div className="screen-content">
                <div className="visual-player-container">
                  {renderSignDial()}
                  <div style={{ position: "absolute", bottom: 8, left: 12, fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ISL Translation Output
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Combined Command Button Grid */}
          <div className="sidebar-section-label">All-in-one control command grid</div>
          
          <div className="command-button-grid">
            
            {/* Webcam start/stop */}
            <button
              className={`cmd-btn ${isCameraActive ? "active" : ""}`}
              onClick={isCameraActive ? stopCamera : startCamera}
            >
              <span className="icon">{isCameraActive ? "■" : "▶"}</span>
              <span>{isCameraActive ? "Stop Camera" : "Start Camera"}</span>
            </button>

            {/* Phase 1 Toggles */}
            <button
              className={`cmd-btn ${mode === "predict" && isCameraActive ? "active" : ""}`}
              disabled={!isCameraActive}
              onClick={togglePredictMode}
            >
              <span className="icon">👁</span>
              <span>Live Predict</span>
            </button>

            <button
              className={`cmd-btn ${mode === "collect" && isCameraActive ? "active" : ""}`}
              disabled={!isCameraActive}
              onClick={toggleCollectMode}
            >
              <span className="icon">📦</span>
              <span>Collect Samples</span>
            </button>

            {/* Phase 1 neural network training */}
            <button
              className="cmd-btn special-train"
              disabled={trainingInProgress || samplesRef.current.length < 20}
              onClick={trainClassifier}
            >
              <span className="icon">⚡</span>
              <span>{trainingInProgress ? "Training..." : "Train MLP Model"}</span>
            </button>

          </div>

          {/* Unified helper status bar */}
          <div className="unified-status-box">
            <div>
              Status: <span className="highlight">{systemMessage}</span>
            </div>
            {signedSequence.length > 0 && (
              <button className="clear-btn" onClick={() => { setSignedSequence([]); setSystemMessage("Cleared letter sequence."); }}>
                ✕ Clear Accumulator
              </button>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE SETTINGS SIDEBAR */}
        <div className="sidebar-col">
          
          {/* Navigation tab bar inside sidebar */}
          <div className="sidebar-tabs">
            <button
              className={`side-tab-btn ${activeTab === "translator" ? "active" : ""}`}
              onClick={() => setActiveTab("translator")}
            >
              💬 Sign to Text
            </button>
            <button
              className={`side-tab-btn ${activeTab === "visualizer" ? "active" : ""}`}
              onClick={() => setActiveTab("visualizer")}
            >
              🎬 Text to Sign
            </button>
            <button
              className={`side-tab-btn ${activeTab === "trainer" ? "active" : ""}`}
              onClick={() => setActiveTab("trainer")}
            >
              📦 Model & Training
            </button>
          </div>

          {/* TAB CONTENT A: MODEL TRAINER */}
          {activeTab === "trainer" && (
            <>
              <div className="sidebar-section-label">Fingerspell Data Capture</div>
              
              <div className="control-card">
                <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Select a letter from the grid below, hold the sign in front of the active camera in <strong>Collect Mode</strong>.
                </div>
                <div className="letter-grid">
                  {SIGN_LABELS.map(l => (
                    <button
                      key={l}
                      className={`letter-btn ${collectLabel === l ? "selected" : ""} ${collectedSamples[l] >= 30 ? "has-data" : ""}`}
                      onClick={() => selectCollectLabel(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-section-label">Recorded Datasets</div>
              
              <div className="control-card">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)" }}>
                  <span>Signs with Captured Samples:</span>
                  <span>{samplesRef.current.length} total samples</span>
                </div>
                {samplesRef.current.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", padding: "10px 0" }}>No training samples recorded yet.</div>
                ) : (
                  <div className="samples-grid">
                    {Object.entries(collectedSamples).map(([label, count]) => (
                      <div key={label} className={`sample-pill ${count >= 30 ? "ready" : ""}`}>
                        {label}: {count}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="tips-list">
                <strong>MLP neural classifier training workflow:</strong>
                <div className="quickstart-step">
                  <div className="quickstart-step-num">1.</div>
                  <div>Power up the camera by clicking <strong>Start Camera</strong>.</div>
                </div>
                <div className="quickstart-step">
                  <div className="quickstart-step-num">2.</div>
                  <div>Activate <strong>Collect Samples</strong> mode in the dashboard command grid.</div>
                </div>
                <div className="quickstart-step">
                  <div className="quickstart-step-num">3.</div>
                  <div>Pick letters from the grid and record 30+ samples per sign (held static).</div>
                </div>
                <div className="quickstart-step">
                  <div className="quickstart-step-num">4.</div>
                  <div>Press <strong>Train MLP Model</strong> to compile parameters inside FastAPI.</div>
                </div>
              </div>
            </>
          )}

          {/* TAB CONTENT B: SIGN TO TEXT TRANSLATOR */}
          {activeTab === "translator" && (
            <>
              <div className="sidebar-section-label">Fingerspelling Accumulator Timeline</div>

              <div className="control-card">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)", marginBottom: 4 }}>
                  <span>Live Signed Letter Stream:</span>
                  <span>{signedSequence.length} characters</span>
                </div>

                <div className="seq-timeline">
                  {signedSequence.length === 0 ? (
                    <div className="seq-timeline-empty">No signs captured. Hold a predicted letter in webcam view to fill queue automatically.</div>
                  ) : (
                    signedSequence.map((char, idx) => (
                      <div key={idx} className="seq-pill">
                        {char}
                        <button onClick={() => removeAccumulatedLetter(idx)}>×</button>
                      </div>
                    ))
                  )}
                </div>

                {/* Manual testing text input */}
                <div className="manual-input-box">
                  <input
                    type="text"
                    placeholder="Type string to test LLM translation manually..."
                    value={manualLetter}
                    onChange={e => setManualLetter(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && pushManualLetter()}
                  />
                  <button onClick={pushManualLetter}>Push Sequence</button>
                </div>
              </div>

              <div className="sidebar-section-label">Translation Output Engine</div>

              <div className={`control-card ${translatedSentence ? "glow" : ""}`}>
                <div style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Translation</div>
                <div className="translated-result-box">
                  {translating ? (
                    <span style={{ color: "var(--text-muted)" }}>Claude is analyzing sequence...</span>
                  ) : (
                    translatedSentence || <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Your translated sentence will render here.</span>
                  )}
                </div>

                {translatedSentence && (
                  <>
                    <button className="voice-out-btn" onClick={speakSentence}>
                      🗣 Voice synthesis read-out
                    </button>
                    {engineMessage && (
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontStyle: "italic", marginTop: 4 }}>
                        Engine details: {engineMessage}
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                className="btn-action-big"
                disabled={signedSequence.length === 0 || translating}
                onClick={translateLetters}
                style={{ width: "100%", padding: 13, borderRadius: 10 }}
              >
                ⚡ Translate Sequence
              </button>

              <div className="tips-list">
                <strong>Fingerspell accumulator details:</strong>
                <ul style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                  <li>Ensure camera is live and you're in <strong>Live Predict</strong> mode.</li>
                  <li>When you hold a hand sign for ~900ms, the system locks the letter in.</li>
                  <li>Click <strong>Translate Sequence</strong> to feed the raw character string to the FastAPI LLM layer.</li>
                  <li>Claude AI corrects typing mistakes, translates acronyms, and forms beautiful English phrasing.</li>
                </ul>
              </div>
            </>
          )}

          {/* TAB CONTENT C: TEXT TO SIGN VISUALIZER */}
          {activeTab === "visualizer" && (
            <>
              <div className="sidebar-section-label">Interactive Translation Source</div>

              <div className="control-card">
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4 }}>Enter English text or trigger voice input:</div>
                <textarea
                  className="text-input-area"
                  placeholder="e.g. 'I am heading out to the market now'"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />

                <div className="input-action-bar">
                  <button
                    className={`mic ${micListening ? "listening" : ""}`}
                    onClick={toggleMicListening}
                    title="Toggle Speech Recognition microphone"
                  >
                    {micListening ? "🎙" : "🎤"}
                  </button>
                  <button
                    className="submit"
                    onClick={convertTextToSign}
                    disabled={!inputText.trim()}
                  >
                    Translate English ➔ Indian Sign Language (ISL)
                  </button>
                </div>
              </div>

              <div className="sidebar-section-label">Playback Parameters</div>

              <div className="control-card">
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4 }}>ISL GLOSS TRANSLATION PATH:</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--cyan)", marginBottom: 6 }}>
                  {glossTimeline.length > 0 ? glossTimeline.join(" ➔ ") : "[ Timeline Empty ]"}
                </div>
                
                {glossTimeline.length > 0 && (
                  <div className="gloss-timeline">
                    {glossTimeline.map((glossWord, idx) => {
                      let isGlossActive = false;
                      if (activeFrameIdx >= 0 && activeFrameIdx < signFrames.length) {
                        let activeWordCounter = -1;
                        for (let i = 0; i <= activeFrameIdx; i++) {
                          if (signFrames[i].type === "word_label") {
                            activeWordCounter++;
                          }
                        }
                        isGlossActive = activeWordCounter === idx;
                      }

                      return (
                        <div key={idx} className={`gloss-timeline-item ${isGlossActive ? "active" : ""}`}>
                          {glossWord}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    className="btn-ctrl primary"
                    style={{ flex: 1, padding: "6px 12px" }}
                    onClick={() => setAnimationPlaying(!animationPlaying)}
                    disabled={signFrames.length === 0}
                  >
                    {animationPlaying ? "⏸ Pause Playback" : "▶ Play Animation"}
                  </button>
                  <button
                    className="btn-ctrl"
                    style={{ padding: "6px 12px" }}
                    onClick={() => { setActiveFrameIdx(0); setAnimationPlaying(true); }}
                    disabled={signFrames.length === 0}
                  >
                    ↺ Replay
                  </button>
                </div>

                <div className="speed-ctrl-wrapper">
                  <span>Speed:</span>
                  <input
                    type="range"
                    min="0.3"
                    max="2.0"
                    step="0.1"
                    value={speedMultiplier}
                    onChange={e => setSpeedMultiplier(parseFloat(e.target.value))}
                  />
                  <span>{speedMultiplier}s/letter</span>
                </div>
              </div>

              <div className="tips-list">
                <strong>Fingerspelling animator details:</strong>
                <ul style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                  <li>FastAPI parses natural phrasing into Topic-Comment ISL structures.</li>
                  <li>Copulas and articles are dropped to follow natural Deaf ISL signing layout.</li>
                  <li>Letters are fingerspelled on the circular scanner player (Screen 2).</li>
                  <li>Slow down or speed up the rate to study spelling sequences comfortably.</li>
                </ul>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
