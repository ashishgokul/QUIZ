# Deployment Guide: QUIZ (Frontend on Vercel, Backend on Render)

## 1) Backend on Render (FastAPI + Gemini)

Create a new **Web Service** in Render connected to this repo.

### Recommended settings (Render UI or use `render.yaml` via "Blueprint")

- **Service type**: Web Service
- **Runtime**: Python
- **Region**: choose the closest one
- **Plan**: Free or Starter
- **Root Directory**: `backend`  (THIS IS THE MOST COMMON MISTAKE — do NOT leave it blank)
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

### Environment Variable

In the Render Web Service → **Environment**:

```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Verify Render backend health

After the deploy says "Live", open in a browser:

```
https://<your-render-service>.onrender.com/health
```

You **must** see this JSON exactly:

```json
{
  "status": "ok",
  "gemini_configured": true
}
```

If you see **anything else** (HTML splash page, `404 page not found`, "The page could not be found", `This site can't be reached`):

- Wait 1–3 minutes for Render cold start.
- Make sure Root Directory is exactly `backend`.
- Make sure the Start Command is exactly the one above.
- Check Render logs for `ModuleNotFoundError` / missing `GEMINI_API_KEY`.

## 2) Frontend on Vercel (React + Vite)

Create a new **Vercel** project connected to this repo.

### Framework Preset
- Vite

### Root Directory (in Vercel Project Settings → General)
- `frontend`

### Build Command
```bash
npm run build
```

### Output Directory
```bash
dist
```

### Install Command
```bash
npm install
```

### Environment Variable (Vercel → Project → Settings → Environment Variables)

Add this for **Production, Preview, Development** (recommended):

```
VITE_API_URL=https://quiz-2fkz.onrender.com
```

If your Render backend URL is different, use that value instead.

⚠️ Vite env vars must start with `VITE_`. Do NOT set `GEMINI_API_KEY` on Vercel — the key belongs **only** in Render backend.

## 3) Final Architecture

```
React/Vite UI (Vercel)
     ↓
POST https://quiz-2fkz.onrender.com/generate-exam
POST https://quiz-2fkz.onrender.com/submit-exam
     ↓
FastAPI (Render, Root Dir = backend)
     ↓
Gemini API
```

## 4) Troubleshooting the exact error: "Failed to generate exam. (404): The page could not be found"

This means the frontend is sending the request but the URL is not reaching FastAPI.

### Step-by-step fix

1. Open the Render service and confirm the type is **Web Service**, not **Static Site**.
2. Set **Root Directory** to:
   ```
   backend
   ```
3. Set **Start Command** to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Set **Build Command** to:
   ```
   pip install -r requirements.txt
   ```
5. Make sure the Environment Variable `GEMINI_API_KEY` exists in Render.
6. Redeploy Render. Wait for "Live".
7. Open `https://quiz-2fkz.onrender.com/health` in a browser tab and confirm you get:
   ```json
   {"status":"ok","gemini_configured":true}
   ```
8. Redeploy Vercel (so the new frontend build picks up any env changes) and test Generate Exam again.
