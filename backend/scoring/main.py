import json
import os
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Sign Language Scoring API — Phase 3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open up allow_origins to be robust, or keep "http://localhost:3000" but frontend and any other dev tools can hit it.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LIBRARY_PATH = "reference_library.json"

# ── Finger landmark groups (MediaPipe 21-point model) ────────────────────────
FINGERS = {
    "thumb":  [1, 2, 3, 4],
    "index":  [5, 6, 7, 8],
    "middle": [9, 10, 11, 12],
    "ring":   [13, 14, 15, 16],
    "pinky":  [17, 18, 19, 20],
    "palm":   [0, 5, 9, 13, 17],
}

# ── Common ISL/ASL words reference descriptions (text hints shown in UI) ─────
WORD_HINTS = {
    "HELLO":  "Open hand, fingers together, touch forehead then move outward",
    "THANKS": "Flat hand, fingers together, touch chin then move forward",
    "HELP":   "Fist thumb up, place on open palm, raise both hands together",
    "YES":    "Fist, nod it up and down like a head nodding",
    "NO":     "Index and middle finger tap thumb twice",
    "PLEASE": "Flat hand, circular motion on chest",
    "SORRY":  "Fist, circular motion on chest",
    "WATER":  "W handshape (3 fingers up), tap chin twice",
    "FOOD":   "Flat O handshape, tap mouth twice",
    "HOME":   "Flat O to cheek, then flat hand to cheek",
    "GOOD":   "Flat hand from chin, forward and down into palm",
    "BAD":    "Flat hand from chin, flip down and away",
    "MORE":   "Both flat O hands, tap fingertips together",
    "STOP":   "Dominant hand chops down onto palm of other hand",
    "GO":     "Both index fingers point out, arc forward",
}

# ── Library persistence ───────────────────────────────────────────────────────
def load_library():
    if os.path.exists(LIBRARY_PATH):
        try:
            with open(LIBRARY_PATH) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_library(lib):
    with open(LIBRARY_PATH, "w") as f:
        json.dump(lib, f)

# ── DTW distance ──────────────────────────────────────────────────────────────
def dtw_distance(seq1, seq2):
    """
    Dynamic Time Warping between two sequences of landmark vectors.
    Each element is a flat list of 63 floats (21 landmarks × xyz).
    For static signs, seq1 and seq2 are single-element lists.
    """
    n, m = len(seq1), len(seq2)
    dtw = np.full((n + 1, m + 1), np.inf)
    dtw[0][0] = 0
    s1 = np.array(seq1)
    s2 = np.array(seq2)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = np.linalg.norm(s1[i-1] - s2[j-1])
            dtw[i][j] = cost + min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1])
    return float(dtw[n][m])

def coords_to_score(distance, max_dist=8.0):
    """Convert DTW distance to 0-100 score."""
    score = max(0, 100 - (distance / max_dist) * 100)
    return round(score, 1)

def analyse_fingers(user_coords, ref_coords):
    """
    Per-finger analysis: compare each finger's landmark positions
    between user and reference. Returns list of feedback items.
    """
    if len(user_coords) < 63 or len(ref_coords) < 63:
        return []

    u = np.array(user_coords).reshape(21, 3)
    r = np.array(ref_coords).reshape(21, 3)

    feedback = []
    for finger, indices in FINGERS.items():
        if finger == "palm":
            continue
        u_pts = u[indices]
        r_pts = r[indices]
        diff = np.mean(np.linalg.norm(u_pts - r_pts, axis=1))

        if diff < 0.04:
            status = "correct"
            msg = f"{finger.capitalize()} ✓"
        elif diff < 0.09:
            # Analyse direction of error
            u_tip = u[indices[-1]]
            r_tip = r[indices[-1]]
            delta = u_tip - r_tip

            hints = []
            if abs(delta[1]) > 0.05:
                hints.append("lower" if delta[1] > 0 else "raise")
            if abs(delta[0]) > 0.05:
                hints.append("move inward" if delta[0] > 0 else "move outward")
            if abs(delta[2]) > 0.05:
                hints.append("curl more" if delta[2] > 0 else "extend more")

            msg = f"{finger.capitalize()}: {', '.join(hints) if hints else 'slightly off'}"
            status = "warning"
        else:
            # Big error — give strong directional hint
            u_tip = u[indices[-1]]
            r_tip = r[indices[-1]]
            delta = u_tip - r_tip
            if abs(delta[1]) > abs(delta[0]) and abs(delta[1]) > abs(delta[2]):
                direction = "too low" if delta[1] > 0 else "too high"
            elif abs(delta[2]) > abs(delta[0]):
                direction = "too curled" if delta[2] > 0 else "extend fully"
            else:
                direction = "too far left" if delta[0] > 0 else "too far right"
            msg = f"{finger.capitalize()}: {direction}"
            status = "error"

        feedback.append({"finger": finger, "status": status, "message": msg, "diff": round(float(diff), 4)})

    return sorted(feedback, key=lambda x: x["diff"], reverse=True)

# ── Models ────────────────────────────────────────────────────────────────────
class ReferencePayload(BaseModel):
    sign: str           # e.g. "A" or "HELLO"
    language: str       # "ISL" | "ASL"
    coords_sequence: list  # list of coord arrays (1 for static, multiple for motion)
    category: str = "letter"   # "letter" | "word"

class ScorePayload(BaseModel):
    sign: str
    language: str
    coords: list        # single frame coords (63 floats)

class FeedbackPayload(BaseModel):
    sign: str
    language: str
    coords: list

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    lib = load_library()
    return {"status": "ok", "signs_in_library": len(lib)}

@app.get("/library")
def get_library():
    lib = load_library()
    result = []
    for key, val in lib.items():
        result.append({
            "key": key,
            "sign": val["sign"],
            "language": val["language"],
            "category": val.get("category", "letter"),
            "hint": WORD_HINTS.get(val["sign"], ""),
            "frames": len(val["coords_sequence"]),
        })
    return {"signs": result, "total": len(result)}

@app.get("/library/{language}/{sign}")
def get_sign(language: str, sign: str):
    lib = load_library()
    key = f"{language}_{sign}"
    if key not in lib:
        return {"error": f"{sign} not found in {language} library"}
    entry = lib[key]
    return {**entry, "hint": WORD_HINTS.get(sign, "")}

@app.delete("/library/{language}/{sign}")
def delete_sign(language: str, sign: str):
    lib = load_library()
    key = f"{language}_{sign}"
    if key in lib:
        del lib[key]
        save_library(lib)
        return {"deleted": key}
    return {"error": "Not found"}

@app.post("/capture-reference")
def capture_reference(payload: ReferencePayload):
    """Save a reference pose for a sign."""
    lib = load_library()
    key = f"{payload.language}_{payload.sign}"
    lib[key] = {
        "sign": payload.sign,
        "language": payload.language,
        "category": payload.category,
        "coords_sequence": payload.coords_sequence,
    }
    save_library(lib)
    return {"success": True, "key": key, "frames": len(payload.coords_sequence)}

@app.post("/score")
def score_pose(payload: ScorePayload):
    """Score a user's pose against the reference."""
    lib = load_library()
    key = f"{payload.language}_{payload.sign}"

    if key not in lib:
        return {"error": f"No reference for {payload.sign} in {payload.language}. Capture it first.", "score": 0}

    ref = lib[key]
    ref_seq = [np.array(c) for c in ref["coords_sequence"]]
    user_seq = [np.array(payload.coords)]

    dist = dtw_distance(user_seq, ref_seq)
    score = coords_to_score(dist)

    if score >= 85:
        grade = "excellent"
        message = "Perfect! Keep it up! 🎉"
        audio_cue = "success"
    elif score >= 70:
        grade = "good"
        message = "Good sign! Minor adjustments needed."
        audio_cue = "good"
    elif score >= 50:
        grade = "fair"
        message = "Getting there. Check your finger positions."
        audio_cue = "try_again"
    else:
        grade = "poor"
        message = "Keep practising. See the finger hints below."
        audio_cue = "try_again"

    feedback = analyse_fingers(payload.coords, ref["coords_sequence"][0])

    return {
        "score": score,
        "grade": grade,
        "message": message,
        "audio_cue": audio_cue,
        "feedback": feedback,
        "distance": round(dist, 4),
    }

@app.post("/feedback")
def detailed_feedback(payload: FeedbackPayload):
    """Full per-finger breakdown without scoring."""
    lib = load_library()
    key = f"{payload.language}_{payload.sign}"
    if key not in lib:
        return {"error": "No reference found"}
    ref = lib[key]
    feedback = analyse_fingers(payload.coords, ref["coords_sequence"][0])
    return {"feedback": feedback}
