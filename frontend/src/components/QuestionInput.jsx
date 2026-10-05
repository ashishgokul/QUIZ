import { useState } from "react";

const SAMPLE = `1. Which data structure follows FIFO?
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

5. Which of the following is NOT a programming language?
A. Python
B. Java
C. HTML
D. C++`;

export default function QuestionInput({ onGenerate, error }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await onGenerate(text);
    setLoading(false);
  };

  return (
    <div className="page input-page">
      <div className="hero-header">
        <div className="logo-badge">
          <span className="logo-icon">🧠</span>
        </div>
        <h1 className="hero-title">AI Exam Generator</h1>
        <p className="hero-sub">
          Paste your questions &amp; MCQs — AI will build a real exam instantly
        </p>
      </div>

      <div className="input-card">
        <div className="info-box">
          <span className="info-icon">💡</span>
          <div>
            <strong>How it works:</strong> Paste any MCQ questions with their options below.
            You don't need to mark the correct answers — AI will figure them out automatically.
          </div>
        </div>

        <label className="textarea-label">Paste your questions &amp; options</label>
        <textarea
          className="question-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Example:\n\n1. Which data structure follows FIFO?\nA. Stack\nB. Queue\nC. Tree\nD. Graph\n\n2. What is the time complexity of Binary Search?\nA. O(n)\nB. O(log n)\nC. O(n²)\nD. O(1)`}
        />

        {error && (
          <div className="error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="input-actions">
          <button
            className="btn-secondary"
            onClick={() => setText(SAMPLE)}
            disabled={loading}
          >
            Load Sample Questions
          </button>
          <button
            className="btn-primary btn-large"
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <span className="btn-spinner" /> Generating...
              </>
            ) : (
              <>✨ Generate Exam</>
            )}
          </button>
        </div>
      </div>

      <div className="features-row">
        <div className="feature-chip">📄 Paste Raw Text</div>
        <div className="feature-chip">🤖 AI Parses MCQs</div>
        <div className="feature-chip">📝 Real Exam Interface</div>
        <div className="feature-chip">📊 Instant Results</div>
      </div>
    </div>
  );
}
