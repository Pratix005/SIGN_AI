import { useState, useRef, useEffect } from "react";

const LLM_API = "http://localhost:8080";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@300;400;500;650&family=Fira+Code:wght@400;500&display=swap');

.ai-app {
  background: transparent;
  color: #e4e4e7;
  font-family: 'Inter', sans-serif;
  border-radius: 16px;
  overflow: hidden;
}

.ai-tabs {
  display: flex;
  background: rgba(15, 15, 25, 0.4);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.ai-tab {
  flex: 1;
  padding: 12px 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #71717a;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-tab.active {
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.08);
  box-shadow: inset 0 0 12px rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.15);
}

.ai-tab:hover:not(.active) {
  color: #a1a1aa;
  background: rgba(255, 255, 255, 0.02);
}

.ai-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 8px 4px;
}

.chat-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  min-height: 320px;
  max-height: 480px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(9, 9, 11, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

.chat-history::-webkit-scrollbar {
  width: 4px;
}
.chat-history::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.2);
  border-radius: 2px;
}

.chat-msg {
  display: flex;
  gap: 14px;
  animation: msg-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes msg-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.chat-msg.user {
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chat-avatar.ai {
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}

.chat-avatar.user {
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

.chat-bubble {
  max-width: 75%;
  padding: 12px 18px;
  font-size: 13.5px;
  line-height: 1.65;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.chat-bubble.ai {
  background: rgba(22, 22, 34, 0.65);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.1);
  color: #e4e4e7;
  border-radius: 4px 16px 16px 16px;
}

.chat-bubble.user {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8));
  color: #ffffff;
  border-radius: 16px 4px 16px 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.chat-input-row {
  display: flex;
  gap: 12px;
}

.chat-input {
  flex: 1;
  background: rgba(15, 15, 25, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 12px;
  padding: 14px 18px;
  color: #f4f4f5;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  outline: none;
  transition: all 0.3s ease;
}

.chat-input:focus {
  border-color: rgba(139, 92, 246, 0.45);
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.08);
}

.chat-input::placeholder {
  color: #52525b;
}

.chat-send {
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border: none;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.chat-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
  opacity: 0.95;
}

.chat-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.quick-q {
  font-size: 11px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  background: rgba(139, 92, 246, 0.02);
  color: #a78bfa;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-q:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.08);
  color: #c084fc;
  transform: scale(1.02);
}

.lesson-controls {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 28px;
  align-items: flex-end;
  background: rgba(15, 15, 25, 0.3);
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.02);
}

.lesson-select-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lesson-select-label {
  font-size: 10px;
  font-weight: 700;
  color: #71717a;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.lesson-select {
  background: rgba(10, 10, 15, 0.7);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 10px;
  padding: 11px 16px;
  color: #e4e4e7;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.lesson-select:focus {
  border-color: rgba(139, 92, 246, 0.4);
}

.btn-generate {
  padding: 12px 28px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border: none;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 12.5px;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.btn-generate:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
}

.btn-generate:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.lesson-card {
  background: rgba(12, 12, 18, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.lesson-header {
  padding: 26px 30px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  background: linear-gradient(135deg, rgba(27, 18, 48, 0.5), rgba(12, 12, 18, 0.5));
}

.lesson-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #f4f4f5;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.lesson-meta {
  display: flex;
  gap: 18px;
}

.lesson-meta-item {
  font-size: 12.5px;
  color: #71717a;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lesson-meta-item span {
  color: #a78bfa;
  font-weight: 600;
}

.lesson-goal {
  margin-top: 14px;
  font-size: 13px;
  color: #a1a1aa;
  line-height: 1.6;
  padding: 12px 16px;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 10px;
  border-left: 3px solid #8b5cf6;
}

.lesson-section {
  padding: 22px 30px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.06);
}

.lesson-section-title {
  font-size: 10px;
  font-weight: 800;
  color: #52525b;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.warmup-box {
  background: rgba(245, 158, 11, 0.03);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid rgba(245, 158, 11, 0.15);
}

.warmup-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 14.5px;
  color: #fbbf24;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.warmup-inst {
  font-size: 12.5px;
  color: #a1a1aa;
  line-height: 1.7;
  white-space: pre-line;
}

.signs-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sign-row {
  display: flex;
  gap: 18px;
  align-items: center;
  padding: 16px 20px;
  background: rgba(15, 15, 25, 0.45);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.05);
  transition: all 0.25s ease;
}

.sign-row:hover {
  border-color: rgba(139, 92, 246, 0.2);
  background: rgba(15, 15, 25, 0.7);
  transform: translateX(2px);
}

.sign-badge {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px;
  font-weight: 850;
  color: #a78bfa;
  min-width: 56px;
  height: 56px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
  text-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
}

.sign-info {
  flex: 1;
}

.sign-how {
  font-size: 13px;
  color: #e4e4e7;
  line-height: 1.6;
  margin-bottom: 4px;
}

.sign-tip {
  font-size: 11.5px;
  color: #f59e0b;
}

.sign-tip::before {
  content: '💡 ';
}

.sign-reps {
  font-size: 10.5px;
  font-weight: 700;
  color: #71717a;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 6px;
}

.challenge-box {
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 18px;
}

.challenge-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 14.5px;
  color: #818cf8;
  margin-bottom: 8px;
}

.challenge-desc {
  font-size: 12.5px;
  color: #a1a1aa;
  line-height: 1.6;
}

.challenge-target {
  font-size: 11.5px;
  font-weight: 600;
  color: #a5b4fc;
  margin-top: 10px;
  display: inline-block;
  background: rgba(99, 102, 241, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
}

.motivation-box {
  padding: 22px 30px;
  text-align: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-style: italic;
  font-weight: 500;
  font-size: 14px;
  color: #71717a;
  background: rgba(255, 255, 255, 0.01);
}

.coach-input-section {
  background: rgba(12, 12, 18, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.coach-input-title {
  font-size: 10px;
  font-weight: 800;
  color: #52525b;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.score-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.score-input-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(15, 15, 25, 0.5);
  border: 1px solid rgba(139, 92, 246, 0.08);
  border-radius: 10px;
  padding: 12px 8px;
  transition: all 0.25s ease;
}

.score-input-wrap:focus-within {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.05);
}

.score-input-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: #a78bfa;
}

.score-input {
  width: 54px;
  background: transparent;
  border: none;
  color: #f4f4f5;
  font-family: 'Fira Code', monospace;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  text-align: center;
  border-bottom: 1.5px dashed rgba(255, 255, 255, 0.15);
  padding-bottom: 2px;
  transition: border-color 0.2s;
}

.score-input:focus {
  border-bottom-color: #8b5cf6;
}

.score-input::-webkit-outer-spin-button,
.score-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.btn-add-sign {
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: transparent;
  color: #a78bfa;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-sign:hover {
  border-color: rgba(139, 92, 246, 0.45);
  background: rgba(139, 92, 246, 0.06);
}

.btn-analyse {
  padding: 12px 28px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.btn-analyse:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.btn-analyse:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.coach-result {
  background: rgba(12, 12, 18, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  animation: msg-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.coach-result-header {
  padding: 22px 28px;
  background: rgba(16, 185, 129, 0.04);
  border-bottom: 1px solid rgba(16, 185, 129, 0.1);
}

.coach-overall {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 4px;
}

.coach-avg {
  font-size: 12.5px;
  color: #71717a;
}

.coach-section {
  padding: 18px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.coach-section-label {
  font-size: 9.5px;
  font-weight: 800;
  color: #52525b;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.coach-advice {
  font-size: 13.5px;
  color: #d4d4d8;
  line-height: 1.75;
}

.coach-tips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.coach-tip {
  display: flex;
  gap: 12px;
  font-size: 12.5px;
  color: #a1a1aa;
  line-height: 1.6;
}

.coach-tip::before {
  content: '⚡';
  color: #10b981;
  flex-shrink: 0;
}

.focus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.focus-tag {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.05);
}

.coach-encouragement {
  padding: 22px 28px;
  text-align: center;
  font-size: 14.5px;
  color: #10b981;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-style: italic;
  font-weight: 500;
  background: rgba(16, 185, 129, 0.01);
}

.sec-label {
  font-size: 10px;
  font-weight: 800;
  color: #52525b;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sec-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(139, 92, 246, 0.08);
}

.loading-pulse {
  display: flex;
  gap: 6px;
  padding: 12px 0;
}

.loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a78bfa;
  animation: ldot 1.2s ease-in-out infinite;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes ldot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.15); }
}
`;

const QUICK_QUESTIONS = [
  "How do I sign HELLO in ISL?",
  "Difference between ISL and ASL?",
  "How do I fingerspell my name?",
  "Most common ISL words?",
  "How do I sign numbers 1-10?",
  "Tips for improving accuracy?",
];

function TutorTab() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your SignAI tutor. Ask me anything about ISL or ASL — how to form signs, grammar rules, or practice tips." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch(`${LLM_API}/tutor`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.response }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "⚠️ LLM API not reachable. Start it on port 8003." }]);
    }
    setLoading(false);
  };

  return (
    <div className="ai-body">
      <div className="sec-label">Quick questions</div>
      <div className="quick-questions">
        {QUICK_QUESTIONS.map((q, i) => <button key={i} className="quick-q" onClick={() => send(q)}>{q}</button>)}
      </div>
      <div className="sec-label">Chat</div>
      <div className="chat-history">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className={`chat-avatar ${m.role === "assistant" ? "ai" : "user"}`}>{m.role === "assistant" ? "🤖" : "👤"}</div>
            <div className={`chat-bubble ${m.role === "assistant" ? "ai" : "user"}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg">
            <div className="chat-avatar ai">🤖</div>
            <div className="chat-bubble ai"><div className="loading-pulse"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about any sign, grammar rule, or tip..." />
        <button className="chat-send" onClick={() => send()} disabled={loading || !input.trim()}>Send →</button>
      </div>
    </div>
  );
}

function LessonTab() {
  const [language, setLanguage] = useState("ISL");
  const [level, setLevel] = useState("beginner");
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true); setLesson(null);
    try {
      const res = await fetch(`${LLM_API}/lesson`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, level }),
      });
      const data = await res.json();
      setLesson(data.lesson);
    } catch { alert("LLM API not reachable. Start it on port 8003."); }
    setLoading(false);
  };

  return (
    <div className="ai-body">
      <div className="lesson-controls">
        <div className="lesson-select-wrap">
          <div className="lesson-select-label">Language</div>
          <select className="lesson-select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="ISL">ISL — Indian Sign Language</option>
            <option value="ASL">ASL — American Sign Language</option>
          </select>
        </div>
        <div className="lesson-select-wrap">
          <div className="lesson-select-label">Level</div>
          <select className="lesson-select" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <button className="btn-generate" onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "⚡ Generate Lesson"}
        </button>
      </div>
      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "#4a6070" }}><div className="loading-pulse" style={{ justifyContent: "center", marginBottom: 12 }}><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div><div style={{ fontSize: 12, letterSpacing: "0.1em" }}>Generating your lesson...</div></div>}
      {lesson && (
        <div className="lesson-card">
          <div className="lesson-header">
            <div className="lesson-title">{lesson.title}</div>
            <div className="lesson-meta">
              <div className="lesson-meta-item">⏱ <span>{lesson.duration} min</span></div>
              <div className="lesson-meta-item">📚 <span>{level}</span></div>
              <div className="lesson-meta-item">🌐 <span>{language}</span></div>
            </div>
            <div className="lesson-goal">{lesson.goal}</div>
          </div>
          {lesson.warmup && <div className="lesson-section"><div className="lesson-section-title">Warm up</div><div className="warmup-box"><div className="warmup-name">{lesson.warmup.name} · {lesson.warmup.duration} min</div><div className="warmup-inst">{lesson.warmup.instructions}</div></div></div>}
          {lesson.signs?.length > 0 && <div className="lesson-section"><div className="lesson-section-title">Today's signs · {lesson.signs.length}</div><div className="signs-grid">{lesson.signs.map((s, i) => <div key={i} className="sign-row"><div className="sign-badge">{s.sign}</div><div className="sign-info"><div className="sign-how">{s.how_to}</div><div className="sign-tip">{s.tip}</div><div className="sign-reps">Practice {s.practice_reps}× reps</div></div></div>)}</div></div>}
          {lesson.challenge && <div className="lesson-section"><div className="lesson-section-title">Challenge</div><div className="challenge-box"><div className="challenge-name">🎯 {lesson.challenge.name}</div><div className="challenge-desc">{lesson.challenge.description}</div><div className="challenge-target">Target: {lesson.challenge.target_score}%</div></div></div>}
          {lesson.motivation && <div className="motivation-box">"{lesson.motivation}"</div>}
        </div>
      )}
    </div>
  );
}

function CoachTab() {
  const [signs, setSigns] = useState(["A", "B", "C", "D", "E"].map(s => ({ sign: s, score: "" })));
  const [newSign, setNewSign] = useState("");
  const [streak, setStreak] = useState(0);
  const [language, setLanguage] = useState("ISL");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const addSign = () => { if (!newSign.trim()) return; setSigns(p => [...p, { sign: newSign.trim().toUpperCase(), score: "" }]); setNewSign(""); };
  const updateScore = (i, val) => setSigns(p => p.map((s, idx) => idx === i ? { ...s, score: val } : s));

  const analyse = async () => {
    const history = signs.filter(s => s.score !== "").map(s => ({ sign: s.sign, score: parseInt(s.score), grade: parseInt(s.score) >= 85 ? "excellent" : parseInt(s.score) >= 70 ? "good" : parseInt(s.score) >= 50 ? "fair" : "poor" }));
    if (!history.length) { alert("Enter at least one score first."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${LLM_API}/coach`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, score_history: history, streak }),
      });
      const data = await res.json();
      setResult(data);
    } catch { alert("LLM API not reachable. Start it on port 8003."); }
    setLoading(false);
  };

  return (
    <div className="ai-body">
      <div className="coach-input-section">
        <div className="coach-input-title">Enter your recent practice scores</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div className="lesson-select-wrap"><div className="lesson-select-label">Language</div><select className="lesson-select" value={language} onChange={e => setLanguage(e.target.value)}><option value="ISL">ISL</option><option value="ASL">ASL</option></select></div>
          <div className="lesson-select-wrap"><div className="lesson-select-label">Streak</div><input type="number" min="0" value={streak} onChange={e => setStreak(parseInt(e.target.value) || 0)} style={{ width: 70, background: "#0d1424", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, padding: "10px 12px", color: "#c8d8e8", fontFamily: "'DM Mono',monospace", fontSize: 13, outline: "none" }} /></div>
        </div>
        <div className="score-inputs">
          {signs.map((s, i) => (
            <div key={i} className="score-input-wrap">
              <div className="score-input-label">{s.sign}</div>
              <input type="number" min="0" max="100" className="score-input" placeholder="—" value={s.score} onChange={e => updateScore(i, e.target.value)} />
              <span style={{ fontSize: 10, color: "#2a3a4a" }}>/100</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input placeholder="Add sign (e.g. F)" value={newSign} onChange={e => setNewSign(e.target.value)} onKeyDown={e => e.key === "Enter" && addSign()} style={{ width: 120, background: "#0d1424", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "#c8d8e8", fontFamily: "'DM Mono',monospace", fontSize: 12, outline: "none" }} />
          <button className="btn-add-sign" onClick={addSign}>+ Add</button>
          <button className="btn-analyse" onClick={analyse} disabled={loading} style={{ marginLeft: "auto" }}>{loading ? "Analysing..." : "🧠 Get Coaching"}</button>
        </div>
      </div>
      {loading && <div style={{ textAlign: "center", padding: "40px 0", color: "#4a6070" }}><div className="loading-pulse" style={{ justifyContent: "center", marginBottom: 12 }}><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div><div style={{ fontSize: 12, letterSpacing: "0.1em" }}>Analysing your performance...</div></div>}
      {result && (
        <div className="coach-result">
          <div className="coach-result-header"><div className="coach-overall">{result.coach.overall}</div><div className="coach-avg">Average: {result.stats.average}/100</div></div>
          <div className="coach-section"><div className="coach-section-label">Coaching advice</div><div className="coach-advice">{result.coach.advice}</div></div>
          {result.coach.focus_signs?.length > 0 && <div className="coach-section"><div className="coach-section-label">Practice these most</div><div className="focus-tags">{result.coach.focus_signs.map((s, i) => <div key={i} className="focus-tag">{s}</div>)}</div></div>}
          {result.coach.tips?.length > 0 && <div className="coach-section"><div className="coach-section-label">Tips</div><div className="coach-tips">{result.coach.tips.map((t, i) => <div key={i} className="coach-tip">{t}</div>)}</div></div>}
          <div className="coach-encouragement">{result.coach.encouragement}</div>
        </div>
      )}
    </div>
  );
}

export default function AIApp() {
  const [tab, setTab] = useState("tutor");
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return (
    <div className="ai-app">
      <div className="ai-tabs">
        <button className={`ai-tab ${tab === "tutor" ? "active" : ""}`} onClick={() => setTab("tutor")}>🤖 AI Tutor</button>
        <button className={`ai-tab ${tab === "lesson" ? "active" : ""}`} onClick={() => setTab("lesson")}>📅 Lesson Generator</button>
        <button className={`ai-tab ${tab === "coach" ? "active" : ""}`} onClick={() => setTab("coach")}>📊 Sign Coach</button>
      </div>
      {tab === "tutor" && <TutorTab />}
      {tab === "lesson" && <LessonTab />}
      {tab === "coach" && <CoachTab />}
    </div>
  );
}