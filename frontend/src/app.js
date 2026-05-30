import { useState, useEffect } from "react";
import GestureApp from './imports/GestureApp';
import TranslationApp from './imports/TranslationApp';
import PracticeApp from './imports/PracticeApp';

const G = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Instrument+Serif:ital@0;1&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#03060d; --bg2:#070c18; --bg3:#0c1220;
  --cyan:#00d4ff; --cyan2:#00fff7; --amber:#ffb74d;
  --green:#00e5a0; --red:#ff4d6d; --purple:#c084fc;
  --text:#d4e4f0; --dim:#3a5060; --muted:#1a2530;
  --border:rgba(0,212,255,0.1); --border2:rgba(0,212,255,0.28);
  --ff-display:'Bebas Neue',sans-serif;
  --ff-serif:'Instrument Serif',serif;
  --ff-mono:'DM Mono',monospace;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--ff-mono);overflow-x:hidden}
::selection{background:rgba(0,212,255,0.2);color:var(--cyan)}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px}

.nav{position:fixed;top:0;left:0;right:0;z-index:1000;display:flex;align-items:center;padding:0 40px;height:64px;background:rgba(3,6,13,0.88);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.nav-logo{font-family:var(--ff-display);font-size:28px;letter-spacing:0.06em;color:var(--cyan);cursor:pointer}
.nav-logo em{color:var(--amber);font-style:normal}
.nav-links{display:flex;gap:6px;margin-left:40px}
.nav-link{padding:6px 14px;border-radius:4px;border:1px solid transparent;background:transparent;color:var(--dim);font-family:var(--ff-mono);font-size:11px;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s}
.nav-link:hover{color:var(--text);border-color:var(--border)}
.nav-link.active{color:var(--cyan);border-color:var(--border2);background:rgba(0,212,255,0.06)}
.nav-cta{margin-left:auto;padding:8px 20px;border-radius:4px;background:var(--cyan);color:var(--bg);font-family:var(--ff-mono);font-size:11px;letter-spacing:0.1em;border:none;cursor:pointer;font-weight:500;transition:all 0.2s}
.nav-cta:hover{background:var(--cyan2);transform:translateY(-1px)}

.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 40px 60px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.04) 1px,transparent 1px);background-size:60px 60px}
.hero::after{content:'';position:absolute;top:20%;left:50%;transform:translate(-50%,-50%);width:800px;height:500px;background:radial-gradient(ellipse at 30% 50%,rgba(0,212,255,0.08) 0%,transparent 60%),radial-gradient(ellipse at 70% 50%,rgba(192,132,252,0.06) 0%,transparent 60%);pointer-events:none}
.hero-eyebrow{font-size:11px;letter-spacing:0.3em;color:var(--cyan);text-transform:uppercase;margin-bottom:24px;position:relative;z-index:1;display:flex;align-items:center;gap:12px}
.hero-eyebrow::before,.hero-eyebrow::after{content:'';width:40px;height:1px;background:var(--cyan);opacity:0.4}
.hero-title{font-family:var(--ff-display);font-size:clamp(72px,12vw,160px);line-height:0.92;text-align:center;letter-spacing:0.02em;position:relative;z-index:1;margin-bottom:8px}
.hero-title .line1{color:var(--text);display:block}
.hero-title .line2{color:transparent;-webkit-text-stroke:1px rgba(0,212,255,0.4);display:block}
.hero-title .line3{color:var(--cyan);display:block}
.hero-sub{font-family:var(--ff-serif);font-style:italic;font-size:clamp(16px,2vw,22px);color:var(--dim);text-align:center;margin:32px 0;max-width:560px;line-height:1.6;position:relative;z-index:1}
.hero-sub strong{color:var(--text);font-style:normal;font-family:var(--ff-mono);font-size:14px}
.hero-btns{display:flex;gap:12px;position:relative;z-index:1;flex-wrap:wrap;justify-content:center}
.hero-btn-primary{padding:14px 32px;border-radius:4px;background:var(--cyan);color:var(--bg);font-family:var(--ff-mono);font-size:12px;letter-spacing:0.15em;border:none;cursor:pointer;font-weight:500;transition:all 0.25s}
.hero-btn-primary:hover{background:var(--cyan2);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,212,255,0.2)}
.hero-btn-ghost{padding:14px 32px;border-radius:4px;background:transparent;color:var(--text);font-family:var(--ff-mono);font-size:12px;letter-spacing:0.15em;border:1px solid var(--border2);cursor:pointer;transition:all 0.25s}
.hero-btn-ghost:hover{border-color:var(--cyan);color:var(--cyan)}
.hero-scroll{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;font-size:9px;color:var(--dim);letter-spacing:0.2em;animation:float 2.5s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}
.hero-scroll-line{width:1px;height:40px;background:linear-gradient(var(--border2),transparent)}

.stats{border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:60px 40px;display:grid;grid-template-columns:repeat(4,1fr)}
.stat{padding:0 40px;border-right:1px solid var(--border)}
.stat:first-child{padding-left:0}.stat:last-child{border-right:none}
.stat-num{font-family:var(--ff-display);font-size:52px;line-height:1;color:var(--cyan);letter-spacing:0.04em;margin-bottom:8px}
.stat-label{font-size:11px;color:var(--dim);letter-spacing:0.15em;text-transform:uppercase}

.features{padding:120px 40px;max-width:1200px;margin:0 auto}
.section-label{font-size:10px;letter-spacing:0.3em;color:var(--cyan);text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:12px}
.section-label::after{content:'';flex:1;height:1px;background:var(--border)}
.features-title{font-family:var(--ff-display);font-size:clamp(40px,6vw,72px);line-height:1;margin-bottom:64px;letter-spacing:0.02em}
.features-title span{color:var(--cyan)}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.feature-card{background:var(--bg2);padding:40px 32px;position:relative;overflow:hidden;cursor:pointer;transition:background 0.3s;border:1px solid var(--border)}
.feature-card:hover{background:var(--bg3)}
.feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent,var(--cyan));transform:scaleX(0);transform-origin:left;transition:transform 0.3s}
.feature-card:hover::before{transform:scaleX(1)}
.feature-num{font-family:var(--ff-display);font-size:64px;line-height:1;color:var(--muted);position:absolute;top:20px;right:24px}
.feature-icon{font-size:28px;margin-bottom:20px}
.feature-name{font-family:var(--ff-display);font-size:28px;letter-spacing:0.04em;color:var(--text);margin-bottom:12px}
.feature-desc{font-size:12px;color:var(--dim);line-height:1.8}
.feature-tag{display:inline-block;margin-top:20px;font-size:10px;padding:4px 10px;border-radius:3px;background:rgba(0,212,255,0.08);color:var(--cyan);border:1px solid var(--border2);letter-spacing:0.1em}

.how{padding:120px 40px;max-width:1200px;margin:0 auto}
.how-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.how-steps{display:flex;flex-direction:column}
.how-step{display:flex;gap:24px;padding:28px 0;border-bottom:1px solid var(--border)}
.how-step:first-child{border-top:1px solid var(--border)}
.step-num{font-family:var(--ff-display);font-size:40px;color:var(--muted);min-width:48px;line-height:1;transition:color 0.2s}
.how-step:hover .step-num{color:var(--cyan)}
.step-title{font-family:var(--ff-display);font-size:22px;letter-spacing:0.04em;color:var(--text);margin-bottom:8px;transition:color 0.2s}
.how-step:hover .step-title{color:var(--cyan)}
.step-desc{font-size:12px;color:var(--dim);line-height:1.8}
.how-visual{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;position:relative;overflow:hidden}
.how-visual::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,212,255,0.06) 0%,transparent 70%)}
.visual-hand{font-size:80px;margin-bottom:24px;animation:hand-float 3s ease-in-out infinite}
@keyframes hand-float{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-12px) rotate(5deg)}}
.visual-label{font-family:var(--ff-display);font-size:120px;color:var(--amber);line-height:1;text-shadow:0 0 60px rgba(255,183,77,0.3);animation:letter-pulse 2s ease-in-out infinite}
@keyframes letter-pulse{0%,100%{text-shadow:0 0 60px rgba(255,183,77,0.3)}50%{text-shadow:0 0 100px rgba(255,183,77,0.6)}}
.visual-conf{font-size:12px;color:var(--amber);opacity:0.7;letter-spacing:0.2em;margin-top:8px}

.isl-section{padding:80px 40px;background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.isl-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.isl-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,183,77,0.1);border:1px solid rgba(255,183,77,0.3);padding:6px 14px;border-radius:4px;font-size:10px;color:var(--amber);letter-spacing:0.2em;margin-bottom:24px}
.isl-title{font-family:var(--ff-display);font-size:clamp(36px,5vw,56px);line-height:1.05;letter-spacing:0.02em;margin-bottom:20px}
.isl-title span{color:var(--amber)}
.isl-text{font-size:13px;color:var(--dim);line-height:1.9;margin-bottom:24px}
.isl-tags{display:flex;flex-wrap:wrap;gap:8px}
.isl-tag{font-size:10px;padding:5px 12px;border-radius:3px;border:1px solid var(--border);color:var(--dim);letter-spacing:0.1em}
.isl-letters{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.isl-letter{aspect-ratio:1;border-radius:6px;border:1px solid var(--border);background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:var(--ff-display);font-size:18px;color:var(--dim);transition:all 0.2s;cursor:default}
.isl-letter:hover{border-color:var(--border2);color:var(--cyan);background:rgba(0,212,255,0.05)}

.cta-section{padding:140px 40px;text-align:center;position:relative;overflow:hidden}
.cta-section::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(0,212,255,0.07) 0%,transparent 70%);pointer-events:none}
.cta-title{font-family:var(--ff-display);font-size:clamp(48px,8vw,96px);line-height:0.95;letter-spacing:0.02em;margin-bottom:24px;position:relative;z-index:1}
.cta-title span{color:var(--cyan)}
.cta-sub{font-size:13px;color:var(--dim);margin-bottom:40px;letter-spacing:0.05em;position:relative;z-index:1}
.cta-btns{display:flex;gap:12px;justify-content:center;position:relative;z-index:1;flex-wrap:wrap}

.footer{border-top:1px solid var(--border);padding:40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.footer-logo{font-family:var(--ff-display);font-size:22px;color:var(--dim);letter-spacing:0.06em}
.footer-text{font-size:11px;color:var(--muted);letter-spacing:0.08em}
.footer-links{display:flex;gap:20px}
.footer-link{font-size:11px;color:var(--dim);text-decoration:none;letter-spacing:0.08em;cursor:pointer;transition:color 0.2s}
.footer-link:hover{color:var(--cyan)}

.app-wrapper{padding-top:64px;min-height:100vh}
.app-page-header{padding:32px 40px 0;border-bottom:1px solid var(--border);background:var(--bg2)}
.app-page-title{font-family:var(--ff-display);font-size:48px;color:var(--cyan);letter-spacing:0.04em;margin-bottom:4px}
.app-page-sub{font-size:12px;color:var(--dim);letter-spacing:0.08em;padding-bottom:20px}

@keyframes fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fade-up 0.7s ease both}
.fade-up-1{animation-delay:0.1s}.fade-up-2{animation-delay:0.2s}.fade-up-3{animation-delay:0.35s}

@media(max-width:900px){
  .features-grid{grid-template-columns:1fr}
  .stats{grid-template-columns:1fr 1fr;gap:24px}
  .stat{border-right:none;border-bottom:1px solid var(--border);padding:20px 0}
  .how-grid,.isl-inner{grid-template-columns:1fr}
  .nav-links{display:none}
}
`;

const FEATURES = [
  { num:"01", icon:"✋", name:"GESTURE RECOGNITION", desc:"Real-time hand tracking using MediaPipe. Detects 21 landmarks per frame and classifies signs at 6fps. Works offline after training.", tag:"MEDIAPIPE + CV", accent:"#00d4ff", page:"gesture" },
  { num:"02", icon:"↔", name:"TWO-WAY TRANSLATION", desc:"Sign → text → speech and speech → sign. Browser Speech API plus an LLM grammar layer that understands sign language structure.", tag:"WHISPER + LLM", accent:"#a78bfa", page:"translate" },
  { num:"03", icon:"🎯", name:"LEARNING & PRACTICE", desc:"DTW pose scoring compares your signs against references. Per-finger feedback shows exactly what's wrong. Streaks and audio cues keep you going.", tag:"DTW SCORING", accent:"#ffb74d", page:"practice" },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function Landing({ onNavigate }) {
  return (
    <>
      <section className="hero">
        <div className="hero-eyebrow fade-up">Breaking the silence barrier</div>
        <h1 className="hero-title fade-up fade-up-1">
          <span className="line1">SIGN</span>
          <span className="line2">LANGUAGE</span>
          <span className="line3">AI</span>
        </h1>
        <p className="hero-sub fade-up fade-up-2">
          Real-time gesture recognition, two-way translation, and AI-powered practice — built for the <strong>deaf community</strong> in India and beyond.
        </p>
        <div className="hero-btns fade-up fade-up-3">
          <button className="hero-btn-primary" onClick={() => onNavigate("gesture")}>▶ Launch App</button>
          <button className="hero-btn-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}>See Features ↓</button>
        </div>
        <div className="hero-scroll"><div className="hero-scroll-line" />SCROLL</div>
      </section>

      <div className="stats">
        {[{num:"21",label:"Landmarks tracked"},{num:"6fps",label:"Detection speed"},{num:"A–Z",label:"ISL + ASL signs"},{num:"3",label:"Phases complete"}].map((s,i) => (
          <div key={i} className="stat">
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="features" id="features">
        <div className="section-label">What it does</div>
        <h2 className="features-title">THREE PHASES.<br /><span>ONE MISSION.</span></h2>
        <div className="features-grid">
          {FEATURES.map((f,i) => (
            <div key={i} className="feature-card" style={{"--accent":f.accent}} onClick={() => onNavigate(f.page)}>
              <div className="feature-num">{f.num}</div>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-name">{f.name}</div>
              <div className="feature-desc">{f.desc}</div>
              <div className="feature-tag">{f.tag}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="how">
        <div className="section-label">How it works</div>
        <div className="how-grid">
          <div className="how-steps">
            {[
              {title:"SHOW YOUR HAND",desc:"Open your camera. MediaPipe detects 21 hand landmarks in real-time, normalised relative to your wrist so position doesn't matter."},
              {title:"AI CLASSIFIES THE SIGN",desc:"A lightweight MLP classifier trained on your own samples predicts the sign with a confidence score. Train it in minutes."},
              {title:"TRANSLATE BOTH WAYS",desc:"Signed letters buffer into words. An LLM cleans the grammar. Speech input converts to sign gloss and animates letter by letter."},
              {title:"PRACTICE & IMPROVE",desc:"DTW scoring compares your pose against a reference frame. Each finger gets individual feedback. Audio cues reward good signs."},
            ].map((s,i) => (
              <div key={i} className="how-step">
                <div className="step-num">0{i+1}</div>
                <div><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div></div>
              </div>
            ))}
          </div>
          <div className="how-visual">
            <div className="visual-hand">✋</div>
            <div className="visual-label">A</div>
            <div className="visual-conf">94% CONFIDENCE</div>
          </div>
        </div>
      </section>

      <section className="isl-section">
        <div className="isl-inner">
          <div>
            <div className="isl-badge">🇮🇳 Made for India</div>
            <h2 className="isl-title">ISL FIRST.<br /><span>UNDERSERVED</span><br />NO MORE.</h2>
            <p className="isl-text">Indian Sign Language has ~5 million users but almost no AI tooling. The INCLUDE dataset from IIT Bombay gives us a starting point. This app puts ISL on equal footing with ASL.</p>
            <div className="isl-tags">
              {["INCLUDE Dataset","ISLRTC Corpus","ISL Grammar Layer","Regional Variants","Community Data"].map(t => <div key={t} className="isl-tag">{t}</div>)}
            </div>
          </div>
          <div className="isl-letters">
            {LETTERS.map(l => <div key={l} className="isl-letter">{l}</div>)}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="cta-title">START<br /><span>SIGNING</span><br />NOW</h2>
        <p className="cta-sub">Camera · Microphone · No account needed</p>
        <div className="cta-btns">
          <button className="hero-btn-primary" onClick={() => onNavigate("gesture")}>✋ Gesture Recognition</button>
          <button className="hero-btn-ghost" onClick={() => onNavigate("translate")}>↔ Translation</button>
          <button className="hero-btn-ghost" onClick={() => onNavigate("practice")}>🎯 Practice Mode</button>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-logo">SIGNAI</div>
        <div className="footer-text">Built for the deaf community · ISL + ASL · Open source</div>
        <div className="footer-links">
          <span className="footer-link" onClick={() => onNavigate("gesture")}>App</span>
          <span className="footer-link" onClick={() => document.getElementById('features')?.scrollIntoView({behavior:'smooth'})}>Features</span>
          <span className="footer-link">GitHub</span>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState("home");

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = G;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const NAV = [
    {key:"home",label:"Home"},
    {key:"gesture",label:"Phase 1 · Gesture"},
    {key:"translate",label:"Phase 2 · Translate"},
    {key:"practice",label:"Phase 3 · Practice"},
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-logo" onClick={() => setPage("home")}>SIGN<em>AI</em></div>
        <div className="nav-links">
          {NAV.map(n => (
            <button key={n.key} className={`nav-link ${page===n.key?"active":""}`} onClick={() => setPage(n.key)}>{n.label}</button>
          ))}
        </div>
        <button className="nav-cta" onClick={() => setPage("gesture")}>Launch App →</button>
      </nav>

      <div className="app-wrapper">
        {page==="home" && <Landing onNavigate={setPage} />}
        {page==="gesture" && (
          <div>
            <div className="app-page-header">
              <div className="app-page-title">GESTURE</div>
              <div className="app-page-sub">Phase 1 · Real-time hand sign recognition via camera</div>
            </div>
            <GestureApp />
          </div>
        )}
        {page==="translate" && (
          <div>
            <div className="app-page-header">
              <div className="app-page-title">TRANSLATE</div>
              <div className="app-page-sub">Phase 2 · Sign → text → speech and speech → sign</div>
            </div>
            <TranslationApp />
          </div>
        )}
        {page==="practice" && (
          <div>
            <div className="app-page-header">
              <div className="app-page-title">PRACTICE</div>
              <div className="app-page-sub">Phase 3 · AI-powered learning with pose scoring and feedback</div>
            </div>
            <PracticeApp />
          </div>
        )}
      </div>
    </>
  );
}