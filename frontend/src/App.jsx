import { useState } from "react";
import QuestionInput from "./components/QuestionInput";
import ExamStart from "./components/ExamStart";
import ExamQuestion from "./components/ExamQuestion";
import Result from "./components/Result";
import "./index.css";

const API = "";

const parseApiResponse = async (response, fallbackError) => {
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  const trimmedText = rawText.trim();
  const looksLikeJson = trimmedText.startsWith("{") || trimmedText.startsWith("[");
  const statusLabel = `(${response.status}${response.statusText ? " " + response.statusText : ""})`;

  const isHtmlGateway = /<html|<!doctype|<head/i.test(rawText);
  if (!trimmedText || isHtmlGateway || (!looksLikeJson && !contentType.includes("application/json"))) {
    if (isHtmlGateway) {
      throw new Error(`Backend returned a hosting/gateway page instead of JSON ${statusLabel}. This usually means the backend URL is wrong, the service is still starting, or a proxy is intercepting the request. Check ${API}`);
    }
    if (!response.ok) {
      const snippet = trimmedText ? ` — ${trimmedText.slice(0, 160)}` : "";
      throw new Error(`${fallbackError} ${statusLabel}${snippet}`);
    }
    throw new Error(`${fallbackError} ${statusLabel}`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`${fallbackError} ${statusLabel} (invalid JSON from ${API})`);
  }

  if (!response.ok) {
    const renderGateway404 =
      response.status === 404 &&
      data &&
      typeof data === "object" &&
      data.error &&
      typeof data.error === "object" &&
      data.error.code === "404" &&
      /the page could not be found/i.test(String(data.error.message || ""));

    if (renderGateway404) {
      throw new Error(
        `${fallbackError} (404): The Render backend at ${API} did not run FastAPI. This almost always means Render is configured incorrectly. In Render Web Service settings, set Root Directory to "backend", Build Command to "pip install -r requirements.txt", and Start Command to "uvicorn main:app --host 0.0.0.0 --port $PORT". After redeploying Render, open ${API}/health in a browser until you see {"status":"ok","gemini_configured":true}, then redeploy Vercel.`
      );
    }

    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : JSON.stringify(data?.detail ?? data);

    throw new Error(`${fallbackError} ${statusLabel}: ${detail}`);
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

  const formatNetworkError = (err, fallback) => {
    const baseMsg = err?.message || fallback;
    const looksLikeNetworkError =
      err instanceof TypeError &&
      (/failed to fetch|networkerror|cors|blocked|load failed/i.test(baseMsg) ||
        !baseMsg);

    if (looksLikeNetworkError) {
      return `${fallback} Network error. This is usually caused by the backend service being unavailable.`;
    }

    return baseMsg;
  };

  const generateExam = async (text) => {
    setError("");
    setScreen("loading");
    try {
      const response = await fetch(`/api/generate-exam`, {
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
      setError(formatNetworkError(err, "Failed to generate exam."));
      setScreen("input");
    }
  };

  const submitExam = async () => {
    try {
      const response = await fetch(`/api/submit-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ questions, answers }),
      });
      const data = await parseApiResponse(response, "Failed to submit exam.");
      setResult(data);
      setScreen("result");
    } catch (err) {
      setError(formatNetworkError(err, "Failed to submit exam."));
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
