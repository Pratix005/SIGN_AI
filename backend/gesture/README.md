# Sign Language App — Phase 1: Gesture Recognition

## What this does
- Opens your webcam
- Runs MediaPipe to detect hand landmarks in real-time
- Lets you **collect training samples** per sign (A–Z)
- Trains a lightweight MLP classifier in the browser via the API
- Predicts and overlays the detected sign live

---

## Setup (do this once)

### Backend
```bash
cd backend/gesture

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Test it: open http://localhost:8000/health → should return `{"status":"ok"}`

---

### Frontend
```bash
# From the project root — create a new React app if you haven't
npx create-react-app frontend
cd frontend

# Copy GestureApp.jsx into src/components/
# Then edit src/App.js:
```

Replace the contents of `src/App.js` with:
```jsx
import GestureApp from './components/GestureApp';
export default function App() { return <GestureApp />; }
```

Then start:
```bash
npm start
```

Open http://localhost:3000

---

## How to collect data & train

1. Click **START CAMERA** — allow camera access
2. Switch mode to **collect**
3. Pick a letter (e.g. A)
4. Hold the sign for that letter in front of your camera — samples save automatically every 150ms
5. Aim for **30+ samples per sign**
6. Repeat for as many signs as you want (start with 3–5 letters)
7. Click **TRAIN MODEL** — takes ~5 seconds
8. Switch back to **predict** mode — the prediction badge appears live

---

## File structure
```
sign-lang-app/
├── backend/
│   └── gesture/
│       ├── main.py          # FastAPI app
│       ├── requirements.txt
│       ├── classifier.pkl   # auto-generated after training
│       └── labels.json      # auto-generated after training
└── frontend/
    └── src/
        └── components/
            └── GestureApp.jsx  # Full React UI
```

---

## Next: Phase 2

Once gesture recognition is working reliably for your chosen signs:
→ Add Whisper for speech input (backend/translation/)
→ Add LLM layer to convert sign sequences → grammatical sentences
→ Add text-to-speech output

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: mediapipe` | Run `pip install -r requirements.txt` inside the venv |
| CORS error in browser | Make sure the API is running on port 8000 |
| Camera not showing | Allow camera permissions in your browser |
| Low accuracy | Collect more samples (50+ per sign), vary lighting/angles |
| `mediapipe` install fails on Python 3.12 | Use Python 3.10 or 3.11: `pyenv install 3.11` |
