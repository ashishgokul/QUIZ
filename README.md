# AI Exam Generator 🧠

A full-stack online exam platform powered by **Google Gemini AI**.  
Paste any MCQ question paper → AI parses it → Take the exam → Get instant results.

---

## Architecture

```
React (Vite) → FastAPI → Gemini API
```

- **Frontend**: React + Vite, dark glassmorphism UI
- **Backend**: FastAPI (Python)
- **AI**: Google Gemini 2.0 Flash

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Set your Gemini API key in .env
# GEMINI_API_KEY=your_api_key_here

uvicorn main:app --reload
```

Backend runs at: http://localhost:8000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/generate-exam` | Parse questions with Gemini |
| POST | `/submit-exam` | Evaluate student answers |

---

## Sample Questions (for testing)

Paste this into the app:

```
1. Which data structure follows FIFO?
A. Stack
B. Queue
C. Tree
D. Graph

2. What is the time complexity of Binary Search?
A. O(n)
B. O(log n)
C. O(n²)
D. O(1)

3. Which language is used for styling web pages?
A. HTML
B. Python
C. CSS
D. Java

4. What does CPU stand for?
A. Central Processing Unit
B. Central Program Utility
C. Computer Personal Unit
D. Core Processing Unit

5. What is the output of 2 ** 3 in Python?
A. 6
B. 8
C. 9
D. 5
```

---

## Future Extensions

- PDF upload → text extract → Gemini
- Image upload → Gemini Vision
- Video → Gemini multimodal
- Exam timer
- User accounts
- PostgreSQL persistence
