import { useState, useRef, useEffect, useCallback } from "react";

const GESTURE_API  = "http://localhost:8000";
const SCORING_API  = "http://localhost:8002";

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// Built-in sign library (shown before user records references)
const SIGN_LIBRARY = {
  ISL: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    words: ["HELLO","THANKS","HELP","YES","NO","PLEASE","SORRY","WATER","FOOD","HOME","GOOD","BAD","MORE","STOP","GO"],
  },
  ASL: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    words: ["HELLO","THANKS","HELP","YES","NO","PLEASE","SORRY","WATER","FOOD","HOME","GOOD","BAD","MORE","STOP","GO"],
  },
};

const FINGER_COLORS = {
  correct: "#10b981",
  warning: "#ffb74d",
  error:   "#ef4444",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#09090b;--bg2:#0d0d10;--bg3:#131317;--bg4:#181822;
    --border:rgba(139,92,246,0.1);--border-b:rgba(139,92,246,0.3);
    --cyan:#8b5cf6;--cyan-d:rgba(139,92,246,0.1);
    --amber:#10b981;--amber-d:rgba(16,185,129,0.1);
    --green:#10b981;--green-d:rgba(16,185,129,0.1);
    --red:#ef4444;--red-d:rgba(239,68,68,0.1);
    --purple:#a78bfa;--purple-d:rgba(167,139,250,0.1);
    --text:#f0f0f5;--text-d:#71727a;--text-m:#27272a;
    --fd:'Plus Jakarta Sans',sans-serif;--fm:'Inter',sans-serif;
  }
  body{background:var(--bg);color:var(--text);font-family:var(--fm)}

  .p3{display:flex;flex-direction:column;background:var(--bg);position:relative;overflow:hidden}
  .p3::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}

  /* Header */
  .p3-hdr{position:relative;z-index:10;display:flex;align-items:center;gap:14px;padding:12px 24px;border-bottom:1px solid var(--border);background:rgba(4,7,15,0.9);backdrop-filter:blur(12px)}
  .p3-logo{font-family:var(--fd);font-weight:800;font-size:15px;color:var(--cyan)}
  .p3-logo span{color:var(--text-d);font-weight:400}
  .p3-live{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:plive 2s infinite}
  @keyframes plive{0%,100%{opacity:1}50%{opacity:0.3}}
  .p3-live.off{background:var(--text-m);box-shadow:none;animation:none}
  .p3-tag{margin-left:auto;font-size:10px;color:var(--text-m);letter-spacing:0.12em;border:1px solid var(--text-m);padding:3px 8px;border-radius:3px}

  /* Layout */
  .p3-body{position:relative;z-index:1;display:flex;flex:1;min-height:0}

  /* Sidebar - sign picker */
  .sign-picker{width:240px;border-right:1px solid var(--border);display:flex;flex-direction:column;background:rgba(8,13,26,0.6);overflow:hidden}
  .sp-header{padding:16px;border-bottom:1px solid var(--border)}
  .sp-lang{display:flex;gap:4px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:3px;margin-bottom:12px}
  .sp-lang-btn{flex:1;padding:6px;border:none;border-radius:5px;font-family:var(--fm);font-size:10px;letter-spacing:0.1em;cursor:pointer;background:transparent;color:var(--text-m);transition:all 0.2s}
  .sp-lang-btn.active{background:var(--cyan-d);color:var(--cyan);border:1px solid var(--border-b)}
  .sp-cat{display:flex;gap:4px}
  .sp-cat-btn{flex:1;padding:5px;border:1px solid var(--border);border-radius:5px;font-family:var(--fm);font-size:10px;cursor:pointer;background:transparent;color:var(--text-m);transition:all 0.2s;letter-spacing:0.06em}
  .sp-cat-btn.active{color:var(--amber);border-color:rgba(255,183,77,0.4);background:var(--amber-d)}

  .sp-list{flex:1;overflow-y:auto;padding:8px}
  .sp-list::-webkit-scrollbar{width:3px}
  .sp-list::-webkit-scrollbar-track{background:transparent}
  .sp-list::-webkit-scrollbar-thumb{background:var(--border)}

  .sign-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all 0.15s;margin-bottom:3px;border:1px solid transparent}
  .sign-item:hover{background:var(--bg3);border-color:var(--border)}
  .sign-item.selected{background:var(--cyan-d);border-color:var(--border-b)}
  .sign-item-label{font-family:var(--fd);font-size:15px;font-weight:700;color:var(--text);min-width:28px}
  .sign-item.selected .sign-item-label{color:var(--cyan)}
  .sign-item-meta{flex:1}
  .sign-item-name{font-size:11px;color:var(--text-d);letter-spacing:0.04em}
  .sign-item-status{width:6px;height:6px;border-radius:50%;background:var(--border)}
  .sign-item-status.captured{background:var(--green);box-shadow:0 0 5px var(--green)}
  .sign-item-status.practiced{background:var(--amber)}

  /* Main practice area */
  .practice-area{flex:1;padding:24px;display:flex;flex-direction:column;gap:16px;overflow-y:visible}

  /* Top row — camera + score */
  .practice-top{display:flex;gap:16px}

  /* Camera */
  .p3-cam{flex:1;position:relative;border-radius:14px;overflow:hidden;background:var(--bg2);aspect-ratio:4/3;border:1px solid var(--border);transition:border-color 0.4s}
  .p3-cam.active{border-color:var(--border-b);box-shadow:inset 0 0 40px rgba(0,212,255,0.04)}
  .p3-cam video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}
  .p3-cam canvas.ov{position:absolute;inset:0;width:100%;height:100%;transform:scaleX(-1);pointer-events:none;z-index:3}
  .p3-corner{position:absolute;width:16px;height:16px;z-index:4}
  .pc-tl{top:10px;left:10px;border-top:1.5px solid var(--cyan);border-left:1.5px solid var(--cyan);border-radius:3px 0 0 0}
  .pc-tr{top:10px;right:10px;border-top:1.5px solid var(--cyan);border-right:1.5px solid var(--cyan);border-radius:0 3px 0 0}
  .pc-bl{bottom:10px;left:10px;border-bottom:1.5px solid var(--cyan);border-left:1.5px solid var(--cyan);border-radius:0 0 0 3px}
  .pc-br{bottom:10px;right:10px;border-bottom:1.5px solid var(--cyan);border-right:1.5px solid var(--cyan);border-radius:0 0 3px 0}
  @keyframes sc3{0%{top:-2px}100%{top:100%}}
  .sl3{position:absolute;left:0;right:0;height:2px;background:linear-gradient(transparent,rgba(0,212,255,0.15),transparent);animation:sc3 3s linear infinite;z-index:4;pointer-events:none}

  /* Target sign overlay on camera */
  .target-overlay{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:5;display:flex;flex-direction:column;align-items:center;gap:2px}
  .target-label{font-size:9px;color:rgba(0,212,255,0.6);letter-spacing:0.15em;text-transform:uppercase}
  .target-sign{font-family:var(--fd);font-size:42px;font-weight:800;color:rgba(0,212,255,0.25);text-shadow:0 0 20px rgba(0,212,255,0.1);line-height:1}

  /* Score panel */
  .score-panel{width:200px;display:flex;flex-direction:column;gap:12px}

  /* Score ring */
  .score-ring-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px}
  .score-ring{position:relative;width:110px;height:110px}
  .score-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
  .score-ring-val{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .score-num{font-family:var(--fd);font-size:32px;font-weight:800;line-height:1;transition:color 0.4s}
  .score-pct{font-size:10px;color:var(--text-d);letter-spacing:0.1em}
  .score-grade{font-family:var(--fd);font-size:13px;font-weight:600;letter-spacing:0.05em}
  .score-msg{font-size:11px;color:var(--text-d);text-align:center;line-height:1.5}

  /* Streak */
  .streak-box{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:10px}
  .streak-fire{font-size:22px}
  .streak-val{font-family:var(--fd);font-size:24px;font-weight:800;color:var(--amber);line-height:1}
  .streak-label{font-size:10px;color:var(--text-d);letter-spacing:0.08em}

  /* Controls */
  .p3-controls{display:flex;gap:8px}
  .p3-btn{flex:1;padding:11px;border-radius:9px;border:1px solid;font-family:var(--fm);font-size:11px;letter-spacing:0.09em;cursor:pointer;transition:all 0.2s}
  .p3-btn.primary{background:var(--cyan-d);border-color:var(--border-b);color:var(--cyan)}
  .p3-btn.primary:hover{background:rgba(0,212,255,0.18)}
  .p3-btn.amber{background:var(--amber-d);border-color:rgba(255,183,77,0.35);color:var(--amber)}
  .p3-btn.amber:hover{background:rgba(255,183,77,0.18)}
  .p3-btn.ghost{background:transparent;border-color:var(--border);color:var(--text-d)}
  .p3-btn.ghost:hover{border-color:var(--border-b);color:var(--text)}
  .p3-btn:disabled{opacity:0.35;cursor:not-allowed}

  /* Hint box */
  .hint-box{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
  .hint-label{font-size:9px;color:var(--text-m);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px}
  .hint-text{font-size:12px;color:var(--text-d);line-height:1.7}

  /* Finger feedback */
  .feedback-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .finger-card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;transition:border-color 0.3s}
  .finger-card.correct{border-color:rgba(0,229,160,0.3);background:rgba(0,229,160,0.04)}
  .finger-card.warning{border-color:rgba(255,183,77,0.3);background:rgba(255,183,77,0.04)}
  .finger-card.error{border-color:rgba(255,77,109,0.3);background:rgba(255,77,109,0.04)}
  .fc-top{display:flex;align-items:center;gap:7px;margin-bottom:3px}
  .fc-dot{width:6px;height:6px;border-radius:50%}
  .fc-name{font-family:var(--fd);font-size:12px;font-weight:600;color:var(--text)}
  .fc-msg{font-size:11px;color:var(--text-d);line-height:1.5}

  /* Section label */
  .sec3{font-size:9px;color:var(--text-m);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .sec3::after{content:'';flex:1;height:1px;background:var(--border)}

  /* Capture mode overlay */
  .capture-mode-banner{background:rgba(255,183,77,0.08);border:1px solid rgba(255,183,77,0.25);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--amber);display:flex;align-items:center;gap:10px}
  .capture-dot{width:8px;height:8px;border-radius:50%;background:var(--amber);animation:plive 0.8s infinite}

  /* cam idle */
  .p3-idle{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
  .p3-idle-icon{font-size:26px;opacity:0.25}
  .p3-idle-txt{font-size:11px;color:var(--text-m);letter-spacing:0.1em}

  /* Score flash animation */
  @keyframes score-flash{0%{transform:scale(1.3);opacity:0.5}100%{transform:scale(1);opacity:1}}
  .score-flash{animation:score-flash 0.4s ease}

  /* Progress bar */
  .progress-bar-wrap{height:4px;background:var(--bg3);border-radius:2px;overflow:hidden}
  .progress-bar-fill{height:100%;border-radius:2px;transition:width 0.5s ease,background 0.4s}
`;

// ── Audio cues using Web Audio API ───────────────────────────────────────────
function playAudioCue(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
  } catch {}
}

// ── Score ring SVG ───────────────────────────────────────────────────────────
function ScoreRing({ score, grade }) {
  const r = 44, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#8b5cf6" : score >= 50 ? "#ffb74d" : "#ef4444";
  return (
    <div className="score-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s" }} />
      </svg>
      <div className="score-ring-val">
        <div className="score-num" style={{ color }}>{Math.round(score)}</div>
        <div className="score-pct">/ 100</div>
      </div>
    </div>
  );
}

export default function PracticeApp() {
  // Camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const intervalRef = useRef(null);
  const scoreTimerRef = useRef(null);

  const [camActive, setCamActive] = useState(false);
  const [landmarks, setLandmarks] = useState([]);
  const lastCoordsRef = useRef(null);

  // Sign selection
  const [language, setLanguage] = useState("ISL");
  const [category, setCategory] = useState("letters");
  const [selectedSign, setSelectedSign] = useState("A");
  const [capturedSigns, setCapturedSigns] = useState(new Set());
  const [practicedSigns, setPracticedSigns] = useState({});

  // Practice state
  const [mode, setMode] = useState("practice"); // practice | capture
  const [score, setScore] = useState(null);
  const [grade, setGrade] = useState("");
  const [scoreMsg, setScoreMsg] = useState("");
  const [feedback, setFeedback] = useState([]);
  const [streak, setStreak] = useState(0);
  const [hint, setHint] = useState("");
  const [isScoring, setIsScoring] = useState(false);
  const [captureFrames, setCaptureFrames] = useState([]);
  const [capturing, setCapturing] = useState(false);

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // Load hint when sign changes
  useEffect(() => {
    const HINTS = {
      HELLO:"Open hand, fingers together, touch forehead then move outward",
      THANKS:"Flat hand, touch chin then move forward",
      HELP:"Thumb-up fist on open palm, raise both hands",
      YES:"Fist, nod it up and down",
      NO:"Index + middle tap thumb twice",
      PLEASE:"Flat hand, circular motion on chest",
      SORRY:"Fist, circular motion on chest",
      WATER:"W handshape, tap chin twice",
      FOOD:"Flat O, tap mouth twice",
      HOME:"Flat O to cheek then flat hand to cheek",
      GOOD:"Flat hand from chin, forward and down",
      BAD:"Flat hand from chin, flip down and away",
      MORE:"Both flat O hands, tap fingertips together",
      STOP:"Dominant hand chops onto other palm",
      GO:"Both index fingers arc forward",
    };
    setHint(HINTS[selectedSign] || `Make the ${language} sign for "${selectedSign}"`);
    setScore(null);
    setFeedback([]);
  }, [selectedSign, language]);

  // Camera
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
    setLandmarks([]);
  };

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
        setLandmarks(data.landmarks || []);
        if (data.coords) lastCoordsRef.current = data.coords;
      } catch {}
    }, 120);
  }, [captureFrame]);

  // Draw hand skeleton
  useEffect(() => {
    const overlay = overlayRef.current, video = videoRef.current;
    if (!overlay || !video) return;
    const ctx = overlay.getContext("2d");
    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!landmarks.length) return;
    const W = overlay.width, H = overlay.height;

    // Color joints by feedback status
    const fingerStatus = {};
    feedback.forEach(f => { fingerStatus[f.finger] = f.status; });
    const FINGER_IDX = { thumb:[1,2,3,4], index:[5,6,7,8], middle:[9,10,11,12], ring:[13,14,15,16], pinky:[17,18,19,20] };
    const jointStatus = new Array(21).fill("neutral");
    Object.entries(FINGER_IDX).forEach(([name, idxs]) => {
      const st = fingerStatus[name] || "neutral";
      idxs.forEach(i => { jointStatus[i] = st; });
    });

    HAND_CONNECTIONS.forEach(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return;
      ctx.beginPath();
      ctx.moveTo(landmarks[a][0] * W, landmarks[a][1] * H);
      ctx.lineTo(landmarks[b][0] * W, landmarks[b][1] * H);
      ctx.strokeStyle = "rgba(139,92,246,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    landmarks.forEach((pt, i) => {
      const st = jointStatus[i];
      const col = st === "correct" ? "#10b981" : st === "warning" ? "#ffb74d" : st === "error" ? "#ef4444" : i === 0 ? "#8b5cf6" : "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(pt[0] * W, pt[1] * H, i === 0 ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = col;
      if (i === 0 || st !== "neutral") { ctx.shadowColor = col; ctx.shadowBlur = 8; }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [landmarks, feedback]);

  // Score pose
  const scorePose = useCallback(async () => {
    if (!lastCoordsRef.current || isScoring) return;
    setIsScoring(true);
    try {
      const res = await fetch(`${SCORING_API}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign: selectedSign, language, coords: lastCoordsRef.current }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`No reference captured for "${selectedSign}" yet. Switch to Capture mode first.`);
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
        setPracticedSigns(prev => ({ ...prev, [selectedSign]: (prev[selectedSign] || 0) + 1 }));
      } else {
        setStreak(0);
      }
    } catch { alert("Scoring API not reachable. Start it on port 8002."); }
    setIsScoring(false);
  }, [selectedSign, language, isScoring]);

  // Auto-score every 1.5s when in practice mode and camera active
  useEffect(() => {
    if (camActive && mode === "practice") {
      scoreTimerRef.current = setInterval(scorePose, 1500);
    } else {
      clearInterval(scoreTimerRef.current);
    }
    return () => clearInterval(scoreTimerRef.current);
  }, [camActive, mode, scorePose]);

  // Capture reference
  const startCapture = () => {
    setCaptureFrames([]);
    setCapturing(true);
    const frames = [];
    const captureInterval = setInterval(() => {
      if (lastCoordsRef.current) frames.push([...lastCoordsRef.current]);
      if (frames.length >= 10) {
        clearInterval(captureInterval);
        saveReference(frames);
        setCapturing(false);
      }
    }, 100);
  };

  const saveReference = async (frames) => {
    try {
      await fetch(`${SCORING_API}/capture-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sign: selectedSign,
          language,
          category: category === "letters" ? "letter" : "word",
          coords_sequence: frames,
        }),
      });
      setCapturedSigns(prev => new Set([...prev, `${language}_${selectedSign}`]));
      playAudioCue("success");
    } catch { alert("Scoring API not reachable."); }
  };

  const signs = category === "letters" ? SIGN_LIBRARY[language].letters : SIGN_LIBRARY[language].words;
  const gradeColor = grade === "excellent" ? "#00e5a0" : grade === "good" ? "#00d4ff" : grade === "fair" ? "#ffb74d" : "#ff4d6d";

  return (
    <div className="p3">
      {/* Header */}
      <div className="p3-hdr">
        <div className={`p3-live ${camActive ? "" : "off"}`} />
        <div className="p3-logo">SignAI <span>/ Phase 3</span></div>
        <div style={{ fontSize: 11, color: "var(--text-d)" }}>
          {streak > 0 ? `🔥 ${streak} streak` : "learning & practice"}
        </div>
        <div className="p3-tag">Practice Mode</div>
      </div>

      <div className="p3-body">
        {/* Sign picker sidebar */}
        <div className="sign-picker">
          <div className="sp-header">
            {/* Language */}
            <div className="sp-lang">
              {["ISL", "ASL"].map(l => (
                <button key={l} className={`sp-lang-btn ${language === l ? "active" : ""}`} onClick={() => setLanguage(l)}>{l}</button>
              ))}
            </div>
            {/* Category */}
            <div className="sp-cat">
              {["letters", "words"].map(c => (
                <button key={c} className={`sp-cat-btn ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-list">
            {signs.map(s => {
              const key = `${language}_${s}`;
              const isCaptured = capturedSigns.has(key);
              const isPracticed = practicedSigns[s] > 0;
              return (
                <div
                  key={s}
                  className={`sign-item ${selectedSign === s ? "selected" : ""}`}
                  onClick={() => setSelectedSign(s)}
                >
                  <div className="sign-item-label">{s}</div>
                  <div className="sign-item-meta">
                    <div className="sign-item-name">{category === "letters" ? "Fingerspell" : "Word sign"}</div>
                  </div>
                  <div className={`sign-item-status ${isCaptured ? "captured" : isPracticed ? "practiced" : ""}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Practice area */}
        <div className="practice-area">
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {["practice", "capture"].map(m => (
              <button
                key={m}
                className={`p3-btn ${mode === m ? (m === "capture" ? "amber" : "primary") : "ghost"}`}
                style={{ maxWidth: 140 }}
                onClick={() => setMode(m)}
              >
                {m === "practice" ? "▶ Practice" : "⏺ Capture Reference"}
              </button>
            ))}
          </div>

          {mode === "capture" && (
            <div className="capture-mode-banner">
              <div className="capture-dot" />
              Capture mode: show the correct <strong style={{ color: "var(--amber)" }}>{selectedSign}</strong> sign, then click Capture Reference below
            </div>
          )}

          <div className="practice-top">
            {/* Camera */}
            <div className={`p3-cam ${camActive ? "active" : ""}`}>
              <video ref={videoRef} muted playsInline />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <canvas ref={overlayRef} className="ov" />
              {camActive && <>
                <div className="p3-corner pc-tl" /><div className="p3-corner pc-tr" />
                <div className="p3-corner pc-bl" /><div className="p3-corner pc-br" />
                <div className="sl3" />
                <div className="target-overlay">
                  <div className="target-label">target sign</div>
                  <div className="target-sign">{selectedSign}</div>
                </div>
              </>}
              {!camActive && (
                <div className="p3-idle">
                  <div className="p3-idle-icon">◎</div>
                  <div className="p3-idle-txt">start camera to practice</div>
                </div>
              )}
            </div>

            {/* Score panel */}
            <div className="score-panel">
              <div className="score-ring-wrap">
                {score !== null
                  ? <>
                    <ScoreRing score={score} grade={grade} />
                    <div className="score-grade" style={{ color: gradeColor }}>{grade}</div>
                    <div className="score-msg">{scoreMsg}</div>
                  </>
                  : <>
                    <ScoreRing score={0} grade="" />
                    <div className="score-msg" style={{ color: "var(--text-m)" }}>
                      {mode === "practice" ? "Start camera to score" : "Capture a reference first"}
                    </div>
                  </>
                }
              </div>

              {/* Streak */}
              <div className="streak-box">
                <div className="streak-fire">🔥</div>
                <div>
                  <div className="streak-val">{streak}</div>
                  <div className="streak-label">streak</div>
                </div>
              </div>

              {/* Score bar */}
              {score !== null && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-m)", letterSpacing: "0.1em", marginBottom: 5 }}>ACCURACY</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{
                      width: `${score}%`,
                      background: score >= 85 ? "#10b981" : score >= 70 ? "#8b5cf6" : score >= 50 ? "#ffb74d" : "#ef4444"
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="p3-controls">
            <button className={`p3-btn ${camActive ? "ghost" : "primary"}`} onClick={camActive ? stopCamera : startCamera}>
              {camActive ? "■ Stop Camera" : "▶ Start Camera"}
            </button>
            {mode === "capture" && (
              <button className="p3-btn amber" onClick={startCapture} disabled={!camActive || capturing}>
                {capturing ? `⏺ Capturing...` : "⏺ Capture Reference"}
              </button>
            )}
            {mode === "practice" && (
              <button className="p3-btn primary" onClick={scorePose} disabled={!camActive || isScoring}>
                {isScoring ? "Scoring..." : "⟳ Score Now"}
              </button>
            )}
          </div>

          {/* Hint */}
          <div className="hint-box">
            <div className="hint-label">How to sign "{selectedSign}" in {language}</div>
            <div className="hint-text">{hint}</div>
          </div>

          {/* Finger feedback */}
          {feedback.length > 0 && (
            <div>
              <div className="sec3">Finger feedback</div>
              <div className="feedback-grid">
                {feedback.map((f, i) => (
                  <div key={i} className={`finger-card ${f.status}`}>
                    <div className="fc-top">
                      <div className="fc-dot" style={{ background: FINGER_COLORS[f.status] || "#888" }} />
                      <div className="fc-name">{f.finger.charAt(0).toUpperCase() + f.finger.slice(1)}</div>
                    </div>
                    <div className="fc-msg">{f.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}