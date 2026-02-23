import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { queryGame, fetchGame } from "../services/api";
import VoiceButton from "./VoiceButton";
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

const TABS = [
  { key: "setup", label: "Setup" },
  { key: "rules", label: "Rules" },
  { key: "strategy", label: "Strategy" },
  { key: "qa", label: "Q&A" },
];

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];

/* ── Render inline markdown: **bold**, **bold** — rest ────────── */
function InlineMarkdown({ text }) {
  if (!text) return null;

  // Parse **bold** — rest pattern (bold-prefix bullet)
  const boldPrefixMatch = text.match(/^\*\*(.+?)\*\*\s*—\s*(.+)$/);
  if (boldPrefixMatch) {
    return (
      <>
        <strong style={{ color: "#a5b4fc" }}>{boldPrefixMatch[1]}</strong>
        <span style={{ color: "#999", margin: "0 6px" }}>—</span>
        <span>{boldPrefixMatch[2]}</span>
      </>
    );
  }

  // Parse any **bold** segments in regular text
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

  // Player-count divider: --- 2 Players ---
  const lines0 = trimmed.split("\n");
  if (/^---\s+.+\s+---$/.test(lines0[0].trim())) {
    const label = lines0[0].trim().replace(/^---\s+/, "").replace(/\s+---$/, "");
    return { type: "player-count-divider", text: label, raw: trimmed };
  }

  // Sub-header: #### Header Text (possibly followed by bullet/numbered items)
  if (/^#{1,4}\s+/.test(trimmed)) {
    const lines = trimmed.split("\n");
    const headerText = lines[0].replace(/^#{1,4}\s+/, "");

    // If there are additional lines after the header, it's a compound block
    if (lines.length > 1) {
      const restLines = lines.slice(1).filter((l) => l.trim());
      const bulletLines = restLines.filter((l) => l.trim().startsWith("- "));
      const numberedLines = restLines.filter((l) => /^\d+[\).]\s/.test(l.trim()));

      if (bulletLines.length > 0) {
        return {
          type: "subheader-bullet",
          header: headerText,
          items: bulletLines.map((l) => l.trim().replace(/^- /, "")),
          raw: trimmed,
        };
      }
      if (numberedLines.length > 0) {
        const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
        const startNum = numMatch ? parseInt(numMatch[1], 10) : 1;
        return {
          type: "subheader-numbered",
          header: headerText,
          items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")),
          startNum,
          raw: trimmed,
        };
      }
    }

    return { type: "sub-header", text: headerText, raw: trimmed };
  }

  const lines = trimmed.split("\n");
  const bulletLines = lines.filter((l) => l.trim().startsWith("- "));
  const numberedLines = lines.filter((l) => /^\d+[\).]\s/.test(l.trim()));
  const headerLines = lines.filter(
    (l) =>
      l.trim() &&
      !l.trim().startsWith("- ") &&
      !/^\d+[\).]\s/.test(l.trim())
  );

  // Pure numbered (single or multi) — supports both "1)" and "1."
  if (numberedLines.length > 0 && headerLines.length === 0) {
    const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
    const startNum = numMatch ? parseInt(numMatch[1], 10) : 1;
    return {
      type: "numbered",
      items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")),
      startNum,
      raw: trimmed,
    };
  }
  // Pure bullet
  if (bulletLines.length > 0 && headerLines.length === 0) {
    return {
      type: "bullet",
      items: bulletLines.map((l) => l.trim().replace(/^- /, "")),
      raw: trimmed,
    };
  }
  // Mixed header + bullets
  if (bulletLines.length > 0 && headerLines.length > 0) {
    return {
      type: "header-bullet",
      headers: headerLines.map((l) => l.trim()),
      items: bulletLines.map((l) => l.trim().replace(/^- /, "")),
      raw: trimmed,
    };
  }
  // Mixed header + numbered
  if (numberedLines.length > 0 && headerLines.length > 0) {
    const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
    const startNum = numMatch ? parseInt(numMatch[1], 10) : 1;
    return {
      type: "header-numbered",
      headers: headerLines.map((l) => l.trim()),
      items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")),
      startNum,
      raw: trimmed,
    };
  }
  // Header-like (ends with ":")
  if (trimmed.endsWith(":") && trimmed.length < 60) {
    return { type: "header", text: trimmed, raw: trimmed };
  }
  // Plain paragraph
  return { type: "paragraph", text: trimmed, raw: trimmed };
}

/* ── Merge consecutive numbered/bullet blocks into single lists ── */
function mergeBlocks(blocks) {
  const merged = [];
  for (const block of blocks) {
    if (!block) continue;
    const prev = merged[merged.length - 1];
    if (
      block.type === "numbered" &&
      prev?.type === "numbered" &&
      block.startNum === prev.startNum + prev.items.length
    ) {
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

/* ── Render formatted content with all patterns ───────────────── */
function FormattedContent({ content }) {
  if (!content) return null;

  const paragraphs = content.split("\n\n");
  const classified = paragraphs.map(classifyParagraph).filter(Boolean);
  const blocks = mergeBlocks(classified);

  return (
    <div>
      {blocks.map((block, i) => {
        // Player-count divider: --- 2 Players ---
        if (block.type === "player-count-divider") {
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "16px 0 8px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "#444" }} />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "#a5b4fc",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {block.text}
              </span>
              <div style={{ flex: 1, height: "1px", background: "#444" }} />
            </div>
          );
        }

        // Sub-header: #### Header
        if (block.type === "sub-header") {
          return (
            <h4
              key={i}
              style={{
                margin: "16px 0 6px 0",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#ccc",
                borderBottom: "1px solid #333",
                paddingBottom: "4px",
              }}
            >
              {block.text}
            </h4>
          );
        }

        // Sub-header + bullet list
        if (block.type === "subheader-bullet") {
          return (
            <div key={i}>
              <h4
                style={{
                  margin: "16px 0 6px 0",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#ccc",
                  borderBottom: "1px solid #333",
                  paddingBottom: "4px",
                }}
              >
                {block.header}
              </h4>
              <ul
                style={{
                  margin: "4px 0 8px 0",
                  paddingLeft: "20px",
                  listStyleType: "disc",
                }}
              >
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Sub-header + numbered list
        if (block.type === "subheader-numbered") {
          return (
            <div key={i}>
              <h4
                style={{
                  margin: "16px 0 6px 0",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#ccc",
                  borderBottom: "1px solid #333",
                  paddingBottom: "4px",
                }}
              >
                {block.header}
              </h4>
              <ol
                start={block.startNum}
                style={{
                  margin: "4px 0 8px 0",
                  paddingLeft: "24px",
                  listStyleType: "decimal",
                }}
              >
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ol>
            </div>
          );
        }

        // Bullet list (with bold-prefix support)
        if (block.type === "bullet") {
          return (
            <ul
              key={i}
              style={{
                margin: "8px 0",
                paddingLeft: "20px",
                listStyleType: "disc",
              }}
            >
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (block.type === "numbered") {
          return (
            <ol
              key={i}
              start={block.startNum}
              style={{
                margin: "8px 0",
                paddingLeft: "24px",
                listStyleType: "decimal",
              }}
            >
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ol>
          );
        }

        // Header + bullet list
        if (block.type === "header-bullet") {
          return (
            <div key={i}>
              {block.headers.map((h, j) => (
                <p
                  key={`h${j}`}
                  style={{
                    margin: "8px 0 4px 0",
                    fontWeight: 600,
                    color: "#ccc",
                    lineHeight: 1.6,
                  }}
                >
                  <InlineMarkdown text={h} />
                </p>
              ))}
              <ul
                style={{
                  margin: "4px 0 8px 0",
                  paddingLeft: "20px",
                  listStyleType: "disc",
                }}
              >
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Header + numbered list
        if (block.type === "header-numbered") {
          return (
            <div key={i}>
              {block.headers.map((h, j) => (
                <p
                  key={`h${j}`}
                  style={{
                    margin: "8px 0 4px 0",
                    fontWeight: 600,
                    color: "#ccc",
                    lineHeight: 1.6,
                  }}
                >
                  <InlineMarkdown text={h} />
                </p>
              ))}
              <ol
                start={block.startNum}
                style={{
                  margin: "4px 0 8px 0",
                  paddingLeft: "24px",
                  listStyleType: "decimal",
                }}
              >
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ol>
            </div>
          );
        }

        // Section header (ends with :)
        if (block.type === "header") {
          return (
            <p
              key={i}
              style={{
                margin: "12px 0 4px 0",
                fontWeight: 600,
                color: "#ccc",
                fontSize: "0.95rem",
              }}
            >
              {block.text}
            </p>
          );
        }

        // Regular paragraph
        return (
          <p key={i} style={{ margin: "8px 0", lineHeight: 1.6 }}>
            <InlineMarkdown text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

/* ── Persistent Speed Selector (always visible) ──────────────── */
function SpeedSelector({ rate, onRateChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        background: "#1a1a2e",
        borderRadius: "8px",
        padding: "2px",
        border: "1px solid #333",
      }}
    >
      {SPEED_OPTIONS.map((speed) => (
        <button
          key={speed}
          onClick={() => onRateChange(speed)}
          style={{
            padding: "4px 8px",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: rate === speed ? 700 : 400,
            background: rate === speed ? "#646cff" : "transparent",
            color: rate === speed ? "#fff" : "#888",
            transition: "all 0.15s",
          }}
        >
          {speed}x
        </button>
      ))}
    </div>
  );
}

/* ── TTS Playback Controls (visible during playback) ─────────── */
function PlaybackControls({ ttsState }) {
  if (ttsState !== "playing" && ttsState !== "paused") return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        background: "#1a1a2e",
        borderRadius: "8px",
        padding: "2px 4px",
        border: "1px solid #333",
      }}
    >
      <button
        onClick={() =>
          ttsState === "paused" ? resumeSpeaking() : pauseSpeaking()
        }
        title={ttsState === "paused" ? "Resume" : "Pause"}
        style={{
          background: "none",
          border: "none",
          color: "#ccc",
          cursor: "pointer",
          fontSize: "0.95rem",
          padding: "4px 6px",
        }}
      >
        {ttsState === "paused" ? "▶" : "⏸"}
      </button>
      <button
        onClick={() => stopSpeaking()}
        title="Stop"
        style={{
          background: "none",
          border: "none",
          color: "#ef4444",
          cursor: "pointer",
          fontSize: "0.95rem",
          padding: "4px 6px",
        }}
      >
        ⏹
      </button>
    </div>
  );
}

/* ── Section Speaker Button ───────────────────────────────────── */
function SectionSpeaker({ content, ttsState }) {
  const isActive = ttsState === "playing" || ttsState === "paused";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (isActive) {
          stopSpeaking();
        } else {
          speakText(content);
        }
      }}
      title={isActive ? "Stop reading" : "Read this section"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "1.1rem",
        padding: "4px 8px",
        borderRadius: "6px",
        color: isActive ? "#f59e0b" : "#888",
        transition: "color 0.2s",
        flexShrink: 0,
      }}
    >
      {isActive ? "⏹" : "🔊"}
    </button>
  );
}

/* ── Accordion subtopic component ────────────────────────────── */
function Subtopic({ title, content, ttsState }) {
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
          gap: "8px",
        }}
      >
        <span style={{ flex: 1 }}>{title}</span>
        <SectionSpeaker content={content} ttsState={ttsState} />
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
            fontSize: "0.95rem",
          }}
        >
          <FormattedContent content={content} />
        </div>
      )}
    </div>
  );
}

/* ── Tab content panel for Setup / Rules / Strategy ──────────── */
function AccordionPanel({ subtopics, ttsState }) {
  if (!subtopics || subtopics.length === 0) {
    return (
      <div style={{ color: "#666", textAlign: "center", padding: "40px 0" }}>
        Content not yet available.
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {subtopics.map((st) => (
        <Subtopic
          key={st.id}
          title={st.title}
          content={st.content}
          ttsState={ttsState}
        />
      ))}
    </div>
  );
}

/* ── Q&A Chat Panel ──────────────────────────────────────────── */
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
      const answer = result.answer;
      setHistory((prev) => [...prev, { role: "assistant", content: answer }]);
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
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.75rem",
                    color: "#4ade80",
                    marginBottom: "4px",
                  }}
                >
                  <span>GameMaster AI</span>
                  <button
                    onClick={() => speakText(msg.content)}
                    title="Read aloud"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      color: "#888",
                      padding: "2px 4px",
                    }}
                  >
                    🔊
                  </button>
                </div>
              )}
              <FormattedContent content={msg.content} />
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
  const [ttsState, setTtsState] = useState("idle");
  const [ttsRate, setTtsRate] = useState(getRate());

  useEffect(() => {
    setOnStateChange((state) => {
      setTtsState(state);
    });
    setOnRateChange((rate) => {
      setTtsRate(rate);
    });
    return () => {
      setOnStateChange(null);
      setOnRateChange(null);
    };
  }, []);

  useEffect(() => {
    fetchGame(gameId)
      .then((data) => {
        setGameData(data);
        setGameTitle(data.title || gameId);
      })
      .catch(() => {
        setGameTitle(gameId);
      });
    return () => stopSpeaking();
  }, [gameId]);

  const handleRateChange = (newRate) => {
    setRate(newRate);
    setTtsRate(newRate);
  };

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
          onClick={() => {
            stopSpeaking();
            navigate("/");
          }}
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          ← Games
        </button>
        <h1 style={{ flex: 1, fontSize: "1.5rem", margin: 0 }}>{gameTitle}</h1>
        <PlaybackControls ttsState={ttsState} />
        <SpeedSelector rate={ttsRate} onRateChange={handleRateChange} />
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
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeTab === "setup" && (
          <AccordionPanel subtopics={tabs.setup?.subtopics} ttsState={ttsState} />
        )}
        {activeTab === "rules" && (
          <AccordionPanel subtopics={tabs.rules?.subtopics} ttsState={ttsState} />
        )}
        {activeTab === "strategy" && (
          <AccordionPanel
            subtopics={tabs.strategy?.subtopics}
            ttsState={ttsState}
          />
        )}
        {activeTab === "qa" && (
          <QAPanel gameId={gameId} gameTitle={gameTitle} />
        )}
      </div>
    </div>
  );
}
