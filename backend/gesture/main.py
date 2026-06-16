"""
Phase 1 — Gesture Recognition Backend
Stack: FastAPI + MediaPipe + scikit-learn
Run:  uvicorn main:app --reload --port 8000
"""

import cv2
import base64
import numpy as np
import mediapipe as mp
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle, os, json

app = FastAPI(title="Sign Language API — Phase 1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MediaPipe setup ──────────────────────────────────────────────────────────
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.6,
)

# ── Load classifier if trained, else return raw landmarks ───────────────────
MODEL_PATH = "classifier.pkl"
LABELS_PATH = "labels.json"
classifier = None
label_map = {}

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            classifier = pickle.load(f)
    except Exception as e:
        print(f"Warning: Failed to load classifier model: {e}")
        classifier = None

if os.path.exists(LABELS_PATH):
    try:
        with open(LABELS_PATH) as f:
            label_map = json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load label map: {e}")
        label_map = {}



# ── Helpers ──────────────────────────────────────────────────────────────────
def decode_frame(b64: str) -> np.ndarray:
    """Base64 JPEG → OpenCV BGR array."""
    header, data = b64.split(",", 1)
    img_bytes = base64.b64decode(data)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def extract_landmarks(frame_bgr: np.ndarray):
    """
    Run MediaPipe and return a flat list of 63 floats (21 landmarks × xyz),
    normalised relative to the wrist so position doesn't matter.
    Returns None if no hand found.
    """
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)
    if not result.multi_hand_landmarks:
        return None, None

    lm = result.multi_hand_landmarks[0]
    # Normalise: subtract wrist (landmark 0)
    wrist = lm.landmark[0]
    coords = []
    for pt in lm.landmark:
        coords.extend([pt.x - wrist.x, pt.y - wrist.y, pt.z - wrist.z])

    # Also return raw landmark positions for the frontend overlay
    raw = [[pt.x, pt.y] for pt in lm.landmark]
    return coords, raw


# ── Routes ───────────────────────────────────────────────────────────────────
class FramePayload(BaseModel):
    frame: str          # data:image/jpeg;base64,...
    mode: str = "predict"   # "predict" | "collect"
    label: str = ""     # only needed when mode="collect"


@app.get("/health")
def health():
    return {"status": "ok", "classifier_loaded": classifier is not None}


@app.post("/predict")
def predict(payload: FramePayload):
    """
    Accepts a webcam frame (base64 JPEG), runs MediaPipe,
    returns prediction + landmark positions for overlay.
    """
    frame = decode_frame(payload.frame)
    coords, raw_lm = extract_landmarks(frame)

    if coords is None:
        return {"sign": None, "confidence": 0, "landmarks": [], "message": "No hand detected"}

    if classifier is not None:
        proba = classifier.predict_proba([coords])[0]
        idx = int(np.argmax(proba))
        confidence = float(proba[idx])
        sign = label_map.get(str(idx), f"class_{idx}")
    else:
        # No model yet — return "untrained" so the frontend knows
        sign = "untrained"
        confidence = 0.0

    return {
        "sign": sign,
        "confidence": round(confidence, 3),
        "landmarks": raw_lm,
        "coords": coords,   # useful for data collection
    }


class CoordsPayload(BaseModel):
    coords: list[float]


@app.post("/predict-coords")
def predict_coords(payload: CoordsPayload):
    """
    Accepts raw landmarks coordinates (63 floats) and returns the sign prediction.
    """
    if len(payload.coords) < 63:
        return {"sign": None, "confidence": 0, "message": "Invalid coordinates payload"}

    if classifier is not None:
        proba = classifier.predict_proba([payload.coords])[0]
        idx = int(np.argmax(proba))
        confidence = float(proba[idx])
        sign = label_map.get(str(idx), f"class_{idx}")
    else:
        sign = "untrained"
        confidence = 0.0

    return {
        "sign": sign,
        "confidence": round(confidence, 3),
    }



@app.get("/status")
def status():
    """Tell the frontend what phase the app is in."""
    trained = classifier is not None
    return {
        "trained": trained,
        "signs_available": list(label_map.values()) if trained else [],
        "tip": "POST /train to train after collecting data" if not trained else "Model ready",
    }


# ── Training endpoint (simple sklearn MLP) ───────────────────────────────────
class TrainPayload(BaseModel):
    samples: list   # [{"coords": [...], "label": "A"}, ...]


@app.post("/train")
def train(payload: TrainPayload):
    """
    Trains a simple MLP on the supplied samples.
    In production you'd save samples to disk and retrain offline;
    this is fine for initial testing with 100–500 samples.
    """
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import LabelEncoder

    if len(payload.samples) < 10:
        return {"error": "Need at least 10 samples to train"}

    X = [s["coords"] for s in payload.samples]
    y_raw = [s["label"] for s in payload.samples]

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    # Build label map  {idx: label}
    lm = {str(i): label for i, label in enumerate(le.classes_)}
    with open(LABELS_PATH, "w") as f:
        json.dump(lm, f)

    clf = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=42)
    clf.fit(X, y)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)

    global classifier, label_map
    classifier = clf
    label_map = lm

    return {
        "success": True,
        "classes": list(le.classes_),
        "samples": len(X),
    }

