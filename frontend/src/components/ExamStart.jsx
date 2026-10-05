export default function ExamStart({ questions, onStart, onBack }) {
  return (
    <div className="page start-page">
      <div className="start-card">
        <div className="start-icon">📋</div>
        <h1 className="start-title">Exam Ready!</h1>
        <p className="start-sub">
          AI has successfully parsed your questions. Review the details below
          before starting.
        </p>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-num">{questions.length}</span>
            <span className="stat-label">Total Questions</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">MCQ</span>
            <span className="stat-label">Question Type</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">1</span>
            <span className="stat-label">Mark per Question</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{questions.length}</span>
            <span className="stat-label">Max Score</span>
          </div>
        </div>

        <div className="rules-box">
          <h3>📌 Exam Rules</h3>
          <ul>
            <li>Each question has 4 options — select only one.</li>
            <li>You can navigate between questions freely.</li>
            <li>Answers are saved automatically as you select them.</li>
            <li>You can change your answer before final submission.</li>
            <li>No negative marking for wrong answers.</li>
            <li>Results are shown immediately after submission.</li>
          </ul>
        </div>

        <div className="start-actions">
          <button className="btn-secondary" onClick={onBack}>
            ← Back to Input
          </button>
          <button className="btn-primary btn-large btn-glow" onClick={onStart}>
            🚀 Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
