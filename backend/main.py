import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment. Please set it in the .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)


class GenerateRequest(BaseModel):
    text: str


class SubmitRequest(BaseModel):
    questions: list
    answers: dict


@app.get("/")
def root():
    return {"message": "AI Exam Generator API is running!"}


@app.post("/generate-exam")
def generate_exam(request: GenerateRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Please paste some questions before generating the exam.")

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

    # Try models in priority order — fall back if one is overloaded
    MODELS = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
    ]

    last_error = None

    for model_name in MODELS:
        for attempt in range(3):  # up to 3 retries per model
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                raw = response.text.strip()

                # Strip markdown code fences if present
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
                raw = raw.strip()

                data = json.loads(raw)

                if "questions" not in data or not isinstance(data["questions"], list):
                    raise HTTPException(status_code=422, detail="The AI could not understand the question format. Please check your input and try again.")

                if len(data["questions"]) == 0:
                    raise HTTPException(status_code=422, detail="No valid multiple-choice questions were detected in the provided text.")

                return data

            except json.JSONDecodeError:
                raise HTTPException(status_code=422, detail="The AI could not understand the question format. Please check your input and try again.")
            except HTTPException:
                raise
            except Exception as e:
                err_str = str(e)
                last_error = err_str
                # If it's overloaded (503) or rate-limited (429), wait and retry
                if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "quota" in err_str.lower():
                    import time
                    wait = 2 ** attempt  # 1s, 2s, 4s backoff
                    time.sleep(wait)
                    continue  # retry same model
                # Any other error — skip to next model
                break

    raise HTTPException(
        status_code=503,
        detail=f"AI is currently overloaded. Please try again in a few seconds. (Last error: {last_error})"
    )


@app.post("/submit-exam")
def submit_exam(request: SubmitRequest):
    if not request.questions:
        raise HTTPException(status_code=400, detail="No questions provided.")

    total = len(request.questions)
    correct = 0
    wrong = 0
    unanswered = 0
    results = []

    for q in request.questions:
        q_id = str(q.get("id"))
        correct_answer = q.get("correct_answer", "").strip().upper()
        student_answer = request.answers.get(q_id, "").strip().upper() if q_id in request.answers else ""

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
            "options": q.get("options", {}),
            "correct_answer": correct_answer,
            "student_answer": student_answer if student_answer else None,
            "status": status,
        })

    percentage = round((correct / total) * 100, 2) if total > 0 else 0

    return {
        "score": correct,
        "total": total,
        "correct": correct,
        "wrong": wrong,
        "unanswered": unanswered,
        "percentage": percentage,
        "results": results,
    }
