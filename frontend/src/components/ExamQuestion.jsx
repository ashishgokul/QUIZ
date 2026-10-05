import { useState } from "react";
import QuestionNavigation from "./QuestionNavigation";

export default function ExamQuestion({
  questions,
  current,
  answers,
  onSelect,
  onNavigate,
  onSubmit,
  error,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const q = questions[current];
  const qId = String(q.id);
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const isLast = current === questions.length - 1;
  const progress = ((current + 1) / questions.length) * 100;

  const handleSubmitConfirm = () => {
    setShowConfirm(false);
    onSubmit();
  };

  return (
    <div className="exam-layout">
      {/* Sidebar Navigator */}
      <aside className="exam-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🧠 AI Exam</span>
          <div className="sidebar-progress-wrap">
            <div className="sidebar-progress-bar">
              <div className="sidebar-progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
            <span className="sidebar-progress-text">{answeredCount}/{questions.length} answered</span>
          </div>
        </div>
        <QuestionNavigation
          questions={questions}
          current={current}
          answers={answers}
          onNavigate={onNavigate}
        />
      </aside>

      {/* Main Question Area */}
      <main className="exam-main">
        {/* Top progress bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="question-header">
          <span className="q-badge">Question {current + 1} of {questions.length}</span>
          <span className={`status-badge ${answers[qId] ? "status-answered" : "status-pending"}`}>
            {answers[qId] ? "✓ Answered" : "○ Unanswered"}
          </span>
        </div>

        <div className="question-card">
          <p className="question-text">{q.question}</p>

          <div className="options-list">
            {Object.entries(q.options).map(([key, value]) => (
              <label
                key={key}
                className={`option-item ${answers[qId] === key ? "option-selected" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[qId] === key}
                  onChange={() => onSelect(qId, key)}
                />
                <span className="option-key">{key}</span>
                <span className="option-value">{value}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <div className="exam-nav-row">
          <button
            className="btn-secondary"
            disabled={current === 0}
            onClick={() => onNavigate(current - 1)}
          >
            ← Previous
          </button>

          {!isLast ? (
            <button
              className="btn-primary"
              onClick={() => onNavigate(current + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn-submit"
              onClick={() => setShowConfirm(true)}
            >
              Submit Exam ✓
            </button>
          )}
        </div>
      </main>

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Submit Exam?</h2>
            <p>Please review before submitting.</p>
            <div className="modal-stats">
              <div className="modal-stat">
                <span className="modal-stat-num answered-num">{answeredCount}</span>
                <span>Answered</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-num unanswered-num">{unansweredCount}</span>
                <span>Unanswered</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-num">{questions.length}</span>
                <span>Total</span>
              </div>
            </div>
            {unansweredCount > 0 && (
              <p className="modal-warning">
                ⚠️ You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}. These will be marked as unanswered.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn-submit" onClick={handleSubmitConfirm}>
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
