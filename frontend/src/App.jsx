import axios from "axios";
import { useState } from "react";
import "./App.css";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5000", 
});

function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("summary");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [chatLog, setChatLog] = useState([]);

  const [abortController, setAbortController] = useState(null);
  const [lastResetClick, setLastResetClick] = useState(0);

  const handleSubmit = async () => {
    setError("");
    setResult(null);
    setLoading(true);

    if (!text.trim() && !file) {
      setError("Please enter text or upload a file.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    if (file) formData.append("file", file);
    else formData.append("text", text);

    let endpoint = mode === "summary" ? "/summarize" : "/generate-questions";

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await axiosInstance.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
      });
      setResult(response.data);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") {
        console.log("Request aborted by user.");
      } else {
        console.error(err);
        setError("Failed to connect to backend. Is Flask running?");
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const userMessage = { role: "user", content: question };
    setChatLog((prev) => [...prev, userMessage]);

    try {
      const response = await axiosInstance.post("/ask", { question });
      const assistantMessage = { role: "assistant", content: response.data.answer };
      setChatLog((prev) => [...prev, assistantMessage]);
      setQuestion("");
    } catch (err) {
      console.error(err);
      setError("Failed to get chatbot response.");
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (file) setFile(null);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    if (text) setText("");
  };

  const handleReset = () => {
    const now = Date.now();
    if (now - lastResetClick < 600) {
      setChatLog([]); // Double-click detected — clear chat
    }
    setLastResetClick(now);

    if (abortController) {
      abortController.abort();
    }

    setText("");
    setFile(null);
    setResult(null);
    setError("");
    setQuestion("");

    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";
  };

  return (
    <div className="container">
      <h2>AskLens</h2>

      <textarea
        rows="8"
        value={text}
        onChange={handleTextChange}
        disabled={loading || file}
        placeholder="Enter text or leave empty if uploading a file..."
      />

      <input
        id="fileInput"
        type="file"
        accept=".png,.jpg,.jpeg"
        onChange={handleFileChange}
        disabled={loading || text.trim()}
      />

      <div className="controls">
        <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={loading}>
          <option value="summary">Summary</option>
          <option value="questions">Questions</option>
        </select>
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Processing..." : "Submit"}
        </button>
        <button onClick={handleReset} style={{ marginLeft: "10px" }}>
          Reset
        </button>
      </div>

      {error && <div className="error">❌ {error}</div>}

      {result?.summary && (
        <div className="output">
          <h3>📄 Summary</h3>
          <p>{result.summary}</p>
        </div>
      )}

      {result?.questions && (
        <div className="output">
          <h3>❓ Generated Questions</h3>
          <ol>
            {result.questions.map((q, i) => (
              <li key={i}>
                {q.question}
                <br />
                <strong>Answer:</strong> {q.answer}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="chatbot">
        <h3>💬 Ask Questions</h3>
        <div className="chat-log">
          {chatLog.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-bubble">
                <strong>{msg.role === "user" ? "You" : "Bot"}:</strong> {msg.content}
              </div>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything..."
          />
          <button onClick={handleAsk}>Ask</button>
        </div>
      </div>
    </div>
  );
}

export default App;
