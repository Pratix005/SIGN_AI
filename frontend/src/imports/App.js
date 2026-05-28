import { useState } from 'react';
import GestureApp from './components/GestureApp';
import TranslationApp from './components/TranslationApp';
import PracticeApp from './components/PracticeApp';

const navCss = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Mono:wght@400;500&display=swap');
  body { margin: 0; background: #04070f; }
  .phase-nav { display:flex; align-items:center; gap:0; background:#04070f; border-bottom:1px solid rgba(0,212,255,0.1); padding:0 24px; position:sticky; top:0; z-index:100; }
  .phase-nav-logo { font-family:'Syne',sans-serif; font-weight:800; font-size:14px; color:rgba(0,212,255,0.4); margin-right:20px; letter-spacing:-0.01em; }
  .phase-nav-btn { padding:14px 18px; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; background:transparent; border:none; border-bottom:2px solid transparent; color:#2a3a4a; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .phase-nav-btn.active { color:#00d4ff; border-bottom-color:#00d4ff; }
  .phase-nav-btn:hover:not(.active) { color:#4a6070; }
`;

export default function App() {
  const [phase, setPhase] = useState(1);
  return (
    <>
      <style>{navCss}</style>
      <div className="phase-nav">
        <div className="phase-nav-logo">SignAI</div>
        <button className={`phase-nav-btn ${phase === 1 ? 'active' : ''}`} onClick={() => setPhase(1)}>Phase 1 · Gesture</button>
        <button className={`phase-nav-btn ${phase === 2 ? 'active' : ''}`} onClick={() => setPhase(2)}>Phase 2 · Translation</button>
        <button className={`phase-nav-btn ${phase === 3 ? 'active' : ''}`} onClick={() => setPhase(3)}>Phase 3 · Practice</button>
      </div>
      {phase === 1 && <GestureApp />}
      {phase === 2 && <TranslationApp />}
      {phase === 3 && <PracticeApp />}
    </>
  );
}