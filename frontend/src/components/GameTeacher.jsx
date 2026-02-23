import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { queryGame, fetchGame } from "../services/api";
import VoiceButton from "./VoiceButton";
import { speakResponse, stopSpeaking } from "./ResponseDisplay";

const TABS = [
  { key: "setup", label: "Setup" },
  { key: "rules", label: "Rules" },
  { key: "strategy", label: "Strategy" },
  { key: "qa", label: "Q&A" },
];

/* ── Accordion subtopic component ────────────────────────────── */
function Subtopic({ title, content }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginBottom: "8px",
        borderRadius: "10px",
        border: "1px solid #333",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: open ? "#2a2a4a" : "#1a1a2e",
          color: "#eee",
          border: "none",
          borderRadius: 0,
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            fontSize: "0.8rem",
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "14px 16px",
            background: "#12122a",
            color: "#ddd",
            lineHeight: 1.6,
            fontSize: "0.95rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/* ── Tab content panel for Setup / Rules / Strategy ──────────── */
function AccordionPanel({ subtopics }) {
  if (!subtopics || subtopics.length === 0) {
    return (
      <div style={{ color: "#666", textAlign: "center", padding: "40px 0" }}>
        Content not yet available. The Rogue agents will deliver v2.0 content
        soon.
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {subtopics.map((st) => (
        <Subtopic key={st.id} title={st.title} content={st.content} />
      ))}
    </div>
  );
}

/* ── Q&A Chat Panel ──────────────────────────────────────────── */
function QAPanel({ gameId, gameTitle, voiceMuted }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const historyEndRef = useRef(null);

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
      const result = await queryGame(gameId, question);
      const answer = result.answer;
      setHistory((prev) => [...prev, { role: "assistant", content: answer }]);
      speakResponse(answer, voiceMuted);
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
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {/* Chat history */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "12px",
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
                  style={{ fontSize: "0.75rem", color: "#888", marginBottom: "4px" }}
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
            style={{ padding: "10px 14px", color: "#888", fontStyle: "italic" }}
          >
            Thinking...
          </div>
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Input area */}
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

/* ── Main GameTeacher Component ──────────────────────────────── */
export default function GameTeacher() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [gameTitle, setGameTitle] = useState(gameId);
  const [activeTab, setActiveTab] = useState("setup");
  const [voiceMuted, setVoiceMuted] = useState(false);

  // Fetch full game data on mount
  useEffect(() => {
    fetchGame(gameId)
      .then((data) => {
        setGameData(data);
        setGameTitle(data.title || gameId);
      })
      .catch(() => {
        // Fallback — game may not have v2.0 content yet
        setGameTitle(gameId);
      });
  }, [gameId]);

  const tabs = gameData?.tabs || {};

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
            if (!voiceMuted) stopSpeaking();
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

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 20px",
              borderRadius: "999px",
              border:
                activeTab === t.key
                  ? "2px solid #646cff"
                  : "2px solid #333",
              background: activeTab === t.key ? "#646cff" : "#1a1a2e",
              color: "#fff",
              fontWeight: activeTab === t.key ? 700 : 400,
              fontSize: "0.95rem",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
        {activeTab === "setup" && (
          <AccordionPanel subtopics={tabs.setup?.subtopics} />
        )}
        {activeTab === "rules" && (
          <AccordionPanel subtopics={tabs.rules?.subtopics} />
        )}
        {activeTab === "strategy" && (
          <AccordionPanel subtopics={tabs.strategy?.subtopics} />
        )}
        {activeTab === "qa" && (
          <QAPanel
            gameId={gameId}
            gameTitle={gameTitle}
            voiceMuted={voiceMuted}
          />
        )}
      </div>
    </div>
  );
}
