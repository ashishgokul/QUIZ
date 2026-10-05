import { useState } from "react";

export default function Result({ result, onRetake }) {
  const [showReview, setShowReview] = useState(false);

  const gradeInfo = () => {
    if (result.percentage >= 90) return { grade: "A+", color: "#22c55e", emoji: "🏆" };
    if (result.percentage >= 80) return { grade: "A", color: "#16a34a", emoji: "🎉" };
    if (result.percentage >= 70) return { grade: "B", color: "#2563eb", emoji: "👍" };
    if (result.percentage >= 60) return { grade: "C", color: "#d97706", emoji: "📘" };
    if (result.percentage >= 50) return { grade: "D", color: "#ea580c", emoji: "📝" };
    return { grade: "F", color: "#dc2626", emoji: "😔" };
  };

  const { grade, color, emoji } = gradeInfo();
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (result.percentage / 100) * circumference;

  return (
    <div className="page result-page">
      <div className="result-card">
        <div className="result-header">
          <span className="result-emoji">{emoji}</span>
          <h1>Exam Completed!</h1>
          <p>Here's how you performed</p>
        </div>

        {/* Circular Score */}
        <div className="score-circle-wrap">
          <svg className="score-ring" width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
            <circle
              cx="70" cy="70" r="54" fill="none"
              stroke={color} strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="score-inner">
            <span className="score-pct" style={{ color }}>{result.percentage.toFixed(0)}%</span>
            <span className="score-grade" style={{ color }}>Grade {grade}</span>
          </div>
        </div>

        <div className="score-label">
          {result.score} / {result.total} correct
        </div>

        {/* Stats Row */}
        <div className="result-stats">
          <div className="result-stat correct-stat">
            <span className="rstat-num">{result.correct}</span>
            <span className="rstat-label">✓ Correct</span>
          </div>
          <div className="result-stat wrong-stat">
            <span className="rstat-num">{result.wrong}</span>
            <span className="rstat-label">✗ Wrong</span>
          </div>
          <div className="result-stat unanswered-stat">
            <span className="rstat-num">{result.unanswered}</span>
            <span className="rstat-label">○ Unanswered</span>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn-secondary" onClick={() => setShowReview(!showReview)}>
            {showReview ? "Hide Review" : "📋 Review Answers"}
          </button>
          <button className="btn-primary btn-large" onClick={onRetake}>
            🔄 Take Another Exam
          </button>
        </div>
      </div>

      {/* Answer Review */}
      {showReview && (
        <div className="review-section">
          <h2 className="review-title">Answer Review</h2>
          <div className="review-list">
            {result.results.map((r, i) => (
              <div key={r.id} className={`review-item review-${r.status}`}>
                <div className="review-q-header">
                  <span className="review-q-num">Q{i + 1}</span>
                  <span className={`review-badge badge-${r.status}`}>
                    {r.status === "correct" ? "✓ Correct" : r.status === "wrong" ? "✗ Wrong" : "○ Unanswered"}
                  </span>
                </div>
                <p className="review-question">{r.question}</p>
                <div className="review-answers">
                  {r.student_answer ? (
                    <span className={`review-ans your-ans ${r.status === "correct" ? "ans-correct" : "ans-wrong"}`}>
                      Your Answer: {r.student_answer} — {r.options?.[r.student_answer]}
                    </span>
                  ) : (
                    <span className="review-ans no-ans">Your Answer: —</span>
                  )}
                  <span className="review-ans correct-ans">
                    Correct Answer: {r.correct_answer} — {r.options?.[r.correct_answer]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
