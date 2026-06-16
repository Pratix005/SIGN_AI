import { useState, useRef, useEffect } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { 
  Brain, 
  MessageSquare, 
  BookOpen, 
  GraduationCap, 
  Flame, 
  Target, 
  Sparkles, 
  Plus, 
  Send, 
  Trash2,
  Calendar,
  Clock,
  Zap
} from "lucide-react";

const LLM_API = "https://signai-translation.onrender.com";

const QUICK_QUESTIONS = [
  "How do I sign HELLO in ISL?",
  "Difference between ISL and ASL?",
  "How do I fingerspell my name?",
  "Most common ISL words?",
  "How do I sign numbers 1-10?",
  "Tips for improving accuracy?",
];

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface Lesson {
  title: string;
  duration: string;
  goal: string;
  warmup?: {
    name: string;
    instructions: string;
    duration: string;
  };
  signs?: Array<{
    sign: string;
    category: string;
    how_to: string;
    tip: string;
    practice_reps: number;
  }>;
  challenge?: {
    name: string;
    description: string;
    target_score: number;
  };
  motivation?: string;
}

interface CoachData {
  coach: {
    overall: string;
    advice: string;
    focus_signs: string[];
    tips: string[];
    encouragement: string;
  };
  stats: {
    average: number;
    weak: string[];
    strong: string[];
  };
}

export default function AiModels() {
  const [activeTab, setActiveTab] = useState<"tutor" | "lesson" | "coach">("tutor");

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-background">
      <WorkspaceHeader 
        title="SignAI"
        subtitle="AI Companion & Coach"
        badge="Copilot"
      />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex bg-card/40 backdrop-blur-md p-1.5 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("tutor")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold font-space uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "tutor"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Tutor
          </button>
          <button
            onClick={() => setActiveTab("lesson")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold font-space uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "lesson"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Lesson Generator
          </button>
          <button
            onClick={() => setActiveTab("coach")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold font-space uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "coach"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Sign Coach
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 min-h-[500px]">
          {activeTab === "tutor" && <TutorTab />}
          {activeTab === "lesson" && <LessonTab />}
          {activeTab === "coach" && <CoachTab />}
        </div>
      </main>
    </div>
  );
}

// ── Tutor Chat Component ─────────────────────────────────────────────────────
function TutorTab() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your SignAI tutor. Ask me anything about ISL or ASL — how to form signs, grammar rules, or practice tips." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch(`${LLM_API}/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant" as const, content: data.response }]);
    } catch {
      setMessages([...newMessages, { role: "assistant" as const, content: "⚠️ LLM API not reachable. Please verify that the LLM backend is running on port 8003." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Quick Questions */}
      <div>
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-3">Quick Suggestions</span>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => send(q)}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 transition-all cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat History Panel */}
      <div className="flex flex-col gap-4 p-4 min-h-[380px] max-h-[500px] overflow-y-auto bg-card/30 rounded-xl border border-border/80">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 items-start max-w-[80%] ${m.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-space shadow-md flex-shrink-0 ${
              m.role === "assistant" 
                ? "bg-primary/10 border border-primary/30 text-primary" 
                : "bg-secondary border border-border text-foreground"
            }`}>
              {m.role === "assistant" ? "🤖" : "👤"}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
              m.role === "assistant"
                ? "bg-card border border-border rounded-tl-sm text-foreground"
                : "bg-primary text-primary-foreground rounded-tr-sm"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 items-start self-start max-w-[80%]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-space bg-primary/10 border border-primary/30 text-primary">
              🤖
            </div>
            <div className="p-4 bg-card border border-border rounded-2xl rounded-tl-sm text-foreground flex items-center gap-1.5 py-3.5">
              <div className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat Input Row */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about fingerspelling, Indian Sign Language structure, or coaching tips..."
          className="flex-1 bg-card/60 backdrop-blur-sm border border-border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-5 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 shrink-0 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}

// ── Lesson Generator Component ───────────────────────────────────────────────
function LessonTab() {
  const [language, setLanguage] = useState("ISL");
  const [level, setLevel] = useState("beginner");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setLesson(null);
    try {
      const res = await fetch(`${LLM_API}/lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, level }),
      });
      const data = await res.json();
      setLesson(data.lesson);
    } catch {
      alert("LLM API not reachable. Please verify the LLM backend is active on port 8003.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end bg-card/30 p-5 border border-border rounded-xl">
        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 cursor-pointer"
          >
            <option value="ISL">ISL — Indian Sign Language</option>
            <option value="ASL">ASL — American Sign Language</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 cursor-pointer"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="px-6 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-primary/10 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? "Generating..." : "Generate Lesson"}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="flex gap-2">
            <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-muted-foreground font-medium tracking-wide">AI companion is designing your curriculum...</span>
        </div>
      )}

      {/* Lesson Details Card */}
      {lesson && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-violet-900/10 via-primary/5 to-transparent border-b border-border">
            <h3 className="text-2xl font-space font-bold mb-2">{lesson.title}</h3>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> ⏱ <span>{lesson.duration} min</span></div>
              <span>•</span>
              <span className="text-primary">{level.toUpperCase()}</span>
              <span>•</span>
              <span className="text-emerald-400">{language}</span>
            </div>
            {lesson.goal && (
              <div className="mt-4 p-3.5 bg-primary/5 border-l-4 border-primary rounded-r-lg text-sm text-foreground/90 leading-relaxed font-medium">
                {lesson.goal}
              </div>
            )}
          </div>

          {/* Warm up Section */}
          {lesson.warmup && (
            <div className="p-6 border-b border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-3">Warm Up</span>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <span className="font-space font-bold text-sm text-amber-400 flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  {lesson.warmup.name} ({lesson.warmup.duration}m)
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{lesson.warmup.instructions}</p>
              </div>
            </div>
          )}

          {/* Signs Grid */}
          {lesson.signs && lesson.signs.length > 0 && (
            <div className="p-6 border-b border-border flex flex-col gap-3">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-1">Today's Signs ({lesson.signs.length})</span>
              <div className="grid grid-cols-1 gap-3">
                {lesson.signs.map((s, i) => (
                  <div key={i} className="flex gap-4 items-center p-4 bg-card/60 border border-border/80 rounded-xl hover:border-primary/20 transition-all hover:bg-card/90">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-space font-bold text-xl flex items-center justify-center shadow-inner shrink-0">
                      {s.sign}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground/90 mb-1">{s.how_to}</p>
                      {s.tip && <p className="text-xs text-amber-400 leading-normal flex items-start gap-1 font-medium">💡 {s.tip}</p>}
                      <span className="text-[9px] font-mono text-muted-foreground font-bold tracking-wide uppercase mt-2 block">Practice reps: {s.practice_reps}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenge Section */}
          {lesson.challenge && (
            <div className="p-6 border-b border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-3">Daily Challenge</span>
              <div className="p-4 bg-primary/5 border border-primary/25 rounded-xl">
                <span className="font-space font-bold text-sm text-primary flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  🎯 {lesson.challenge.name}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{lesson.challenge.description}</p>
                <span className="text-[10px] font-semibold mt-3 inline-block bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20">
                  Target Accuracy Score: {lesson.challenge.target_score}%
                </span>
              </div>
            </div>
          )}

          {/* Motivation Footer */}
          {lesson.motivation && (
            <div className="p-6 text-center text-xs italic text-muted-foreground bg-card/10">
              "{lesson.motivation}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sign Coach Component ─────────────────────────────────────────────────────
interface ScoreInput {
  sign: string;
  score: string;
}

function CoachTab() {
  const [signs, setSigns] = useState<ScoreInput[]>([
    { sign: "A", score: "" },
    { sign: "B", score: "" },
    { sign: "HELLO", score: "" },
    { sign: "THANK YOU", score: "" },
    { sign: "YES", score: "" }
  ]);
  const [newSign, setNewSign] = useState("");
  const [streak, setStreak] = useState(0);
  const [language, setLanguage] = useState("ISL");
  const [result, setResult] = useState<CoachData | null>(null);
  const [loading, setLoading] = useState(false);

  const addSign = () => {
    if (!newSign.trim()) return;
    setSigns(p => [...p, { sign: newSign.trim().toUpperCase(), score: "" }]);
    setNewSign("");
  };

  const removeSign = (index: number) => {
    setSigns(p => p.filter((_, idx) => idx !== index));
  };

  const updateScore = (index: number, val: string) => {
    setSigns(p => p.map((s, idx) => idx === index ? { ...s, score: val } : s));
  };

  const analyse = async () => {
    const history = signs
      .filter(s => s.score !== "")
      .map(s => ({
        sign: s.sign,
        score: parseInt(s.score),
        grade: parseInt(s.score) >= 85 ? "excellent" : parseInt(s.score) >= 70 ? "good" : parseInt(s.score) >= 50 ? "fair" : "poor"
      }));

    if (!history.length) {
      alert("Please enter at least one score.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${LLM_API}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, score_history: history, streak }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      alert("LLM API not reachable. Please verify the LLM backend is active on port 8003.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Coach Inputs Panel */}
      <div className="bg-card border border-border p-6 rounded-2xl flex flex-col gap-6">
        <div>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-4">Practice Analytics Settings</span>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px] flex flex-col gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="ISL">ISL</option>
                <option value="ASL">ASL</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Daily Streak</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={streak}
                  onChange={(e) => setStreak(parseInt(e.target.value) || 0)}
                  className="w-20 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 text-center font-mono"
                />
                <Flame className="w-5 h-5 text-orange-500 fill-current" />
              </div>
            </div>
          </div>
        </div>

        {/* Score Inputs Grid */}
        <div>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-3">Recent accuracy scores</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {signs.map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-between p-3 bg-background border border-border rounded-xl relative group">
                <button 
                  onClick={() => removeSign(i)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-space font-bold text-primary mb-2">{s.sign}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="—"
                    value={s.score}
                    onChange={(e) => updateScore(i, e.target.value)}
                    className="w-14 bg-card border border-border rounded px-1.5 py-1 text-xs text-center font-mono outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  />
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add custom signs controls */}
        <div className="flex flex-wrap gap-3 items-center border-t border-border pt-4">
          <input
            placeholder="Add custom sign (e.g. F)"
            value={newSign}
            onChange={(e) => setNewSign(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSign()}
            className="flex-1 min-w-[150px] bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/40"
          />
          <button
            onClick={addSign}
            className="px-4 py-2 border border-primary/20 text-primary hover:bg-primary/5 rounded-lg text-xs font-bold font-space uppercase transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Sign
          </button>
          <button
            onClick={analyse}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:opacity-40 flex items-center gap-2 shrink-0 ml-auto cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Brain className="w-4 h-4" />
            {loading ? "Analyzing..." : "Get Coaching"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="flex gap-2">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-muted-foreground font-medium tracking-wide">Analyzing accuracy metrics and compiling tips...</span>
        </div>
      )}

      {/* Result Panel */}
      {result && (
        <div className="bg-card border border-emerald-500/15 rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Header */}
          <div className="p-6 bg-emerald-500/5 border-b border-border flex justify-between items-center flex-wrap gap-4">
            <div>
              <h4 className="text-md font-space font-bold text-emerald-400 mb-1">{result.coach.overall}</h4>
              <p className="text-xs text-muted-foreground font-semibold">streak: {streak} days</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest block mb-1">Average Accuracy</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">{result.stats.average}%</span>
            </div>
          </div>

          {/* Advice */}
          <div className="p-6 border-b border-border">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-2">Coach Advice</span>
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">{result.coach.advice}</p>
          </div>

          {/* Weakness targets */}
          {result.coach.focus_signs && result.coach.focus_signs.length > 0 && (
            <div className="p-6 border-b border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-3">Recommended Focus Areas</span>
              <div className="flex flex-wrap gap-2">
                {result.coach.focus_signs.map((s, i) => (
                  <span key={i} className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 font-space font-extrabold text-sm shadow-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {result.coach.tips && result.coach.tips.length > 0 && (
            <div className="p-6 border-b border-border flex flex-col gap-3.5">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest block mb-1">Tips for improvement</span>
              <div className="flex flex-col gap-2.5">
                {result.coach.tips.map((t, i) => (
                  <div key={i} className="flex gap-2.5 items-start text-xs leading-relaxed text-muted-foreground">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 fill-emerald-400/10" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encouragement */}
          <div className="p-6 text-center text-sm font-space italic font-semibold text-emerald-400 bg-emerald-500/5">
            {result.coach.encouragement}
          </div>
        </div>
      )}
    </div>
  );
}
