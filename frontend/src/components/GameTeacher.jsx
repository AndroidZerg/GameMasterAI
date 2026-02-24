import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { queryGame, fetchGame } from "../services/api";
import VoiceButton from "./VoiceButton";
import ScoreTracker from "./ScoreTracker";
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  getRate,
  setRate,
  setOnStateChange,
  setOnRateChange,
} from "./ResponseDisplay";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8100";

const TABS = [
  { key: "setup", label: "Setup" },
  { key: "rules", label: "Rules" },
  { key: "strategy", label: "Strategy" },
  { key: "qa", label: "Q&A" },
];

const SPEED_OPTIONS = [0.75, 1.0, 1.25];

// Mock prices for demo
const GAME_PRICES = {
  catan: 44.99,
  wingspan: 59.99,
  "ticket-to-ride": 44.99,
};

/* ── Render inline markdown: **bold**, **bold** — rest ────────── */
function InlineMarkdown({ text }) {
  if (!text) return null;

  const boldPrefixMatch = text.match(/^\*\*(.+?)\*\*\s*—\s*(.+)$/);
  if (boldPrefixMatch) {
    return (
      <>
        <strong style={{ color: "#a5b4fc" }}>{boldPrefixMatch[1]}</strong>
        <span style={{ color: "var(--text-secondary)", margin: "0 6px" }}>—</span>
        <span>{boldPrefixMatch[2]}</span>
      </>
    );
  }

  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining) {
    const match = remaining.match(/\*\*(.+?)\*\*/);
    if (!match) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    const idx = match.index;
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    parts.push(<strong key={key++}>{match[1]}</strong>);
    remaining = remaining.slice(idx + match[0].length);
  }
  return <>{parts}</>;
}

/* ── Classify a paragraph block ───────────────────────────────── */
function classifyParagraph(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lines0 = trimmed.split("\n");
  if (/^---\s+.+\s+---$/.test(lines0[0].trim())) {
    const label = lines0[0].trim().replace(/^---\s+/, "").replace(/\s+---$/, "");
    return { type: "player-count-divider", text: label, raw: trimmed };
  }

  if (/^#{1,4}\s+/.test(trimmed)) {
    const lines = trimmed.split("\n");
    const headerText = lines[0].replace(/^#{1,4}\s+/, "");
    if (lines.length > 1) {
      const restLines = lines.slice(1).filter((l) => l.trim());
      const bulletLines = restLines.filter((l) => l.trim().startsWith("- "));
      const numberedLines = restLines.filter((l) => /^\d+[\).]\s/.test(l.trim()));
      if (bulletLines.length > 0) {
        return { type: "subheader-bullet", header: headerText, items: bulletLines.map((l) => l.trim().replace(/^- /, "")), raw: trimmed };
      }
      if (numberedLines.length > 0) {
        const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
        return { type: "subheader-numbered", header: headerText, items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")), startNum: numMatch ? parseInt(numMatch[1], 10) : 1, raw: trimmed };
      }
    }
    return { type: "sub-header", text: headerText, raw: trimmed };
  }

  const lines = trimmed.split("\n");
  const bulletLines = lines.filter((l) => l.trim().startsWith("- "));
  const numberedLines = lines.filter((l) => /^\d+[\).]\s/.test(l.trim()));
  const headerLines = lines.filter((l) => l.trim() && !l.trim().startsWith("- ") && !/^\d+[\).]\s/.test(l.trim()));

  if (numberedLines.length > 0 && headerLines.length === 0) {
    const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
    return { type: "numbered", items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")), startNum: numMatch ? parseInt(numMatch[1], 10) : 1, raw: trimmed };
  }
  if (bulletLines.length > 0 && headerLines.length === 0) {
    return { type: "bullet", items: bulletLines.map((l) => l.trim().replace(/^- /, "")), raw: trimmed };
  }
  if (bulletLines.length > 0 && headerLines.length > 0) {
    return { type: "header-bullet", headers: headerLines.map((l) => l.trim()), items: bulletLines.map((l) => l.trim().replace(/^- /, "")), raw: trimmed };
  }
  if (numberedLines.length > 0 && headerLines.length > 0) {
    const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
    return { type: "header-numbered", headers: headerLines.map((l) => l.trim()), items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")), startNum: numMatch ? parseInt(numMatch[1], 10) : 1, raw: trimmed };
  }
  if (trimmed.endsWith(":") && trimmed.length < 60) {
    return { type: "header", text: trimmed, raw: trimmed };
  }
  return { type: "paragraph", text: trimmed, raw: trimmed };
}

/* ── Merge consecutive numbered/bullet blocks ───────────────────── */
function mergeBlocks(blocks) {
  const merged = [];
  for (const block of blocks) {
    if (!block) continue;
    const prev = merged[merged.length - 1];
    if (block.type === "numbered" && prev?.type === "numbered" && block.startNum === prev.startNum + prev.items.length) {
      prev.items.push(...block.items);
      continue;
    }
    if (block.type === "bullet" && prev?.type === "bullet") {
      prev.items.push(...block.items);
      continue;
    }
    merged.push({ ...block });
  }
  return merged;
}

/* ── Render formatted content ───────────────────────────────────── */
function FormattedContent({ content }) {
  if (!content) return null;
  const paragraphs = content.split("\n\n");
  const classified = paragraphs.map(classifyParagraph).filter(Boolean);
  const blocks = mergeBlocks(classified);

  return (
    <div>
      {blocks.map((block, i) => {
        if (block.type === "player-count-divider") {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0 8px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{block.text}</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>
          );
        }

        if (block.type === "sub-header") {
          return (
            <h4 key={i} style={{ margin: "16px 0 6px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
              {block.text}
            </h4>
          );
        }

        if (block.type === "subheader-bullet") {
          return (
            <div key={i}>
              <h4 style={{ margin: "16px 0 6px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>{block.header}</h4>
              <ul style={{ margin: "4px 0 8px 0", paddingLeft: "20px", listStyleType: "disc" }}>
                {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
              </ul>
            </div>
          );
        }

        if (block.type === "subheader-numbered") {
          return (
            <div key={i}>
              <h4 style={{ margin: "16px 0 6px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>{block.header}</h4>
              <ol start={block.startNum} style={{ margin: "4px 0 8px 0", paddingLeft: "24px", listStyleType: "decimal" }}>
                {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
              </ol>
            </div>
          );
        }

        if (block.type === "bullet") {
          return (
            <ul key={i} style={{ margin: "8px 0", paddingLeft: "20px", listStyleType: "disc" }}>
              {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
            </ul>
          );
        }

        if (block.type === "numbered") {
          return (
            <ol key={i} start={block.startNum} style={{ margin: "8px 0", paddingLeft: "24px", listStyleType: "decimal" }}>
              {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
            </ol>
          );
        }

        if (block.type === "header-bullet") {
          return (
            <div key={i}>
              {block.headers.map((h, j) => (<p key={`h${j}`} style={{ margin: "8px 0 4px 0", fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.6 }}><InlineMarkdown text={h} /></p>))}
              <ul style={{ margin: "4px 0 8px 0", paddingLeft: "20px", listStyleType: "disc" }}>
                {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
              </ul>
            </div>
          );
        }

        if (block.type === "header-numbered") {
          return (
            <div key={i}>
              {block.headers.map((h, j) => (<p key={`h${j}`} style={{ margin: "8px 0 4px 0", fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.6 }}><InlineMarkdown text={h} /></p>))}
              <ol start={block.startNum} style={{ margin: "4px 0 8px 0", paddingLeft: "24px", listStyleType: "decimal" }}>
                {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
              </ol>
            </div>
          );
        }

        if (block.type === "header") {
          return (<p key={i} style={{ margin: "12px 0 4px 0", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.95rem" }}>{block.text}</p>);
        }

        return (<p key={i} style={{ margin: "8px 0", lineHeight: 1.6 }}><InlineMarkdown text={block.text} /></p>);
      })}
    </div>
  );
}

/* ── Speed Selector ─────────────────────────────────────────────── */
function SpeedSelector({ rate, onRateChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "var(--bg-primary)", borderRadius: "8px", padding: "2px", border: "1px solid var(--border)" }}>
      {SPEED_OPTIONS.map((speed) => (
        <button
          key={speed}
          onClick={() => onRateChange(speed)}
          style={{
            padding: "4px 8px", fontSize: "0.75rem", fontFamily: "monospace", borderRadius: "6px", border: "none", cursor: "pointer",
            fontWeight: rate === speed ? 700 : 400,
            background: rate === speed ? "var(--accent)" : "transparent",
            color: rate === speed ? "#fff" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {speed}x
        </button>
      ))}
    </div>
  );
}

/* ── Playback Controls ──────────────────────────────────────────── */
function PlaybackControls({ ttsState }) {
  if (ttsState !== "playing" && ttsState !== "paused") return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "var(--bg-primary)", borderRadius: "8px", padding: "2px 4px", border: "1px solid var(--border)" }}>
      <button onClick={() => (ttsState === "paused" ? resumeSpeaking() : pauseSpeaking())} title={ttsState === "paused" ? "Resume" : "Pause"} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.95rem", padding: "4px 6px" }}>
        {ttsState === "paused" ? "▶" : "⏸"}
      </button>
      <button onClick={() => stopSpeaking()} title="Stop" style={{ background: "none", border: "none", color: "var(--accent-dark)", cursor: "pointer", fontSize: "0.95rem", padding: "4px 6px" }}>⏹</button>
    </div>
  );
}

/* ── Section Speaker Button ─────────────────────────────────────── */
function SectionSpeaker({ content, ttsState }) {
  const isActive = ttsState === "playing" || ttsState === "paused";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); isActive ? stopSpeaking() : speakText(content); }}
      title={isActive ? "Stop reading" : "Read this section"}
      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px 8px", borderRadius: "6px", color: isActive ? "#f59e0b" : "var(--text-secondary)", transition: "color 0.2s", flexShrink: 0 }}
    >
      {isActive ? "⏹" : "🔊"}
    </button>
  );
}

/* ── Accordion Subtopic ─────────────────────────────────────────── */
function Subtopic({ title, content, ttsState }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: "8px", borderRadius: "10px", border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: open ? "var(--bg-card)" : "var(--bg-primary)", color: "var(--text-primary)", border: "none", borderRadius: 0, cursor: "pointer", fontSize: "1rem", fontWeight: 600, textAlign: "left", gap: "8px" }}
      >
        <span style={{ flex: 1 }}>{title}</span>
        <SectionSpeaker content={content} ttsState={ttsState} />
        <span style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: "0.8rem" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "14px 16px", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.95rem" }}>
          <FormattedContent content={content} />
        </div>
      )}
    </div>
  );
}

/* ── Accordion Panel ────────────────────────────────────────────── */
function AccordionPanel({ subtopics, ttsState }) {
  if (!subtopics || subtopics.length === 0) {
    return (<div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>Content not yet available.</div>);
  }
  return (
    <div style={{ padding: "4px 0" }}>
      {subtopics.map((st) => (<Subtopic key={st.id} title={st.title} content={st.content} ttsState={ttsState} />))}
    </div>
  );
}

/* ── Feedback Buttons ───────────────────────────────────────────── */
function FeedbackButtons({ gameId, question, response }) {
  const [voted, setVoted] = useState(null);
  const [showThanks, setShowThanks] = useState(false);

  const handleVote = async (rating) => {
    setVoted(rating);
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 2000);
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, question, response, rating }),
      });
    } catch {
      // Silently ignore
    }
  };

  if (showThanks) {
    return <span style={{ fontSize: "0.8rem", color: "var(--accent)", marginTop: "4px", display: "inline-block" }}>Thanks!</span>;
  }

  return (
    <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
      <button
        onClick={() => handleVote(1)}
        disabled={voted !== null}
        style={{
          background: "none", border: "none", cursor: voted !== null ? "default" : "pointer",
          fontSize: "0.9rem", padding: "2px 6px",
          opacity: voted !== null ? 0.4 : 1,
          color: voted === 1 ? "var(--accent)" : "var(--text-secondary)",
        }}
        title="Helpful"
      >
        👍
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={voted !== null}
        style={{
          background: "none", border: "none", cursor: voted !== null ? "default" : "pointer",
          fontSize: "0.9rem", padding: "2px 6px",
          opacity: voted !== null ? 0.4 : 1,
          color: voted === -1 ? "var(--accent)" : "var(--text-secondary)",
        }}
        title="Not helpful"
      >
        👎
      </button>
    </div>
  );
}

/* ── Q&A Chat Panel ─────────────────────────────────────────────── */
function QAPanel({ gameId, gameTitle }) {
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
      setHistory((prev) => [...prev, { role: "assistant", content: result.answer, question }]);
    } catch (err) {
      setHistory((prev) => [...prev, { role: "error", content: err.message || "Something went wrong" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", marginBottom: "12px", padding: "12px", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border)" }}>
        {history.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "40px" }}>
            Ask a question about {gameTitle} to get started!
          </p>
        ) : (
          history.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: "12px", padding: "10px 14px", borderRadius: "10px",
                background: msg.role === "user" ? "var(--bg-card)" : msg.role === "error" ? "#4a1a1a" : "#0f2a0f",
                maxWidth: msg.role === "user" ? "80%" : "100%",
                marginLeft: msg.role === "user" ? "auto" : 0,
                lineHeight: 1.5, fontSize: "0.95rem",
              }}
            >
              {msg.role === "user" && (<div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>You</div>)}
              {msg.role === "assistant" && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#4ade80", marginBottom: "4px" }}>
                  <span>GameMaster AI</span>
                  <button onClick={() => speakText(msg.content)} title="Read aloud" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-secondary)", padding: "2px 4px" }}>🔊</button>
                </div>
              )}
              <FormattedContent content={msg.content} />
              {msg.role === "assistant" && (
                <FeedbackButtons gameId={gameId} question={msg.question} response={msg.content} />
              )}
            </div>
          ))
        )}
        {loading && (<div style={{ padding: "10px 14px", color: "var(--text-secondary)", fontStyle: "italic" }}>Thinking...</div>)}
        <div ref={historyEndRef} />
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <VoiceButton onResult={(text) => handleSubmit(text)} disabled={loading} />
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Ask about ${gameTitle}...`} disabled={loading}
          style={{ flex: 1, padding: "14px 16px", fontSize: "1rem", borderRadius: "12px", border: "2px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none" }}
        />
        <button onClick={() => handleSubmit()} disabled={loading || !input.trim()}
          style={{ padding: "14px 24px", fontSize: "1rem", borderRadius: "12px", background: loading || !input.trim() ? "var(--border)" : "var(--accent)", color: "#fff", border: "none", fontWeight: 600 }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

/* ── Game Timer ─────────────────────────────────────────────────── */
function GameTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <button
      onClick={() => setRunning(!running)}
      title={running ? "Pause timer" : elapsed > 0 ? "Resume timer" : "Start timer"}
      style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "4px 10px", borderRadius: "8px",
        background: running ? "var(--bg-card)" : "transparent",
        border: "1px solid var(--border)",
        color: running ? "var(--accent)" : "var(--text-secondary)",
        fontSize: "0.8rem", fontFamily: "monospace", cursor: "pointer",
      }}
    >
      <span>{running ? "⏸" : "⏱"}</span>
      {elapsed > 0 && <span>{formatTime(elapsed)}</span>}
    </button>
  );
}

/* ── Buy Banner ─────────────────────────────────────────────────── */
function BuyBanner({ gameId, gameTitle, venueConfig }) {
  if (!venueConfig?.show_buy_button) return null;

  const price = GAME_PRICES[gameId];
  const text = price
    ? `Love ${gameTitle}? Buy it here — $${price.toFixed(2)}`
    : venueConfig.buy_button_text || "Love this game? We sell it — ask staff!";

  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "8px", padding: "8px 16px",
      marginBottom: "12px", textAlign: "center", fontSize: "0.85rem",
      color: "var(--text-secondary)", border: "1px solid var(--border)",
      borderLeft: "3px solid var(--accent)",
    }}>
      {text}
    </div>
  );
}

/* ── Main GameTeacher Component ──────────────────────────────────── */
export default function GameTeacher() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [gameTitle, setGameTitle] = useState(gameId);
  const [activeTab, setActiveTab] = useState("setup");
  const [ttsState, setTtsState] = useState("idle");
  const [showScoreTracker, setShowScoreTracker] = useState(false);
  const [venueConfig, setVenueConfig] = useState({
    venue_name: "Meepleville",
    venue_tagline: "Las Vegas Board Game Cafe",
    accent_color: "#e94560",
    show_buy_button: true,
    buy_button_text: "Love this game? We sell it — ask staff!",
  });
  const [ttsRate, setTtsRate] = useState(() => {
    const saved = getRate();
    if (!SPEED_OPTIONS.includes(saved)) { setRate(1.0); return 1.0; }
    return saved;
  });

  // Fetch venue config
  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/venue`);
        if (res.ok) {
          const data = await res.json();
          setVenueConfig(data);
          if (data.accent_color) {
            document.documentElement.style.setProperty("--accent", data.accent_color);
          }
        }
      } catch {
        // Use mock fallback
      }
    };
    fetchVenue();
  }, []);

  useEffect(() => {
    setOnStateChange((state) => setTtsState(state));
    setOnRateChange((rate) => setTtsRate(rate));
    return () => { setOnStateChange(null); setOnRateChange(null); };
  }, []);

  useEffect(() => {
    fetchGame(gameId)
      .then((data) => { setGameData(data); setGameTitle(data.title || gameId); })
      .catch(() => setGameTitle(gameId));
    return () => stopSpeaking();
  }, [gameId]);

  const handleRateChange = (newRate) => { setRate(newRate); setTtsRate(newRate); };
  const tabs = gameData?.tabs || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
        <button onClick={() => { stopSpeaking(); navigate("/app"); }} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>← Games</button>
        <h1 style={{ flex: 1, fontSize: "1.4rem", margin: 0, color: "var(--text-primary)" }}>{gameTitle}</h1>
        <GameTimer />
        <PlaybackControls ttsState={ttsState} />
        <SpeedSelector rate={ttsRate} onRateChange={handleRateChange} />
      </div>

      {/* Venue branding subtitle */}
      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
        GameMaster AI at {venueConfig.venue_name}
      </p>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 20px", borderRadius: "999px",
              border: activeTab === t.key ? "2px solid var(--accent)" : "2px solid var(--border)",
              background: activeTab === t.key ? "var(--accent)" : "var(--bg-primary)",
              color: "#fff", fontWeight: activeTab === t.key ? 700 : 400, fontSize: "0.95rem",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Buy Banner */}
      <BuyBanner gameId={gameId} gameTitle={gameTitle} venueConfig={venueConfig} />

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
        {activeTab === "setup" && <AccordionPanel subtopics={tabs.setup?.subtopics} ttsState={ttsState} />}
        {activeTab === "rules" && <AccordionPanel subtopics={tabs.rules?.subtopics} ttsState={ttsState} />}
        {activeTab === "strategy" && <AccordionPanel subtopics={tabs.strategy?.subtopics} ttsState={ttsState} />}
        {activeTab === "qa" && <QAPanel gameId={gameId} gameTitle={gameTitle} />}
      </div>

      {/* Score FAB */}
      <button
        onClick={() => setShowScoreTracker(true)}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "56px", height: "56px", borderRadius: "50%",
          background: "var(--accent)", color: "#fff",
          border: "none", fontSize: "1.5rem", cursor: "pointer",
          boxShadow: "0 4px 12px rgba(233, 69, 96, 0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }}
        title="Score Tracker"
      >
        🏆
      </button>

      {/* Score Tracker Modal */}
      {showScoreTracker && (
        <ScoreTracker
          gameId={gameId}
          gameTitle={gameTitle}
          playerCount={gameData?.player_count}
          onClose={() => setShowScoreTracker(false)}
          onNewGame={() => navigate("/app")}
        />
      )}
    </div>
  );
}
