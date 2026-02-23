import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { queryGame, fetchGames } from "../services/api";

const MODES = [
  { key: "setup", label: "Setup" },
  { key: "rules", label: "Rules" },
  { key: "strategy", label: "Strategy" },
  { key: "qa", label: "Q&A" },
];

export default function GameTeacher() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameTitle, setGameTitle] = useState(gameId);
  const [mode, setMode] = useState("rules");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const historyEndRef = useRef(null);

  // Fetch game title on mount
  useEffect(() => {
    fetchGames()
      .then((games) => {
        const g = games.find((g) => g.game_id === gameId);
        if (g) setGameTitle(g.title);
      })
      .catch(() => {});
  }, [gameId]);

  // Auto-scroll to bottom of history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSubmit = async (questionText) => {
    const question = (questionText || input).trim();
    if (!question || loading) return;

    setInput("");
    setHistory((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const result = await queryGame(gameId, question, mode);
      const answer = result.answer;
      setHistory((prev) => [...prev, { role: "assistant", content: answer }]);

      // Voice output
      if (!voiceMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(answer);
        utter.rate = 0.9;
        // Pick a good English voice if available
        const voices = window.speechSynthesis.getVoices();
        const english = voices.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Google")
        ) || voices.find((v) => v.lang.startsWith("en"));
        if (english) utter.voice = english;
        window.speechSynthesis.speak(utter);
      }
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { role: "error", content: err.message || "Something went wrong" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          ← Games
        </button>
        <h1 style={{ flex: 1, fontSize: "1.5rem", margin: 0 }}>{gameTitle}</h1>
        <button
          onClick={() => {
            setVoiceMuted(!voiceMuted);
            if (!voiceMuted) window.speechSynthesis?.cancel();
          }}
          style={{
            padding: "8px 14px",
            fontSize: "0.85rem",
            background: voiceMuted ? "#ef4444" : "#22c55e",
            borderRadius: "8px",
            color: "#fff",
            border: "none",
          }}
          title={voiceMuted ? "Unmute voice" : "Mute voice"}
        >
          {voiceMuted ? "🔇 Muted" : "🔊 Voice"}
        </button>
      </div>

      {/* Mode Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: "8px 20px",
              borderRadius: "999px",
              border: mode === m.key ? "2px solid #646cff" : "2px solid #333",
              background: mode === m.key ? "#646cff" : "#1a1a2e",
              color: "#fff",
              fontWeight: mode === m.key ? 700 : 400,
              fontSize: "0.95rem",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Conversation History */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "16px",
          padding: "12px",
          background: "#1a1a2e",
          borderRadius: "12px",
          border: "1px solid #333",
        }}
      >
        {history.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", marginTop: "40px" }}>
            Ask a question about {gameTitle} to get started!
          </p>
        ) : (
          history.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                background:
                  msg.role === "user"
                    ? "#2a2a4a"
                    : msg.role === "error"
                    ? "#4a1a1a"
                    : "#0f2a0f",
                maxWidth: msg.role === "user" ? "80%" : "100%",
                marginLeft: msg.role === "user" ? "auto" : 0,
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                fontSize: "0.95rem",
              }}
            >
              {msg.role === "user" && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    marginBottom: "4px",
                  }}
                >
                  You
                </div>
              )}
              {msg.role === "assistant" && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#4ade80",
                    marginBottom: "4px",
                  }}
                >
                  GameMaster AI
                </div>
              )}
              {msg.content}
            </div>
          ))
        )}
        {loading && (
          <div
            style={{
              padding: "10px 14px",
              color: "#888",
              fontStyle: "italic",
            }}
          >
            Thinking...
          </div>
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <VoiceButton onResult={(text) => handleSubmit(text)} disabled={loading} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${gameTitle}...`}
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px 16px",
            fontSize: "1rem",
            borderRadius: "12px",
            border: "2px solid #333",
            background: "#1a1a2e",
            color: "#eee",
            outline: "none",
          }}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !input.trim()}
          style={{
            padding: "14px 24px",
            fontSize: "1rem",
            borderRadius: "12px",
            background: loading || !input.trim() ? "#333" : "#646cff",
            color: "#fff",
            border: "none",
            fontWeight: 600,
          }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

/* Inline VoiceButton — will be extracted to its own file in Step 7 */
function VoiceButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!SpeechRecognition) return null; // Hide if not supported

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setListening(false);
      if (text && onResult) onResult(text);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        border: "none",
        background: listening ? "#ef4444" : "#646cff",
        color: "#fff",
        fontSize: "1.4rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        animation: listening ? "pulse 1s infinite" : "none",
        flexShrink: 0,
      }}
      title={listening ? "Stop listening" : "Tap to speak"}
    >
      🎤
    </button>
  );
}
