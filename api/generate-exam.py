from http.server import BaseHTTPRequestHandler
import json
import os
import re
import time
from typing import Any, Dict, List, Optional
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


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


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
            text = body.get('text', '')

            if not text or not text.strip():
                response = {"detail": "Please paste some questions before generating the exam."}
                self.wfile.write(json.dumps(response).encode())
                return

            if not client or not GEMINI_API_KEY:
                response = {"detail": "Backend is missing the GEMINI_API_KEY environment variable."}
                self.wfile.write(json.dumps(response).encode())
                return

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
{text}"""

            MODELS = [
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b",
            ]

            last_error = None

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
                            response = {"detail": "The AI could not understand the question format. Please check your input and try again."}
                            self.wfile.write(json.dumps(response).encode())
                            return

                        if isinstance(data, list):
                            data = {"questions": data}

                        if "questions" not in data or not isinstance(data["questions"], list):
                            response = {"detail": "The AI could not understand the question format. Please check your input and try again."}
                            self.wfile.write(json.dumps(response).encode())
                            return

                        normalized_questions = []
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
                            response = {"detail": "No valid multiple-choice questions were detected in the provided text."}
                            self.wfile.write(json.dumps(response).encode())
                            return

                        response = {"questions": normalized_questions}
                        self.wfile.write(json.dumps(response).encode())
                        return

                    except Exception as e:
                        err_str = str(e)
                        last_error = err_str
                        if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "quota" in err_str.lower():
                            wait = 2 ** attempt
                            time.sleep(wait)
                            continue
                        break

            response = {"detail": f"AI is currently overloaded. Please try again in a few seconds. (Last error: {last_error})"}
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            response = {"detail": str(e)}
            self.wfile.write(json.dumps(response).encode())
