"""
Phase 2 — Translation Backend
Stack: FastAPI + Claude API (LLM grammar layer)
Run:  uvicorn main:app --reload --port 8001

This runs alongside the gesture API on port 8000.
It handles:
  POST /sign-to-text   — takes a sequence of predicted signs → returns a grammatical sentence
  POST /text-to-signs  — takes a sentence → returns a list of signs to animate
  GET  /health
"""

import os
import anthropic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Sign Language Translation API — Phase 2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Anthropic client (set ANTHROPIC_API_KEY in your env) ─────────────────────
# If you don't have a key yet, the /sign-to-text endpoint falls back to
# simple joining and the /text-to-signs endpoint does basic word splitting.
try:
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    LLM_AVAILABLE = bool(os.environ.get("ANTHROPIC_API_KEY"))
except Exception:
    LLM_AVAILABLE = False


# ── Models ───────────────────────────────────────────────────────────────────
class SignSequencePayload(BaseModel):
    signs: list[str]        # e.g. ["H", "E", "L", "L", "O"]
    context: str = ""       # optional previous sentence for context


class TextPayload(BaseModel):
    text: str               # e.g. "Hello how are you"


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "llm_available": LLM_AVAILABLE}


@app.post("/sign-to-text")
def sign_to_text(payload: SignSequencePayload):
    """
    Converts a raw sequence of fingerspelled/signed letters or words
    into a clean grammatical sentence using Claude.

    Without LLM: just joins the signs with spaces.
    With LLM: interprets, fixes grammar, fills in likely words.
    """
    raw = " ".join(payload.signs)

    if not LLM_AVAILABLE:
        return {
            "raw": raw,
            "sentence": raw,
            "llm_used": False,
            "tip": "Set ANTHROPIC_API_KEY for smart grammar correction"
        }

    prompt = f"""You are a sign language interpreter assistant.
The user has fingerspelled or signed the following sequence of letters/words using a camera:

Signed sequence: {raw}
{f'Previous context: {payload.context}' if payload.context else ''}

Your job:
1. Interpret what they most likely meant (fix spelling, infer words from partial fingerspelling)
2. Return a clean, natural grammatical English sentence
3. If it's just one word, return just that word
4. Do NOT add words that weren't implied — stay close to what was signed
5. Reply with ONLY the interpreted sentence, nothing else."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    sentence = message.content[0].text.strip()
    return {
        "raw": raw,
        "sentence": sentence,
        "llm_used": True,
    }


@app.post("/text-to-signs")
def text_to_signs(payload: TextPayload):
    """
    Converts spoken/typed text into a sequence of signs to display.
    Returns individual letters for fingerspelling + known sign words.

    Without LLM: splits into letters naively.
    With LLM: simplifies grammar for sign language structure (ISL/ASL
    uses topic-comment structure, drops articles/copulas).
    """
    text = payload.text.strip().upper()

    if not LLM_AVAILABLE:
        # Naive: fingerspell every word letter by letter
        signs = []
        for word in text.split():
            signs.append({"type": "word", "value": word})
            signs.append({"type": "pause", "value": ""})
        return {"signs": signs, "llm_used": False}

    prompt = f"""You are a sign language translation assistant for ISL (Indian Sign Language).

Convert this spoken English sentence to sign language gloss notation:
"{payload.text}"

Rules:
- Sign language uses topic-comment structure (object first, then action)
- Drop articles (a, an, the)
- Drop copulas (is, am, are) unless essential
- Use simple present tense mostly
- Keep it natural for a deaf signer
- Return ONLY a JSON array of gloss words, uppercase, no explanation
- Example input: "I am going to the store"
- Example output: ["ME", "STORE", "GO"]

Return ONLY the JSON array."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    import json, re
    raw_response = message.content[0].text.strip()

    try:
        # Extract JSON array from response
        match = re.search(r'\[.*?\]', raw_response, re.DOTALL)
        gloss_words = json.loads(match.group()) if match else text.split()
    except Exception:
        gloss_words = text.split()

    # Expand each gloss word into fingerspelling letters
    signs = []
    for word in gloss_words:
        word = str(word).upper()
        signs.append({"type": "word_label", "value": word})
        for letter in word:
            if letter.isalpha():
                signs.append({"type": "letter", "value": letter})
        signs.append({"type": "pause", "value": ""})

    return {
        "gloss": gloss_words,
        "signs": signs,
        "llm_used": True,
    }
