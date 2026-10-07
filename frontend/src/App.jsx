import { useState } from "react";
import QuestionInput from "./components/QuestionInput";
import ExamStart from "./components/ExamStart";
import ExamQuestion from "./components/ExamQuestion";
import Result from "./components/Result";
import "./index.css";

const API = import.meta.env.VITE_API_URL;

const parseApiResponse = async (response, fallbackError) => {
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  const trimmedText = rawText.trim();
  const looksLikeJson = trimmedText.startsWith("{") || trimmedText.startsWith("[");
  if (!trimmedText || !contentType.includes("application/json") || !looksLikeJson) {
    const isHtmlGateway = /<html|<!doctype|<head/i.test(rawText);
    if (isHtmlGateway) {
      throw new Error("The backend returned a hosting/gateway page instead of JSON. This usually means the backend URL is wrong, the service is still starting, or a proxy is intercepting the request.");
    }
    if (!response.ok) {
      throw new Error(rawText || fallbackError);
    }
    throw new Error(fallbackError);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(fallbackError);
  }

  if (!response.ok) {
    throw new Error(data?.detail || fallbackError);
  }

  return data;
};

function App() {
  const [screen, setScreen] = useState("input"); // input | loading | start | exam | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const generateExam = async (text) => {
    setError("");
    setScreen("loading");
    try {
      const response = await fetch(`${API}/generate-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await parseApiResponse(response, "Failed to generate exam.");
      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error("No questions were returned. Please check your input and try again.");
      }
      setQuestions(data.questions);
      setCurrent(0);
      setAnswers({});
      setResult(null);
      setScreen("start");
    } catch (err) {
      setError(err.message || "Network error. Please ensure the backend is running.");
      setScreen("input");
    }
  };

  const submitExam = async () => {
    try {
      const response = await fetch(`${API}/submit-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ questions, answers }),
      });
      const data = await parseApiResponse(response, "Failed to submit exam.");
      setResult(data);
      setScreen("result");
    } catch (err) {
      setError(err.message || "Network error during submission.");
    }
  };

  const resetApp = () => {
    setScreen("input");
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setResult(null);
    setError("");
  };

  return (
    <div className="app-wrapper">
      {screen === "input" && (
        <QuestionInput onGenerate={generateExam} error={error} />
      )}
      {screen === "loading" && (
        <div className="loading-screen">
          <div className="loading-card">
            <div className="spinner" />
            <h2>Generating Your Exam...</h2>
            <p>AI is analyzing the questions and creating your question paper.</p>
          </div>
        </div>
      )}
      {screen === "start" && (
        <ExamStart
          questions={questions}
          onStart={() => setScreen("exam")}
          onBack={resetApp}
        />
      )}
      {screen === "exam" && (
        <ExamQuestion
          questions={questions}
          current={current}
          answers={answers}
          onSelect={(qId, option) => setAnswers((prev) => ({ ...prev, [qId]: option }))}
          onNavigate={setCurrent}
          onSubmit={submitExam}
          error={error}
        />
      )}
      {screen === "result" && result && (
        <Result result={result} onRetake={resetApp} />
      )}
    </div>
  );
}

export default App;
