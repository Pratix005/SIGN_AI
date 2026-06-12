"""
LLM Backend — Ollama powered
Run: uvicorn main:app --reload --port 8003

Features:
  POST /tutor    — AI Sign Tutor chat
  POST /lesson   — Daily lesson generator
  POST /coach    — Sign coach (analyses score history)
  GET  /health
"""

import json
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SignAI LLM API — Ollama")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"

async def ask_ollama(prompt: str, system: str = "") -> str:
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": full_prompt,
            "stream": False,
        })
        return res.json().get("response", "").strip()

class TutorPayload(BaseModel):
    message: str
    history: list = []

class LessonPayload(BaseModel):
    language: str = "ISL"
    level: str = "beginner"
    focus: str = ""
    weak_signs: list = []

class CoachPayload(BaseModel):
    language: str = "ISL"
    score_history: list
    streak: int = 0

@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.get("http://localhost:11434/api/tags")
            models = [m["name"] for m in res.json().get("models", [])]
            return {"status": "ok", "ollama": "running", "models": models}
    except:
        return {"status": "error", "ollama": "not reachable"}

@app.post("/tutor")
async def tutor(payload: TutorPayload):
    system = """You are SignAI Tutor, an expert in Indian Sign Language (ISL) and American Sign Language (ASL).
You help users learn sign language. Explain how to form signs with numbered steps.
Keep answers concise, practical and encouraging. Never make up signs."""

    history_text = ""
    for msg in payload.history[-6:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    prompt = f"{history_text}User: {payload.message}\nAssistant:"
    response = await ask_ollama(prompt, system)
    return {"response": response}

@app.post("/lesson")
async def lesson(payload: LessonPayload):
    system = """You are SignAI Lesson Planner. Create structured daily sign language lessons.
Respond with valid JSON only — no markdown, no extra text."""

    weak_text = f"User struggles with: {', '.join(payload.weak_signs)}" if payload.weak_signs else ""
    prompt = f"""Create a daily {payload.language} sign language lesson for a {payload.level} learner.
{weak_text}

Return ONLY this JSON:
{{
  "title": "lesson title",
  "duration": "20",
  "goal": "what user achieves today",
  "warmup": {{"name": "warmup name", "instructions": "step by step", "duration": "2"}},
  "signs": [
    {{"sign": "NAME", "category": "letter|word", "how_to": "how to form it", "tip": "common mistake", "practice_reps": 10}}
  ],
  "challenge": {{"name": "challenge", "description": "combining today signs", "target_score": 80}},
  "motivation": "encouraging message"
}}
Include 5-7 signs for {payload.level} level. Return only JSON."""

    response = await ask_ollama(prompt, system)
    try:
        clean = response.replace("```json","").replace("```","").strip()
        s, e = clean.find("{"), clean.rfind("}")+1
        lesson_data = json.loads(clean[s:e])
    except:
        lesson_data = {
            "title": f"{payload.language} Daily Practice",
            "duration": "20",
            "goal": "Practice core signs and build muscle memory",
            "warmup": {"name": "Finger Stretch", "instructions": "1. Spread fingers wide\n2. Make a fist\n3. Repeat 10 times", "duration": "2"},
            "signs": [
                {"sign": "A", "category": "letter", "how_to": "Make a fist with thumb resting on side", "tip": "Keep fingers tightly curled", "practice_reps": 10},
                {"sign": "B", "category": "letter", "how_to": "Flat hand, fingers together, thumb tucked across palm", "tip": "Palm faces outward", "practice_reps": 10},
                {"sign": "HELLO", "category": "word", "how_to": "Open hand touches forehead then moves outward", "tip": "Start at forehead not cheek", "practice_reps": 8},
                {"sign": "THANK YOU", "category": "word", "how_to": "Flat hand touches chin then moves forward", "tip": "Keep fingers together", "practice_reps": 8},
                {"sign": "YES", "category": "word", "how_to": "Fist nods up and down like a head nodding", "tip": "Small controlled movement", "practice_reps": 10},
            ],
            "challenge": {"name": "Spell Your Name", "description": "Fingerspell your first name 3 times without stopping", "target_score": 75},
            "motivation": "Every sign you learn opens a new conversation!"
        }
    return {"lesson": lesson_data}

@app.post("/coach")
async def coach(payload: CoachPayload):
    if not payload.score_history:
        return {"advice": "Start practicing to get personalised coaching!", "focus_signs": [], "tips": []}

    scores_text = "\n".join([f"- {s['sign']}: {s['score']}/100 ({s.get('grade','unknown')})" for s in payload.score_history])
    avg_score = sum(s['score'] for s in payload.score_history) / len(payload.score_history)
    weak = [s['sign'] for s in payload.score_history if s['score'] < 60]
    strong = [s['sign'] for s in payload.score_history if s['score'] >= 85]

    system = """You are SignAI Coach, a supportive sign language practice coach.
Give specific actionable advice. Be encouraging. Respond with valid JSON only."""

    prompt = f"""Learner's {payload.language} practice scores:
{scores_text}
Streak: {payload.streak} | Average: {round(avg_score,1)}/100
Weak (below 60): {', '.join(weak) if weak else 'none'}
Strong (above 85): {', '.join(strong) if strong else 'none'}

Return ONLY this JSON:
{{
  "overall": "one sentence summary",
  "advice": "2-3 sentences of specific coaching",
  "focus_signs": ["signs", "to", "practice"],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "encouragement": "motivational message"
}}"""

    response = await ask_ollama(prompt, system)
    try:
        clean = response.replace("```json","").replace("```","").strip()
        s, e = clean.find("{"), clean.rfind("}")+1
        coach_data = json.loads(clean[s:e])
    except:
        coach_data = {
            "overall": f"Averaging {round(avg_score,1)}/100 — {'great progress!' if avg_score >= 70 else 'keep pushing!'}",
            "advice": f"Focus on {', '.join(weak[:3]) if weak else 'maintaining your strong signs'}. Practice each sign slowly 30 times before speeding up. Consistency beats intensity.",
            "focus_signs": weak[:5] if weak else [s['sign'] for s in payload.score_history[:3]],
            "tips": [
                "Hold each sign for 1 full second before moving on",
                "Practice in good lighting — the camera needs to see your hand clearly",
                "Warm up your fingers for 2 minutes before each session"
            ],
            "encouragement": f"{'🔥 ' + str(payload.streak) + ' sign streak — you are on fire!' if payload.streak > 3 else 'Keep going — every rep builds muscle memory!'}"
        }
    return {"coach": coach_data, "stats": {"average": round(avg_score,1), "weak": weak, "strong": strong}}