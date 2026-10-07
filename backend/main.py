import os
import json
import re
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError, StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI(title="AI Exam Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if exc.status_code == 404:
        detail = (
            f"Not Found: {request.method} {request.url.path}. "
            "Use GET /, GET /health, POST /generate-exam, or POST /submit-exam."
        )
    elif isinstance(detail, (dict, list)):
        pass
    elif not isinstance(detail, str):
        detail = str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def fallback_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


class GenerateRequest(BaseModel):
    text: str


class SubmitRequest(BaseModel):
    questions: List[Dict[str, Any]]
    answers: Dict[str, Any]


def _extract_json_object(text: str) -> Optional[Any]:
    if not text:
        return None

    text = text.strip()

    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    first_object = text.find("{")
    last_object = text.rfind("}")
    if first_object != -1 and last_object != -1 and last_object > first_object:
        try:
            return json.loads(text[first_object:last_object + 1])
        except json.JSONDecodeError:
            pass

    first_array = text.find("[")
    last_array = text.rfind("]")
    if first_array != -1 and last_array != -1 and last_array > first_array:
        try:
            candidate = json.loads(text[first_array:last_array + 1])
            return {"questions": candidate} if isinstance(candidate, list) else candidate
        except json.JSONDecodeError:
            pass

    return None


@app.get("/")
def root():
    return {"message": "AI Exam Generator API is running!", "ok": True}


@app.get("/health")
def health():
    return {"status": "ok", "gemini_configured": bool(GEMINI_API_KEY)}


@app.post("/generate-exam")
@app.post("/generate-exam/")
def generate_exam(request: GenerateRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Please paste some questions before generating the exam.")

    if not client or not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Backend is missing the GEMINI_API_KEY environment variable. Please configure it on Render and redeploy."
        )

    prompt = f"""You are an expert exam question extraction and analysis system.

The user will provide text containing multiple-choice questions (MCQs) and their options.
The correct answers may or may not be marked in the input.

Your job:
1. Extract every MCQ question from the input text.
2. Preserve the original question wording exactly.
3. Preserve the original MCQ options exactly.
4. If the correct answer is NOT marked, use your knowledge to determine the correct answer.
5. If the correct answer IS marked, use that.
6. Do not create fake questions.
7. Ignore any non-question text (instructions, headers, etc.).
8. Return questions in their original order.
9. Handle questions with any number of options (A/B/C/D or more).

IMPORTANT: Return ONLY valid JSON. No explanation. No markdown. No code blocks. Just raw JSON.

Return this exact structure:
{{
  "questions": [
    {{
      "id": 1,
      "question": "The full question text here?",
      "options": {{
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      }},
      "correct_answer": "B"
    }}
  ]
}}

Input text to process:
{request.text}"""

    MODELS = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
    ]

    last_error: Optional[str] = None

    for model_name in MODELS:
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                raw = (response.text or "").strip()

                data = _extract_json_object(raw)

                if data is None:
                    raise HTTPException(
                        status_code=422,
                        detail="The AI could not understand the question format. Please check your input and try again."
                    )

                if isinstance(data, list):
                    data = {"questions": data}

                if "questions" not in data or not isinstance(data["questions"], list):
                    raise HTTPException(
                        status_code=422,
                        detail="The AI could not understand the question format. Please check your input and try again."
                    )

                normalized_questions: List[Dict[str, Any]] = []
                for idx, q in enumerate(data["questions"], start=1):
                    if not isinstance(q, dict):
                        continue
                    question_text = str(q.get("question", "")).strip()
                    options = q.get("options", {}) or {}
                    correct_answer = str(q.get("correct_answer", "")).strip().upper()
                    if not question_text or not isinstance(options, dict) or not options:
                        continue
                    normalized_questions.append({
                        "id": q.get("id", idx),
                        "question": question_text,
                        "options": options,
                        "correct_answer": correct_answer,
                    })

                if len(normalized_questions) == 0:
                    raise HTTPException(
                        status_code=422,
                        detail="No valid multiple-choice questions were detected in the provided text."
                    )

                return {"questions": normalized_questions}

            except HTTPException:
                raise
            except Exception as e:
                err_str = str(e)
                last_error = err_str
                if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "quota" in err_str.lower():
                    wait = 2 ** attempt
                    time.sleep(wait)
                    continue
                break

    raise HTTPException(
        status_code=503,
        detail=f"AI is currently overloaded. Please try again in a few seconds. (Last error: {last_error})"
    )


@app.post("/submit-exam")
@app.post("/submit-exam/")
def submit_exam(request: SubmitRequest):
    if not request.questions:
        raise HTTPException(status_code=400, detail="No questions provided.")

    if not isinstance(request.answers, dict):
        raise HTTPException(status_code=400, detail="Answers must be an object mapping question IDs to selected options.")

    total = len(request.questions)
    correct = 0
    wrong = 0
    unanswered = 0
    results: List[Dict[str, Any]] = []

    for q in request.questions:
        if not isinstance(q, dict):
            continue
        q_id = str(q.get("id"))
        correct_answer = str(q.get("correct_answer", "")).strip().upper()
        student_answer = (
            str(request.answers.get(q_id, "")).strip().upper()
            if q_id in request.answers
            else ""
        )

        if not student_answer:
            status = "unanswered"
            unanswered += 1
        elif student_answer == correct_answer:
            status = "correct"
            correct += 1
        else:
            status = "wrong"
            wrong += 1

        results.append({
            "id": q.get("id"),
            "question": q.get("question"),
            "options": q.get("options", {}) or {},
            "correct_answer": correct_answer,
            "student_answer": student_answer if student_answer else None,
            "status": status,
        })

    total_scored = len(results) or total
    percentage = round((correct / total_scored) * 100, 2) if total_scored > 0 else 0

    return {
        "score": correct,
        "total": total,
        "correct": correct,
        "wrong": wrong,
        "unanswered": unanswered,
        "percentage": percentage,
        "results": results,
    }
