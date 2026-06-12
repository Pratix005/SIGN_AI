import React, { useState } from 'react';
import LandingPage from '../imports/LandingPage';
import UnifiedDashboard from '../imports/UnifiedDashboard';
import GestureApp from '../imports/GestureApp';
import PracticeApp from '../imports/PracticeApp';
import TranslationApp from '../imports/TranslationApp';
// @ts-ignore
import AIApp from '../imports/AIApp';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';

type AppModule = 'home' | 'dashboard' | 'gesture' | 'practice' | 'translation' | 'ai';

export default function App() {
  const [activeModule, setActiveModule] = useState<AppModule>('home');

  return (
    <div className="relative min-h-screen w-full bg-[#09090b] text-zinc-50 overflow-x-hidden flex flex-col justify-between">
      
      {/* Immersive Background Ambient Blur Sources */}
      <div className="absolute top-[-15%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-zinc-800/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-lg shadow-lg shadow-violet-600/20">
            🤟
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              SIGN_AI
            </span>
            <span className="text-[10px] font-mono block text-violet-400 tracking-widest uppercase font-semibold">Engine Hub</span>
          </div>
        </div>

        {/* Premium Navigation Segment Controls */}
        <nav className="flex items-center gap-1 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800/60 shadow-inner">
          {(['home', 'dashboard', 'gesture', 'practice', 'translation', 'ai'] as AppModule[]).map((mod) => (
            <Button
              key={mod}
              variant="ghost"
              onClick={() => setActiveModule(mod)}
              className={`capitalize px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                activeModule === mod 
                  ? 'bg-violet-600 text-white shadow-md hover:bg-violet-500 hover:text-white' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {mod}
            </Button>
          ))}
        </nav>
      </header>

      {/* Main Core Section Layout */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex-grow z-10 flex flex-col">
        
        {/* Dynamic Context Header */}
        {activeModule !== 'home' && (
          <div className="w-full mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-zinc-900/60 to-transparent p-6 rounded-2xl border border-zinc-800/40 backdrop-blur-sm">
            <div>
              <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-1.5 px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-semibold">
                Live AI Translation System
              </Badge>
              <h1 className="font-heading font-extrabold text-2xl tracking-tight text-white capitalize">
                {activeModule === 'dashboard' ? 'Analytics Command Center' : `${activeModule} Workspace`}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800/80">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Backend Services Active
            </div>
          </div>
        )}

        {/* Dynamic Component Rendering Hub */}
        <div className="w-full flex-grow bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-4 md:p-6 shadow-2xl transition-all min-h-[620px]">
          {activeModule === 'home' && <LandingPage onNavigate={setActiveModule} />}
          {activeModule === 'dashboard' && <UnifiedDashboard />}
          {activeModule === 'gesture' && <GestureApp />}
          {activeModule === 'practice' && <PracticeApp />}
          {activeModule === 'translation' && <TranslationApp />}
          {activeModule === 'ai' && <AIApp />}
        </div>

      </main>

      {/* Real-Time Telemetry Status Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 border-t border-zinc-950 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 gap-4 z-10 font-mono">
        <div>&copy; 2026 SIGN_AI Laboratory. All rights reserved.</div>
        <div className="flex gap-6 text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-violet-400 font-semibold">WEBCAM:</span> <span className="text-white font-bold">30 FPS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-400 font-semibold">CONFIDENCE:</span> <span className="text-white font-bold">96.4%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
