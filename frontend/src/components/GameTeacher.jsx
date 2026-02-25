import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { queryGame, fetchGame, fetchVenueConfig } from "../services/api";
import VoiceButton from "./VoiceButton";
import Leaderboard from "./Leaderboard";

import ExpansionInfo from "./ExpansionInfo";
import ScoreTab from "./ScoreTab";
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

import { API_BASE } from "../services/api";

const TABS = [
  { key: "setup", label: "Setup" },
  { key: "rules", label: "Rules" },
  { key: "strategy", label: "Strategy" },
  { key: "qa", label: "Q&A & Notes" },
  { key: "score", label: "Score" },
];

const SPEED_OPTIONS = [0.75, 1.0, 1.25];

// Mock MSRP prices by complexity range
const MSRP_PRICES = {
  // Party games: $14.99 - $24.99
  "codenames": 19.99, "skull": 14.99, "love-letter": 14.99, "coup": 14.99,
  "one-night-ultimate-werewolf": 24.99, "dixit": 34.99, "just-one": 24.99,
  "wavelength": 29.99, "sushi-go-party": 22.99, "telestrations": 19.99, "decrypto": 24.99,
  // Gateway: $29.99 - $44.99
  "catan": 44.99, "ticket-to-ride": 44.99, "azul": 39.99, "splendor": 39.99,
  "kingdomino": 29.99, "carcassonne": 34.99, "pandemic": 44.99, "king-of-tokyo": 39.99,
  "patchwork": 29.99, "takenoko": 44.99, "mysterium": 44.99,
  // Midweight: $44.99 - $59.99
  "wingspan": 59.99, "everdell": 59.99, "viticulture": 54.99, "dominion": 44.99,
  "7-wonders": 49.99, "lords-of-waterdeep": 49.99, "quacks-of-quedlinburg": 44.99,
  "clank": 54.99, "sagrada": 44.99, "the-crew": 14.99, "century-spice-road": 39.99,
  "sheriff-of-nottingham": 39.99, "concordia": 59.99, "villainous": 39.99,
  "above-and-below": 44.99, "photosynthesis": 39.99, "dead-of-winter": 54.99,
  "castles-of-burgundy": 39.99, "cosmic-encounter": 49.99,
  // Heavy: $54.99 - $79.99
  "terraforming-mars": 69.99, "root": 59.99, "spirit-island": 79.99,
  "brass-birmingham": 69.99, "great-western-trail": 69.99, "agricola": 59.99,
  "power-grid": 44.99,
};

// Mock BGG ratings and difficulty (1-5 scale)
const GAME_META = {
  "catan": { bgg: 7.1, difficulty: 2.3, playTime: 75, designer: "Klaus Teuber" },
  "wingspan": { bgg: 8.1, difficulty: 2.4, playTime: 60, designer: "Elizabeth Hargrave" },
  "ticket-to-ride": { bgg: 7.4, difficulty: 1.8, playTime: 60, designer: "Alan R. Moon" },
  "pandemic": { bgg: 7.6, difficulty: 2.4, playTime: 45, designer: "Matt Leacock" },
  "azul": { bgg: 7.8, difficulty: 1.8, playTime: 35, designer: "Michael Kiesling" },
  "splendor": { bgg: 7.4, difficulty: 1.8, playTime: 30, designer: "Marc Andre" },
  "codenames": { bgg: 7.6, difficulty: 1.3, playTime: 15, designer: "Vlaada Chvatil" },
  "terraforming-mars": { bgg: 8.4, difficulty: 3.2, playTime: 120, designer: "Jacob Fryxelius" },
  "root": { bgg: 8.1, difficulty: 3.6, playTime: 90, designer: "Cole Wehrle" },
  "spirit-island": { bgg: 8.3, difficulty: 4.0, playTime: 120, designer: "R. Eric Reuss" },
  "7-wonders": { bgg: 7.7, difficulty: 2.3, playTime: 30, designer: "Antoine Bauza" },
  "dominion": { bgg: 7.6, difficulty: 2.4, playTime: 30, designer: "Donald X. Vaccarino" },
  "king-of-tokyo": { bgg: 7.2, difficulty: 1.5, playTime: 30, designer: "Richard Garfield" },
  "carcassonne": { bgg: 7.4, difficulty: 1.9, playTime: 40, designer: "Klaus-Jurgen Wrede" },
  "everdell": { bgg: 7.8, difficulty: 2.8, playTime: 60, designer: "James A. Wilson" },
  "brass-birmingham": { bgg: 8.6, difficulty: 3.9, playTime: 120, designer: "Gavan Brown" },
  "great-western-trail": { bgg: 8.3, difficulty: 3.7, playTime: 120, designer: "Alexander Pfister" },
  "agricola": { bgg: 7.9, difficulty: 3.6, playTime: 90, designer: "Uwe Rosenberg" },
  "concordia": { bgg: 8.1, difficulty: 3.0, playTime: 90, designer: "Mac Gerdts" },
  "viticulture": { bgg: 7.9, difficulty: 2.9, playTime: 75, designer: "Jamey Stegmaier" },
  "clank": { bgg: 7.6, difficulty: 2.2, playTime: 60, designer: "Paul Dennen" },
  "coup": { bgg: 7.0, difficulty: 1.4, playTime: 15, designer: "Rikki Tahta" },
  "dixit": { bgg: 7.2, difficulty: 1.2, playTime: 30, designer: "Jean-Louis Roubira" },
  "love-letter": { bgg: 7.2, difficulty: 1.2, playTime: 20, designer: "Seiji Kanai" },
  "skull": { bgg: 7.1, difficulty: 1.1, playTime: 20, designer: "Herve Marly" },
  "patchwork": { bgg: 7.8, difficulty: 1.6, playTime: 25, designer: "Uwe Rosenberg" },
  "sagrada": { bgg: 7.4, difficulty: 1.9, playTime: 40, designer: "Adrian Adamescu" },
  "kingdomino": { bgg: 7.3, difficulty: 1.5, playTime: 20, designer: "Bruno Cathala" },
  "the-crew": { bgg: 7.9, difficulty: 2.0, playTime: 20, designer: "Thomas Sing" },
  "quacks-of-quedlinburg": { bgg: 7.6, difficulty: 1.9, playTime: 45, designer: "Wolfgang Warsch" },
  "power-grid": { bgg: 7.8, difficulty: 3.3, playTime: 120, designer: "Friedemann Friese" },
};

/* ── Difficulty Meter ──────────────────────────────────────────── */
function DifficultyMeter({ value }) {
  if (!value) return null;
  const pct = (value / 5) * 100;
  const label = value <= 1.5 ? "Easy" : value <= 2.5 ? "Medium" : value <= 3.5 ? "Hard" : "Expert";
  const color = value <= 1.5 ? "#22c55e" : value <= 2.5 ? "#3b82f6" : value <= 3.5 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Difficulty:</span>
      <div style={{ width: "60px", height: "6px", borderRadius: "3px", background: "var(--bg-primary)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "0.75rem", color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ── Metadata Bar ──────────────────────────────────────────────── */
function MetadataBar({ gameId, gameData }) {
  const meta = GAME_META[gameId];
  if (!meta && !gameData?.player_count) return null;

  const items = [];
  if (gameData?.player_count) {
    items.push({ icon: "👥", label: `${gameData.player_count.min}-${gameData.player_count.max} Players` });
  }
  if (meta?.playTime) {
    items.push({ icon: "⏱", label: `${meta.playTime} min` });
  }
  if (meta?.bgg) {
    items.push({ icon: "⭐", label: `${meta.bgg} BGG` });
  }
  if (meta?.designer) {
    items.push({ icon: "✏️", label: meta.designer });
  }

  return (
    <div style={{
      display: "flex", gap: "12px", flexWrap: "wrap", padding: "8px 12px",
      background: "var(--bg-secondary)", borderRadius: "10px",
      border: "1px solid var(--border)", marginBottom: "8px",
    }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </span>
      ))}
      {meta && <DifficultyMeter value={meta.difficulty} />}
    </div>
  );
}

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
    // Check if there are bullet points after the divider
    if (lines0.length > 1) {
      const restLines = lines0.slice(1).filter((l) => l.trim());
      const bulletLines = restLines.filter((l) => l.trim().startsWith("- "));
      const numberedLines = restLines.filter((l) => /^\d+[\).]\s/.test(l.trim()));
      if (bulletLines.length > 0) {
        return { type: "player-count-section", text: label, items: bulletLines.map((l) => l.trim().replace(/^- /, "")), raw: trimmed };
      }
      if (numberedLines.length > 0) {
        const numMatch = numberedLines[0].trim().match(/^(\d+)[\).]/);
        return { type: "player-count-section-numbered", text: label, items: numberedLines.map((l) => l.trim().replace(/^\d+[\).]\s*/, "")), startNum: numMatch ? parseInt(numMatch[1], 10) : 1, raw: trimmed };
      }
    }
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
  // Pre-split: ensure --- X Players --- headers always start new paragraphs.
  // Without this, "#### Header\n--- 2 Players ---\n- bullet" stays as one
  // paragraph and the --- divider label gets dropped by classifyParagraph.
  const preprocessed = content.replace(/\n(---\s+.+\s+---)/g, "\n\n$1");
  const paragraphs = preprocessed.split("\n\n");
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

        if (block.type === "player-count-section") {
          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0 8px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{block.text}</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>
              <ul style={{ margin: "4px 0 8px 0", paddingLeft: "20px", listStyleType: "disc" }}>
                {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
              </ul>
            </div>
          );
        }

        if (block.type === "player-count-section-numbered") {
          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0 8px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{block.text}</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>
              <ol start={block.startNum} style={{ margin: "4px 0 8px 0", paddingLeft: "24px", listStyleType: "decimal" }}>
                {block.items.map((item, j) => (<li key={j} style={{ marginBottom: "6px", lineHeight: 1.6 }}><InlineMarkdown text={item} /></li>))}
              </ol>
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
      aria-label={isActive ? "Stop reading aloud" : "Read this section aloud"}
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
        aria-expanded={open}
        aria-label={`${title} section`}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: open ? "var(--bg-card)" : "var(--bg-primary)", color: "var(--text-primary)", border: "none", borderRadius: 0, cursor: "pointer", fontSize: "1rem", fontWeight: 600, textAlign: "left", gap: "8px" }}
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
        title="Helpful" aria-label="Rate response as helpful"
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
        title="Not helpful" aria-label="Rate response as not helpful"
      >
        👎
      </button>
    </div>
  );
}

/* ── Copy Button ────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "0.8rem", padding: "2px 6px", borderRadius: "4px",
        color: copied ? "#22c55e" : "var(--text-secondary)",
        transition: "color 0.15s",
      }}
    >
      {copied ? "Copied!" : "\u{1F4CB}"}
    </button>
  );
}

/* ── Notes Section ─────────────────────────────────────────────── */
function NotesSection({ gameId }) {
  const storageKey = `gmai-notes-${gameId}`;
  const [notes, setNotes] = useState("");
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("gmai-notes-collapsed") !== "false"; } catch { return true; }
  });
  const saveTimerRef = useRef(null);

  // Load notes on mount / gameId change
  useEffect(() => {
    try { setNotes(localStorage.getItem(storageKey) || ""); } catch { /* ignore */ }
  }, [storageKey]);

  // Debounced save (2s)
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, notes); } catch { /* ignore */ }
    }, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [notes, storageKey]);

  // Persist collapsed state
  useEffect(() => {
    try { localStorage.setItem("gmai-notes-collapsed", String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setNotes((prev) => prev ? prev + "\n" + text : text);
    } catch { /* clipboard permission denied */ }
  };

  return (
    <div style={{
      borderTop: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      flex: collapsed ? "0 0 auto" : "1 1 50%",
      minHeight: collapsed ? "auto" : "120px",
    }}>
      {/* Header bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "10px 14px",
          background: "var(--bg-secondary)", color: "var(--text-primary)",
          border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: "0.7rem", display: "inline-block" }}>
            ▼
          </span>
          Notes
        </span>
        {notes && collapsed && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>
            {notes.length > 30 ? notes.slice(0, 30) + "..." : notes}
          </span>
        )}
      </button>

      {/* Expanded notes area */}
      {!collapsed && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 12px", background: "var(--bg-primary)", minHeight: 0 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down rules, strategies, or anything to remember..."
            style={{
              flex: 1, width: "100%", padding: "10px", borderRadius: "8px",
              border: "1px solid var(--border)", background: "var(--bg-card)",
              color: "var(--text-primary)", fontSize: "0.9rem", resize: "none",
              outline: "none", boxSizing: "border-box", lineHeight: 1.6,
              minHeight: "80px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
            <button
              onClick={handlePaste}
              style={{
                padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem",
                background: "var(--bg-secondary)", color: "var(--text-secondary)",
                border: "1px solid var(--border)", cursor: "pointer", fontWeight: 500,
              }}
            >
              Paste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Q&A & Notes Panel ─────────────────────────────────────────── */
function QAPanel({ gameId, gameTitle }) {
  const historyKey = `gmai-qa-${gameId}`;
  const [input, setInput] = useState("");
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const historyEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Persist chat history
  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* ignore */ }
  }, [history, historyKey]);

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(historyKey); } catch { /* ignore */ }
  };

  const handleSubmit = async (questionText) => {
    const question = (questionText || input).trim();
    if (!question || loading) return;
    const ts = new Date().toISOString();
    if (!navigator.onLine) {
      setHistory((prev) => [...prev, { role: "user", content: question, timestamp: ts }, { role: "error", content: "Requires internet connection — please check your network and try again.", timestamp: ts }]);
      setInput("");
      return;
    }
    setInput("");
    setHistory((prev) => [...prev, { role: "user", content: question, timestamp: ts }]);
    setLoading(true);
    try {
      const result = await queryGame(gameId, question);
      setHistory((prev) => [...prev, { role: "assistant", content: result.answer, question, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setHistory((prev) => [...prev, { role: "error", content: err.message || "Something went wrong", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ── Top half: Chat ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: "1 1 50%", minHeight: 0 }}>
        {/* Clear history link */}
        {history.length > 0 && (
          <div style={{ textAlign: "right", marginBottom: "4px" }}>
            <button onClick={clearHistory} style={{
              background: "none", border: "none", color: "var(--text-secondary)",
              fontSize: "0.75rem", cursor: "pointer", padding: "2px 6px",
              textDecoration: "underline", opacity: 0.7,
            }}>
              Clear History
            </button>
          </div>
        )}

        {/* Chat messages */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "8px", padding: "10px", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border)", minHeight: 0 }}>
          {history.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "30px", fontSize: "0.9rem" }}>
              Ask a question about {gameTitle} to get started!
            </p>
          ) : (
            history.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "10px", padding: "10px 14px", borderRadius: "10px",
                  background: msg.role === "user" ? "var(--bg-card)" : msg.role === "error" ? "#4a1a1a" : "#0f2a0f",
                  maxWidth: msg.role === "user" ? "80%" : "100%",
                  marginLeft: msg.role === "user" ? "auto" : 0,
                  lineHeight: 1.5, fontSize: "0.9rem", position: "relative",
                }}
              >
                {msg.role === "user" && (<div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "3px" }}>You</div>)}
                {msg.role === "assistant" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", color: "#4ade80", marginBottom: "3px" }}>
                    <span>GameMaster AI</span>
                    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                      <CopyButton text={msg.content} />
                      <button onClick={() => speakText(msg.content)} title="Read aloud" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)", padding: "2px 4px" }}>🔊</button>
                    </div>
                  </div>
                )}
                <FormattedContent content={msg.content} />
                {msg.role === "assistant" && (
                  <FeedbackButtons gameId={gameId} question={msg.question} response={msg.content} />
                )}
              </div>
            ))
          )}
          {loading && (
            <div style={{ padding: "10px 14px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "16px", height: "16px", border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spinnerRotate 0.6s linear infinite", flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem" }}>Thinking...</span>
            </div>
          )}
          <div ref={historyEndRef} />
        </div>

        {/* Input row */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
          <VoiceButton onResult={(text) => handleSubmit(text)} disabled={loading} />
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Ask about ${gameTitle}...`} disabled={loading} aria-label={`Ask a question about ${gameTitle}`}
            style={{ flex: 1, padding: "12px 14px", fontSize: "0.95rem", borderRadius: "12px", border: "2px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none" }}
          />
          <button onClick={() => handleSubmit()} disabled={loading || !input.trim()} aria-label="Submit question"
            style={{ padding: "12px 20px", fontSize: "0.95rem", borderRadius: "12px", background: loading || !input.trim() ? "var(--border)" : "var(--accent)", color: "#fff", border: "none", fontWeight: 600 }}
          >
            Ask
          </button>
        </div>
      </div>

      {/* ── Bottom half: Notes ── */}
      <NotesSection gameId={gameId} />
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

/* ── Game Cover Thumbnail ─────────────────────────────────────── */
function GameCoverThumb({ gameId }) {
  const [src, setSrc] = useState(`${API_BASE}/api/images/${gameId}.jpg`);
  const [error, setError] = useState(false);
  const triedPng = useRef(false);
  if (error) return null;
  return (
    <img
      src={src}
      alt=""
      onError={() => {
        if (!triedPng.current) {
          triedPng.current = true;
          setSrc(`${API_BASE}/api/images/${gameId}.png`);
        } else {
          setError(true);
        }
      }}
      style={{
        width: "40px", height: "40px", borderRadius: "8px",
        objectFit: "cover", flexShrink: 0,
        border: "1px solid var(--border)",
      }}
    />
  );
}

/* ── MSRP Price Badge ──────────────────────────────────────────── */
function PriceBadge({ gameId }) {
  const price = MSRP_PRICES[gameId];
  if (!price) return null;
  return (
    <span style={{
      fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500,
      background: "var(--bg-card)", padding: "2px 10px", borderRadius: "999px",
      border: "1px solid var(--border)", whiteSpace: "nowrap",
    }}>
      ${price.toFixed(2)}
    </span>
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
  const [gameLoading, setGameLoading] = useState(true);
  const [gameError, setGameError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [venueConfig, setVenueConfig] = useState({
    venue_name: "Meepleville",
    venue_tagline: "Las Vegas Board Game Cafe",
    accent_color: "#e94560",
  });
  const [ttsRate, setTtsRate] = useState(() => {
    const saved = getRate();
    if (!SPEED_OPTIONS.includes(saved)) { setRate(1.0); return 1.0; }
    return saved;
  });

  // Fetch venue config
  useEffect(() => {
    fetchVenueConfig()
      .then((data) => {
        setVenueConfig(data);
        if (data.accent_color) {
          document.documentElement.style.setProperty("--accent", data.accent_color);
        }
      })
      .catch(() => { /* Use mock fallback */ });
  }, []);

  useEffect(() => {
    setOnStateChange((state) => setTtsState(state));
    setOnRateChange((rate) => setTtsRate(rate));
    return () => { setOnStateChange(null); setOnRateChange(null); };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    setGameLoading(true);
    setGameError(null);
    fetchGame(gameId)
      .then((data) => { setGameData(data); setGameTitle(data.title || gameId); })
      .catch(() => { setGameTitle(gameId); setGameError("GameMaster is taking a break — try again in a moment"); })
      .finally(() => setGameLoading(false));
    return () => stopSpeaking();
  }, [gameId]);

  const handleRateChange = (newRate) => { setRate(newRate); setTtsRate(newRate); };
  const tabs = gameData?.tabs || {};

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100vh", maxWidth: "800px", margin: "0 auto", padding: "16px", paddingTop: "60px" }}>
      {/* Background art watermark */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `url(${API_BASE}/api/images/${gameId}.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.08,
          filter: "blur(4px)",
        }}
      />
      {/* All content above background */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
        <button onClick={() => { stopSpeaking(); navigate("/games"); }} aria-label="Back to game selector" style={{ padding: "8px 16px", fontSize: "0.9rem" }}>← Games</button>
        <GameCoverThumb gameId={gameId} />
        <h1 style={{ flex: 1, fontSize: "1.4rem", margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {gameTitle}
          <PriceBadge gameId={gameId} />
        </h1>
        <GameTimer />
        <PlaybackControls ttsState={ttsState} />
        <SpeedSelector rate={ttsRate} onRateChange={handleRateChange} />
      </div>


      {/* Offline banner */}
      {isOffline && (
        <div style={{ background: "#4a3a1a", borderRadius: "8px", padding: "8px 16px", marginBottom: "8px", textAlign: "center", fontSize: "0.85rem", color: "#f59e0b", border: "1px solid #5a4a2a" }}>
          You're offline — some features may not work
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} role="tab" aria-selected={activeTab === t.key} aria-label={`${t.label} tab`}
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

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", paddingBottom: (activeTab === "setup" || activeTab === "rules" || activeTab === "strategy") ? "70px" : 0 }}>
        {gameLoading ? (
          <div style={{ padding: "16px 0" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: "52px", marginBottom: "8px", borderRadius: "10px", background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            ))}
          </div>
        ) : gameError ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "16px" }}>{gameError}</p>
            <button onClick={() => { setGameError(null); setGameLoading(true); fetchGame(gameId).then((data) => { setGameData(data); setGameTitle(data.title || gameId); }).catch(() => setGameError("GameMaster is taking a break — try again in a moment")).finally(() => setGameLoading(false)); }}
              aria-label="Retry loading game" style={{ padding: "12px 28px", borderRadius: "12px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            {activeTab === "setup" && <AccordionPanel subtopics={tabs.setup?.subtopics} ttsState={ttsState} />}
            {activeTab === "rules" && <AccordionPanel subtopics={tabs.rules?.subtopics} ttsState={ttsState} />}
            {activeTab === "strategy" && <AccordionPanel subtopics={tabs.strategy?.subtopics} ttsState={ttsState} />}
            {activeTab === "qa" && <QAPanel gameId={gameId} gameTitle={gameTitle} />}
            {activeTab === "score" && (
              <div>
                <ScoreTab
                  gameId={gameId}
                  gameTitle={gameTitle}
                  playerCount={gameData?.player_count}
                />
                {/* Divider */}
                <div style={{ height: "1px", background: "var(--border)", margin: "16px 0" }} />
                <Leaderboard gameId={gameId} gameTitle={gameTitle} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expansions */}
      {!gameLoading && !gameError && (
        <ExpansionInfo gameId={gameId} gameTitle={gameTitle} />
      )}

      {/* ── TTS Bottom Bar (Setup/Rules/Strategy tabs only) ─── */}
      {(activeTab === "setup" || activeTab === "rules" || activeTab === "strategy") && !gameLoading && !gameError && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--bg-primary)", borderTop: "1px solid var(--border)",
          padding: "10px 16px", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          {/* Play / Pause */}
          <button
            onClick={() => {
              if (ttsState === "playing") { pauseSpeaking(); }
              else if (ttsState === "paused") { resumeSpeaking(); }
              else {
                const subtopics = tabs[activeTab]?.subtopics;
                if (subtopics?.length) {
                  const fullText = subtopics.map((s) => `${s.title}. ${s.content}`).join("\n\n");
                  speakText(fullText);
                }
              }
            }}
            style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: ttsState === "playing" || ttsState === "paused" ? "var(--accent)" : "var(--bg-card)",
              color: ttsState === "playing" || ttsState === "paused" ? "#fff" : "var(--text-primary)",
              border: ttsState === "playing" || ttsState === "paused" ? "none" : "1px solid var(--border)",
              fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={ttsState === "playing" ? "Pause" : ttsState === "paused" ? "Resume" : "Read aloud"}
          >
            {ttsState === "playing" ? "⏸" : "▶"}
          </button>

          {/* Stop */}
          {(ttsState === "playing" || ttsState === "paused") && (
            <button
              onClick={() => stopSpeaking()}
              style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "var(--bg-card)", color: "var(--text-primary)",
                border: "1px solid var(--border)", fontSize: "1.2rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title="Stop"
            >
              ⏹
            </button>
          )}

          {/* Speed selector */}
          <SpeedSelector rate={ttsRate} onRateChange={handleRateChange} />
        </div>
      )}

      </div>{/* end content wrapper */}
    </div>
  );
}
