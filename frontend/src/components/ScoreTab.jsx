import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../services/api";
import LobbyCreate from "./LobbyCreate";

const PLAYER_COLORS = [
  "#e94560", "#4a90d9", "#2ecc71", "#f39c12", "#9b59b6", "#e67e22",
  "#1abc9c", "#e74c3c",
];

const STICKY_BG = "#1a1a2e";

/* ── localStorage helpers ──────────────────────────────────────── */
function loadSavedSession(gameId) {
  try {
    const raw = localStorage.getItem(`gmai_score_${gameId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(gameId, data) {
  try {
    localStorage.setItem(`gmai_score_${gameId}`, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function clearSession(gameId) {
  localStorage.removeItem(`gmai_score_${gameId}`);
}

/* ── Main ScoreTab component ───────────────────────────────────── */
export default function ScoreTab({ gameId, gameTitle, playerCount }) {
  // Phases: setup | scoring | lobby
  const [phase, setPhase] = useState("setup");
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState([]);
  const [scoreConfig, setScoreConfig] = useState(null);
  const [rows, setRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [scores, setScores] = useState({});
  const [showTotal, setShowTotal] = useState(true);
  const [revealed, setRevealed] = useState(false);

  // Load score config from API
  useEffect(() => {
    fetch(`${API_BASE}/api/scores/${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.scoring_type !== "unavailable") {
          setScoreConfig(data);
        }
      })
      .catch(() => {});
  }, [gameId]);

  // Try to restore a saved session
  useEffect(() => {
    const saved = loadSavedSession(gameId);
    if (saved && saved.players?.length) {
      setPlayers(saved.players);
      setRows(saved.rows || []);
      setScores(saved.scores || {});
      setNumPlayers(saved.players.length);
      setShowTotal(saved.showTotal !== undefined ? saved.showTotal : true);
      setRevealed(saved.revealed || false);
      setPhase("scoring");
    }
  }, [gameId]);

  // Persist scores whenever they change
  const persistScores = useCallback((p, r, s, st, rev) => {
    saveSession(gameId, { players: p, rows: r, scores: s, showTotal: st, revealed: rev });
  }, [gameId]);

  useEffect(() => {
    if (phase === "scoring" && players.length > 0) {
      persistScores(players, rows, scores, showTotal, revealed);
    }
  }, [phase, players, rows, scores, showTotal, revealed, persistScores]);

  // Build default rows from score config or generic
  const buildDefaultRows = () => {
    if (scoreConfig?.categories?.length) {
      return scoreConfig.categories.map((c) => c.label || c.name || c.id);
    }
    return ["Score A", "Score B", "Score C"];
  };

  const handleStartLocal = () => {
    const defaultRows = buildDefaultRows();
    setRows(defaultRows);
    setScores({});
    setShowTotal(true);
    setRevealed(false);
    setPhase("scoring");
  };

  const handleStartLobby = () => {
    setPhase("lobby");
  };

  const handleNewGame = () => {
    clearSession(gameId);
    setPhase("setup");
    setPlayers([]);
    setRows([]);
    setScores({});
    setShowTotal(true);
    setRevealed(false);
  };

  const updatePlayerName = (idx, newName) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, name: newName } : p)));
  };

  const handleScoreChange = (rowKey, playerIdx, value) => {
    const numVal = value === "" ? "" : Number(value);
    setScores((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [playerIdx]: numVal },
    }));
  };

  const addRow = () => {
    setRows((prev) => [...prev, `Score ${String.fromCharCode(65 + prev.length)}`]);
  };

  const renameRow = (idx, newName) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? newName : r)));
  };

  const getPlayerTotal = (playerIdx) => {
    let total = 0;
    for (let i = 0; i < rows.length; i++) {
      total += Number((scores[`row_${i}`] || {})[playerIdx]) || 0;
    }
    return total;
  };

  /* ── Setup Phase ─────────────────────────────────────────────── */
  if (phase === "setup") {
    const minP = playerCount?.min || 2;
    const maxP = Math.max(playerCount?.max || 8, 8);

    // Sync player array when count changes
    const currentPlayers = Array.from({ length: numPlayers }, (_, i) => ({
      name: players[i]?.name || `Player ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    }));

    return (
      <div style={{ padding: "12px 0" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "1.15rem", color: "var(--text-primary)", textAlign: "center" }}>
          Score Tracker
        </h3>

        {/* Player count selector */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "20px" }}>
          <button
            onClick={() => setNumPlayers(Math.max(minP, numPlayers - 1))}
            style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: "var(--bg-secondary)", color: "var(--text-primary)",
              border: "1px solid var(--border)", fontSize: "1.3rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}
          >-</button>
          <span style={{ fontSize: "2rem", fontWeight: 700, minWidth: "50px", textAlign: "center", color: "var(--text-primary)" }}>
            {numPlayers}
          </span>
          <button
            onClick={() => setNumPlayers(Math.min(maxP, numPlayers + 1))}
            style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: "var(--bg-secondary)", color: "var(--text-primary)",
              border: "1px solid var(--border)", fontSize: "1.3rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}
          >+</button>
        </div>

        {/* Player name inputs */}
        <div style={{ maxWidth: "400px", margin: "0 auto 24px" }}>
          {currentPlayers.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px",
              background: "var(--bg-secondary)", borderRadius: "10px", padding: "6px 12px",
              border: `2px solid ${p.color}`,
            }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: p.color, flexShrink: 0,
              }} />
              <input
                type="text"
                value={p.name}
                onChange={(e) => {
                  const updated = [...currentPlayers];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setPlayers(updated);
                }}
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: "8px",
                  border: "1px solid var(--border)", background: "var(--bg-primary)",
                  color: "var(--text-primary)", fontSize: "0.95rem", outline: "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Mode buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { setPlayers(currentPlayers); handleStartLocal(); }}
            style={{
              padding: "14px 28px", borderRadius: "12px", fontWeight: 700,
              background: "var(--accent)", color: "#fff", border: "none",
              fontSize: "1rem", cursor: "pointer", minWidth: "160px",
            }}
          >
            Start Now
          </button>
          <button
            onClick={() => { setPlayers(currentPlayers); handleStartLobby(); }}
            style={{
              padding: "14px 28px", borderRadius: "12px", fontWeight: 700,
              background: "var(--bg-card)", color: "var(--text-primary)",
              border: "2px solid var(--border)", fontSize: "1rem",
              cursor: "pointer", minWidth: "160px",
            }}
          >
            Play Together
          </button>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "12px" }}>
          <strong>Start Now</strong> — score on this device &nbsp;|&nbsp; <strong>Play Together</strong> — sync across devices
        </p>
      </div>
    );
  }

  /* ── Lobby Phase ─────────────────────────────────────────────── */
  if (phase === "lobby") {
    return (
      <div>
        <button
          onClick={() => setPhase("setup")}
          style={{
            padding: "6px 14px", fontSize: "0.85rem", marginBottom: "8px",
            background: "none", border: "1px solid var(--border)",
            color: "var(--text-secondary)", borderRadius: "8px", cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <LobbyCreate gameId={gameId} gameTitle={gameTitle} />
      </div>
    );
  }

  /* ── Scoring Phase (local) ───────────────────────────────────── */
  return (
    <div style={{ padding: "4px 0" }}>
      {/* Controls bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        flexWrap: "wrap",
      }}>
        <label style={{
          display: "flex", alignItems: "center", gap: "6px",
          fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={showTotal}
            onChange={(e) => setShowTotal(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Show Running Total
        </label>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleNewGame}
          style={{
            padding: "6px 14px", fontSize: "0.8rem", borderRadius: "8px",
            background: "none", border: "1px solid var(--border)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          New Game
        </button>
      </div>

      {/* Transposed score table */}
      <div style={{ overflowX: "auto", marginBottom: "16px", WebkitOverflowScrolling: "touch" }}>
        <table style={{
          width: "100%", borderCollapse: "separate", borderSpacing: 0,
          background: "var(--bg-card)", borderRadius: "12px",
          border: "1px solid var(--border)", minWidth: `${130 + players.length * 90}px`,
        }}>
          <thead>
            <tr>
              <th style={{
                padding: "12px 14px", textAlign: "left", fontSize: "0.85rem",
                color: "var(--text-secondary)", borderBottom: "1px solid var(--border)",
                background: STICKY_BG, minWidth: "130px",
                position: "sticky", left: 0, zIndex: 2,
              }}>
                Score Type
              </th>
              {players.map((player, pIdx) => (
                <th key={pIdx} style={{
                  padding: "10px 8px", textAlign: "center", fontSize: "0.85rem",
                  borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)",
                  minWidth: "80px", whiteSpace: "nowrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: player.color, flexShrink: 0,
                    }} />
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayerName(pIdx, e.target.value)}
                      style={{
                        background: "transparent", border: "none", color: "var(--text-primary)",
                        fontWeight: 500, fontSize: "0.85rem", textAlign: "center",
                        width: "70px", outline: "none", padding: "2px 0",
                      }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowLabel, rIdx) => {
              const rowKey = `row_${rIdx}`;
              return (
                <tr key={rIdx}>
                  <td
                    onClick={() => setEditingRow(rIdx)}
                    style={{
                      padding: "10px 14px", borderBottom: "1px solid var(--border)",
                      fontSize: "0.9rem", color: "var(--text-secondary)", cursor: "pointer",
                      position: "sticky", left: 0, zIndex: 1, background: STICKY_BG,
                      fontWeight: 500,
                    }}
                  >
                    {editingRow === rIdx ? (
                      <input
                        type="text"
                        value={rowLabel}
                        onChange={(e) => renameRow(rIdx, e.target.value)}
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingRow(null)}
                        autoFocus
                        style={{
                          width: "100%", fontSize: "0.9rem",
                          background: "var(--bg-primary)", border: "1px solid var(--accent)",
                          borderRadius: "6px", padding: "4px 8px", color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                    ) : rowLabel}
                  </td>
                  {players.map((_, pIdx) => {
                    const val = (scores[rowKey] || {})[pIdx];
                    return (
                      <td key={pIdx} style={{ padding: "6px 4px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={val === undefined || val === "" ? "" : val}
                          onChange={(e) => handleScoreChange(rowKey, pIdx, e.target.value)}
                          style={{
                            width: "100%", maxWidth: "70px", padding: "8px 4px", textAlign: "center",
                            fontSize: "1rem", fontWeight: 600, fontFamily: "monospace",
                            borderRadius: "8px", border: "1px solid var(--border)",
                            background: "var(--bg-primary)", color: "var(--text-primary)",
                            outline: "none",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Total row — visible or blurred */}
            {showTotal && (
              <tr>
                <td style={{
                  padding: "12px 14px", borderTop: "2px solid var(--border)",
                  fontSize: "0.9rem", fontWeight: 700, color: "var(--accent)",
                  position: "sticky", left: 0, zIndex: 1, background: STICKY_BG,
                }}>
                  Total
                </td>
                {players.map((_, pIdx) => (
                  <td key={pIdx} style={{
                    padding: "12px 14px", borderTop: "2px solid var(--border)",
                    textAlign: "center", fontWeight: 700, fontSize: "1.1rem",
                    fontFamily: "monospace", color: "var(--accent)",
                  }}>
                    {getPlayerTotal(pIdx)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Score Type */}
      <button
        onClick={addRow}
        style={{
          padding: "8px 20px", borderRadius: "10px", fontSize: "0.9rem",
          background: "var(--bg-card)", color: "var(--text-secondary)",
          border: "1px solid var(--border)", cursor: "pointer", marginBottom: "16px",
        }}
      >
        + Add Score Type
      </button>

      {/* Reveal Final Score (only when total is hidden) */}
      {!showTotal && !revealed && (
        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <button
            onClick={() => { setRevealed(true); setShowTotal(true); }}
            style={{
              padding: "14px 32px", borderRadius: "12px", fontWeight: 700,
              background: "linear-gradient(135deg, var(--accent), #ff6b6b)",
              color: "#fff", border: "none", fontSize: "1.05rem",
              cursor: "pointer", boxShadow: "0 4px 16px rgba(233,69,96,0.3)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            Reveal Final Scores
          </button>
        </div>
      )}

      {/* Winner banner after reveal */}
      {revealed && (
        <div style={{
          textAlign: "center", padding: "16px", marginBottom: "12px",
          background: "var(--bg-card)", borderRadius: "12px",
          border: "2px solid var(--accent)",
          animation: "scoreReveal 0.5s ease-out",
        }}>
          {(() => {
            let maxScore = -Infinity;
            let winners = [];
            players.forEach((p, i) => {
              const t = getPlayerTotal(i);
              if (t > maxScore) { maxScore = t; winners = [p.name]; }
              else if (t === maxScore) winners.push(p.name);
            });
            return (
              <>
                <div style={{ fontSize: "1.8rem", marginBottom: "4px" }}>{"\uD83C\uDFC6"}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)" }}>
                  {winners.length > 1 ? `It's a tie! ${winners.join(" & ")}` : `${winners[0]} wins!`}
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {maxScore} points
                </div>
              </>
            );
          })()}
        </div>
      )}

      <style>{`
        @keyframes scoreReveal {
          0% { opacity: 0; transform: scale(0.8); }
          50% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
