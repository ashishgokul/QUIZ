from http.server import BaseHTTPRequestHandler
import json
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
        response = {"status": "ok", "gemini_configured": gemini_configured}
        self.wfile.write(json.dumps(response).encode())
