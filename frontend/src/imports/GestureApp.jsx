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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #04070f; --bg2: #080d1a; --bg3: #0d1424;
    --border: rgba(0,212,255,0.12); --border-bright: rgba(0,212,255,0.35);
    --cyan: #00d4ff; --cyan-dim: rgba(0,212,255,0.12);
    --amber: #ffb74d; --amber-dim: rgba(255,183,77,0.1);
    --green: #00e5a0; --red: #ff4d6d; --purple: #a78bfa;
    --text: #c8d8e8; --text-dim: #4a6070; --text-muted: #2a3a4a;
    --font-d: 'Syne', sans-serif; --font-m: 'DM Mono', monospace;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-m); }

  .app2 { min-height:100vh; display:flex; flex-direction:column; background:var(--bg); position:relative; overflow:hidden; }
  .app2::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px); background-size:40px 40px; pointer-events:none; z-index:0; }
  .app2::after { content:''; position:fixed; top:-200px; left:50%; transform:translateX(-50%); width:700px; height:400px; background:radial-gradient(ellipse,rgba(0,212,255,0.05) 0%,transparent 70%); pointer-events:none; z-index:0; }

  /* Header */
  .hdr2 { position:relative; z-index:10; display:flex; align-items:center; gap:16px; padding:12px 24px; border-bottom:1px solid var(--border); background:rgba(4,7,15,0.9); backdrop-filter:blur(12px); }
  .hdr2-logo { font-family:var(--font-d); font-weight:800; font-size:15px; color:var(--cyan); }
  .hdr2-logo span { color:var(--text-dim); font-weight:400; }
  .hdr2-dot { width:6px; height:6px; border-radius:50%; background:var(--red); box-shadow:0 0 6px currentColor; transition:background 0.4s; }
  .hdr2-dot.live { background:var(--green); animation:pdot2 2s infinite; }
  @keyframes pdot2 { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .hdr2-status { font-size:11px; color:var(--text-dim); letter-spacing:0.05em; }
  .phase-tag { margin-left:auto; font-size:10px; color:var(--text-muted); letter-spacing:0.12em; border:1px solid var(--text-muted); padding:3px 8px; border-radius:3px; }

  /* Nav tabs */
  .nav-tabs { position:relative; z-index:9; display:flex; border-bottom:1px solid var(--border); background:rgba(8,13,26,0.8); }
  .nav-tab { flex:1; padding:14px; font-family:var(--font-m); font-size:11px; letter-spacing:0.1em; background:transparent; border:none; color:var(--text-muted); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.2s; }
  .nav-tab.active { color:var(--cyan); border-bottom-color:var(--cyan); background:rgba(0,212,255,0.03); }
  .nav-tab:hover:not(.active) { color:var(--text-dim); }

  /* Main content area */
  .content2 { position:relative; z-index:1; display:flex; flex:1; gap:0; }

  /* ── Sign → Text panel ── */
  .panel { flex:1; padding:24px; display:flex; flex-direction:column; gap:16px; }

  .cam-wrap2 { position:relative; border-radius:14px; overflow:hidden; background:var(--bg2); aspect-ratio:4/3; border:1px solid var(--border); transition:border-color 0.4s; }
  .cam-wrap2.active { border-color:var(--border-bright); box-shadow:inset 0 0 40px rgba(0,212,255,0.05); }
  .cam-wrap2 video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); display:block; }
  .cam-wrap2 canvas.overlay { position:absolute; inset:0; width:100%; height:100%; transform:scaleX(-1); pointer-events:none; z-index:3; }
  .corner2 { position:absolute; width:16px; height:16px; z-index:4; }
  .c2-tl { top:10px;left:10px; border-top:1.5px solid var(--cyan); border-left:1.5px solid var(--cyan); border-radius:3px 0 0 0; }
  .c2-tr { top:10px;right:10px; border-top:1.5px solid var(--cyan); border-right:1.5px solid var(--cyan); border-radius:0 3px 0 0; }
  .c2-bl { bottom:10px;left:10px; border-bottom:1.5px solid var(--cyan); border-left:1.5px solid var(--cyan); border-radius:0 0 0 3px; }
  .c2-br { bottom:10px;right:10px; border-bottom:1.5px solid var(--cyan); border-right:1.5px solid var(--cyan); border-radius:0 0 3px 0; }
  @keyframes scan2 { 0%{top:-2px} 100%{top:100%} }
  .scanline2 { position:absolute; left:0;right:0; height:2px; background:linear-gradient(transparent,rgba(0,212,255,0.15),transparent); animation:scan2 3s linear infinite; z-index:4; pointer-events:none; }

  /* Live sign display on camera */
  .live-sign { position:absolute; bottom:14px; left:50%; transform:translateX(-50%); z-index:5; display:flex; flex-direction:column; align-items:center; }
  .live-letter { font-family:var(--font-d); font-size:72px; font-weight:800; color:var(--amber); text-shadow:0 0 30px rgba(255,183,77,0.5); line-height:1; }
  .live-conf { font-size:10px; color:var(--amber); opacity:0.7; letter-spacing:0.12em; }

  /* Sign buffer */
  .sign-buffer { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:14px 16px; min-height:56px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .sign-chip { font-family:var(--font-d); font-size:18px; font-weight:700; color:var(--cyan); background:var(--cyan-dim); border:1px solid var(--border-bright); border-radius:6px; padding:4px 10px; animation:chip-in 0.15s ease; }
  @keyframes chip-in { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
  .buffer-hint { font-size:11px; color:var(--text-muted); letter-spacing:0.05em; }
  .sign-pause { width:6px; height:6px; border-radius:50%; background:var(--text-muted); opacity:0.4; margin:0 2px; }

  /* Sentence output */
  .sentence-box { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:16px; min-height:72px; position:relative; }
  .sentence-label { font-size:9px; color:var(--text-muted); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:8px; }
  .sentence-text { font-family:var(--font-d); font-size:22px; font-weight:700; color:var(--text); line-height:1.3; }
  .sentence-text.empty { color:var(--text-muted); font-size:14px; font-weight:400; font-family:var(--font-m); }

  /* TTS button */
  .btn-speak { position:absolute; top:14px; right:14px; background:var(--cyan-dim); border:1px solid var(--border-bright); color:var(--cyan); border-radius:6px; padding:6px 12px; font-family:var(--font-m); font-size:11px; letter-spacing:0.08em; cursor:pointer; transition:all 0.2s; }
  .btn-speak:hover { background:rgba(0,212,255,0.2); }
  .btn-speak.speaking { color:var(--amber); border-color:rgba(255,183,77,0.4); background:var(--amber-dim); animation:pulse-speak 1s infinite; }
  @keyframes pulse-speak { 0%,100%{opacity:1} 50%{opacity:0.6} }

  /* Controls row */
  .ctrl-row { display:flex; gap:10px; }
  .btn-ctrl { flex:1; padding:12px; border-radius:9px; border:1px solid; font-family:var(--font-m); font-size:11px; letter-spacing:0.1em; cursor:pointer; transition:all 0.2s; }
  .btn-ctrl.primary { background:var(--cyan-dim); border-color:var(--border-bright); color:var(--cyan); }
  .btn-ctrl.primary:hover { background:rgba(0,212,255,0.2); }
  .btn-ctrl.danger { background:transparent; border-color:var(--border); color:var(--text-dim); }
  .btn-ctrl.danger:hover { border-color:var(--red); color:var(--red); }
  .btn-ctrl.ghost { background:transparent; border-color:var(--border); color:var(--text-dim); }
  .btn-ctrl.ghost:hover { border-color:var(--border-bright); color:var(--text); }

  /* Divider */
  .divider { width:1px; background:var(--border); flex-shrink:0; }

  /* ── Speech → Sign panel ── */
  .speech-section { display:flex; flex-direction:column; gap:12px; }

  .mic-area { display:flex; flex-direction:column; align-items:center; gap:14px; padding:28px 0; }
  .mic-btn { width:80px; height:80px; border-radius:50%; border:2px solid var(--border-bright); background:var(--cyan-dim); color:var(--cyan); font-size:28px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; position:relative; }
  .mic-btn:hover { background:rgba(0,212,255,0.2); box-shadow:0 0 30px rgba(0,212,255,0.15); }
  .mic-btn.recording { background:rgba(255,77,109,0.15); border-color:var(--red); color:var(--red); animation:mic-pulse 1s ease-in-out infinite; }
  @keyframes mic-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,0.3)} 50%{box-shadow:0 0 0 16px rgba(255,77,109,0)} }
  .mic-label { font-size:11px; color:var(--text-dim); letter-spacing:0.1em; }

  /* Transcript */
  .transcript-box { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:14px 16px; min-height:52px; }
  .transcript-text { font-family:var(--font-d); font-size:16px; color:var(--text); line-height:1.5; }
  .transcript-text.empty { color:var(--text-muted); font-size:12px; font-family:var(--font-m); letter-spacing:0.05em; }

  /* Sign display (text→sign) */
  .sign-display { background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:24px; min-height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; position:relative; }
  .sign-display-label { position:absolute; top:12px; left:16px; font-size:9px; color:var(--text-muted); letter-spacing:0.2em; text-transform:uppercase; }
  .sign-big { font-family:var(--font-d); font-size:96px; font-weight:800; color:var(--purple); text-shadow:0 0 40px rgba(167,139,250,0.4); line-height:1; transition:all 0.2s; }
  .sign-word-label { font-size:11px; color:var(--text-dim); letter-spacing:0.15em; text-transform:uppercase; }
  .sign-progress { display:flex; gap:5px; flex-wrap:wrap; justify-content:center; margin-top:4px; }
  .sign-prog-dot { width:6px; height:6px; border-radius:50%; background:var(--border); transition:background 0.2s; }
  .sign-prog-dot.done { background:var(--purple); }
  .sign-prog-dot.current { background:var(--amber); box-shadow:0 0 6px var(--amber); }

  /* Section label */
  .sec2 { font-size:9px; color:var(--text-muted); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:6px; display:flex; align-items:center; gap:8px; }
  .sec2::after { content:''; flex:1; height:1px; background:var(--border); }

  /* Gloss chips row */
  .gloss-row { display:flex; gap:6px; flex-wrap:wrap; }
  .gloss-chip { font-size:11px; padding:4px 10px; border-radius:5px; border:1px solid var(--border); background:var(--bg3); color:var(--text-dim); letter-spacing:0.08em; transition:all 0.2s; }
  .gloss-chip.active { border-color:rgba(167,139,250,0.5); background:rgba(167,139,250,0.1); color:var(--purple); }

  /* camera idle */
  .cam-idle { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; }
  .cam-idle-icon { font-size:28px; opacity:0.3; }
  .cam-idle-txt { font-size:11px; color:var(--text-muted); letter-spacing:0.1em; }
`;

export default function TranslationApp() {
  // ── Camera / gesture state ────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const intervalRef = useRef(null);

  const [camActive, setCamActive] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState([]);

  // ── Sign→Text state ───────────────────────────────────────────────────────
  const [signBuffer, setSignBuffer] = useState([]);   // accumulated letters
  const [sentence, setSentence] = useState("");
  const [translating, setTranslating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lastSignRef = useRef(null);
  const holdTimerRef = useRef(null);
  const pauseTimerRef = useRef(null);

  // ── Speech→Sign state ─────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [signs, setSigns] = useState([]);        // [{type, value}]
  const [glossWords, setGlossWords] = useState([]);
  const [signIndex, setSignIndex] = useState(0);
  const signTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("sign-to-text");

  // ── Inject CSS ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.72);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCamActive(true);
      startLoop();
    } catch { alert("Camera access denied."); }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    clearInterval(intervalRef.current);
    setCamActive(false);
    setPrediction(null);
    setLandmarks([]);
  };

  // ── Prediction loop ───────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
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

        // Auto-buffer: if same sign held for 800ms → add to buffer
        if (data.sign && data.sign !== "untrained" && data.confidence > 0.75) {
          if (data.sign === lastSignRef.current) {
            // still holding same sign — wait for holdTimer
          } else {
            lastSignRef.current = data.sign;
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = setTimeout(() => {
              setSignBuffer(prev => [...prev, data.sign]);
              // Auto-translate after 2s pause
              clearTimeout(pauseTimerRef.current);
              pauseTimerRef.current = setTimeout(() => {
                translateBuffer();
              }, 2000);
            }, 800);
          }
        }
      } catch {}
    }, 150);
  }, [captureFrame]);

  // ── Draw landmarks ────────────────────────────────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
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
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "#00d4ff" : "rgba(255,255,255,0.85)";
      if (i === 0) { ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 8; }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks]);

  // ── Sign → Text translation ───────────────────────────────────────────────
  const translateBuffer = useCallback(async () => {
    if (signBuffer.length === 0) return;
    setTranslating(true);
    try {
      const res = await fetch(`${TRANSLATION_API}/sign-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signs: signBuffer }),
      });
      const data = await res.json();
      setSentence(data.sentence);
    } catch {
      setSentence(signBuffer.join(""));
    }
    setTranslating(false);
  }, [signBuffer]);

  const speakSentence = () => {
    if (!sentence || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(sentence);
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const clearBuffer = () => {
    setSignBuffer([]);
    setSentence("");
    clearTimeout(pauseTimerRef.current);
  };

  // ── Speech → Sign ─────────────────────────────────────────────────────────
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Speech recognition not supported in this browser. Use Chrome."); return; }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";   // Indian English

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join("");
      setTranscript(t);
    };

    rec.onend = async () => {
      setRecording(false);
      if (!transcript) return;
      // Send to translation API
      try {
        const res = await fetch(`${TRANSLATION_API}/text-to-signs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript }),
        });
        const data = await res.json();
        setSigns(data.signs || []);
        setGlossWords(data.gloss || []);
        setSignIndex(0);
        animateSigns(data.signs || []);
      } catch {
        // Fallback: fingerspell the transcript
        const fallback = transcript.toUpperCase().split("").filter(c => /[A-Z ]/.test(c)).map(c =>
          c === " " ? { type: "pause", value: "" } : { type: "letter", value: c }
        );
        setSigns(fallback);
        setSignIndex(0);
        animateSigns(fallback);
      }
    };

    rec.start();
    setRecording(true);
    recognitionRef.current = rec;
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const animateSigns = (signList) => {
    clearInterval(signTimerRef.current);
    let i = 0;
    signTimerRef.current = setInterval(() => {
      if (i >= signList.length) { clearInterval(signTimerRef.current); return; }
      setSignIndex(i);
      i++;
    }, signList[i]?.type === "pause" ? 400 : 700);
  };

  const currentSign = signs[signIndex];

  return (
    <div className="app2">
      {/* Header */}
      <div className="hdr2">
        <div className={`hdr2-dot ${camActive ? "live" : ""}`} />
        <div className="hdr2-logo">SignAI <span>/ Phase 2</span></div>
        <div className="hdr2-status">two-way translation</div>
        <div className="phase-tag">Translation</div>
      </div>

      {/* Tabs */}
      <div className="nav-tabs">
        <button className={`nav-tab ${tab === "sign-to-text" ? "active" : ""}`} onClick={() => setTab("sign-to-text")}>
          ✋ Sign → Text / Speech
        </button>
        <button className={`nav-tab ${tab === "speech-to-sign" ? "active" : ""}`} onClick={() => setTab("speech-to-sign")}>
          🎙 Speech → Sign
        </button>
      </div>

      <div className="content2">
        {/* ── Sign → Text ── */}
        {tab === "sign-to-text" && (
          <div className="panel">
            {/* Camera */}
            <div className={`cam-wrap2 ${camActive ? "active" : ""}`}>
              <video ref={videoRef} muted playsInline />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <canvas ref={overlayRef} className="overlay" />
              {camActive && <>
                <div className="corner2 c2-tl" /><div className="corner2 c2-tr" />
                <div className="corner2 c2-bl" /><div className="corner2 c2-br" />
                <div className="scanline2" />
              </>}
              {camActive && prediction && prediction !== "untrained" && confidence > 0.65 && (
                <div className="live-sign">
                  <div className="live-letter">{prediction}</div>
                  <div className="live-conf">{Math.round(confidence * 100)}%</div>
                </div>
              )}
              {!camActive && (
                <div className="cam-idle">
                  <div className="cam-idle-icon">◎</div>
                  <div className="cam-idle-txt">camera inactive</div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="ctrl-row">
              <button className={`btn-ctrl ${camActive ? "danger" : "primary"}`} onClick={camActive ? stopCamera : startCamera}>
                {camActive ? "■ Stop Camera" : "▶ Start Camera"}
              </button>
              <button className="btn-ctrl ghost" onClick={translateBuffer} disabled={signBuffer.length === 0 || translating}>
                {translating ? "Translating..." : "⟳ Translate Now"}
              </button>
              <button className="btn-ctrl ghost" onClick={clearBuffer}>✕ Clear</button>
            </div>

            {/* Sign buffer */}
            <div>
              <div className="sec2">Sign buffer {signBuffer.length > 0 && `· ${signBuffer.length} signs`}</div>
              <div className="sign-buffer">
                {signBuffer.length === 0
                  ? <span className="buffer-hint">Signs you make will appear here automatically</span>
                  : signBuffer.map((s, i) => (
                    s === " "
                      ? <div key={i} className="sign-pause" />
                      : <div key={i} className="sign-chip">{s}</div>
                  ))
                }
              </div>
            </div>

            {/* Sentence output */}
            <div>
              <div className="sec2">Translated sentence</div>
              <div className="sentence-box">
                <div className="sentence-text" style={sentence ? {} : { color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-m)" }}>
                  {sentence || "Translation will appear here after you sign..."}
                </div>
                {sentence && (
                  <button className={`btn-speak ${speaking ? "speaking" : ""}`} onClick={speakSentence}>
                    {speaking ? "◼ Speaking..." : "▶ Speak"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
              Hold each sign for ~0.8s to register · After 2s pause, translation runs automatically
            </div>
          </div>
        )}

        {/* ── Speech → Sign ── */}
        {tab === "speech-to-sign" && (
          <div className="panel">
            {/* Mic */}
            <div className="mic-area">
              <button
                className={`mic-btn ${recording ? "recording" : ""}`}
                onClick={recording ? stopRecording : startRecording}
              >
                {recording ? "⏹" : "🎙"}
              </button>
              <div className="mic-label">
                {recording ? "Listening... tap to stop" : "Tap to speak"}
              </div>
            </div>

            {/* Transcript */}
            <div>
              <div className="sec2">What you said</div>
              <div className="transcript-box">
                <div className={`transcript-text ${!transcript ? "empty" : ""}`}>
                  {transcript || "Speak after tapping the mic..."}
                </div>
              </div>
            </div>

            {/* Sign display */}
            {signs.length > 0 && (
              <>
                {/* Gloss words */}
                {glossWords.length > 0 && (
                  <div>
                    <div className="sec2">Sign language gloss</div>
                    <div className="gloss-row">
                      {glossWords.map((w, i) => {
                        const letterSigns = signs.filter(s => s.type === "letter");
                        const currentWord = currentSign?.type === "letter" ? glossWords[Math.floor(signIndex / 2)] : null;
                        return (
                          <div key={i} className={`gloss-chip ${w === currentWord ? "active" : ""}`}>
                            {w}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Big sign display */}
                <div>
                  <div className="sec2">Signing now</div>
                  <div className="sign-display">
                    <div className="sign-display-label">Fingerspelling</div>
                    {currentSign?.type === "letter" && (
                      <>
                        <div className="sign-big">{currentSign.value}</div>
                        <div className="sign-word-label">
                          {signs.find((s, i) => i < signIndex && s.type === "word_label")?.value || ""}
                        </div>
                      </>
                    )}
                    {currentSign?.type === "word_label" && (
                      <div className="sign-word-label" style={{ fontSize: 16, color: "var(--cyan)" }}>
                        {currentSign.value}
                      </div>
                    )}
                    {currentSign?.type === "pause" && (
                      <div className="sign-word-label">···</div>
                    )}
                    {/* Progress dots */}
                    <div className="sign-progress">
                      {signs.filter(s => s.type === "letter").map((_, i) => (
                        <div key={i} className={`sign-prog-dot ${i < signIndex ? "done" : i === signIndex ? "current" : ""}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ctrl-row">
                  <button className="btn-ctrl primary" onClick={() => { setSignIndex(0); animateSigns(signs); }}>
                    ↺ Replay Signs
                  </button>
                  <button className="btn-ctrl ghost" onClick={() => { setSigns([]); setTranscript(""); setGlossWords([]); }}>
                    ✕ Clear
                  </button>
                </div>
              </>
            )}

            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7, marginTop: "auto" }}>
              Uses browser speech recognition (Chrome works best) · Works offline · Indian English supported
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
