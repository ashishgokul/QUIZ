export default function QuestionNavigation({ questions, current, answers, onNavigate }) {
  return (
    <div className="nav-panel">
      <p className="nav-title">Question Navigator</p>
      <div className="nav-grid">
        {questions.map((q, i) => {
          const qId = String(q.id);
          const isAnswered = !!answers[qId];
          const isCurrent = i === current;
          return (
            <button
              key={q.id}
              className={`nav-btn ${isCurrent ? "nav-current" : ""} ${isAnswered && !isCurrent ? "nav-answered" : ""}`}
              onClick={() => onNavigate(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="nav-legend">
        <span className="legend-item">
          <span className="legend-dot dot-current" /> Current
        </span>
        <span className="legend-item">
          <span className="legend-dot dot-answered" /> Answered
        </span>
        <span className="legend-item">
          <span className="legend-dot dot-unanswered" /> Unanswered
        </span>
      </div>
    </div>
  );
}
