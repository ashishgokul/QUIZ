from http.server import BaseHTTPRequestHandler
import json
from typing import Any, Dict, List


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
            
            questions = body.get('questions', [])
            answers = body.get('answers', {})

            if not questions:
                response = {"detail": "No questions provided."}
                self.wfile.write(json.dumps(response).encode())
                return

            if not isinstance(answers, dict):
                response = {"detail": "Answers must be an object mapping question IDs to selected options."}
                self.wfile.write(json.dumps(response).encode())
                return

            total = len(questions)
            correct = 0
            wrong = 0
            unanswered = 0
            results = []

            for q in questions:
                if not isinstance(q, dict):
                    continue
                q_id = str(q.get("id"))
                correct_answer = str(q.get("correct_answer", "")).strip().upper()
                student_answer = (
                    str(answers.get(q_id, "")).strip().upper()
                    if q_id in answers
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

            response = {
                "score": correct,
                "total": total,
                "correct": correct,
                "wrong": wrong,
                "unanswered": unanswered,
                "percentage": percentage,
                "results": results,
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            response = {"detail": str(e)}
            self.wfile.write(json.dumps(response).encode())
