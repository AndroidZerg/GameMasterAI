import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE, getLobbyState, updateLobbyScores, leaveLobby, kickPlayer } from "../services/api";

const PLAYER_COLORS = [
  "#e94560", "#4a90d9", "#2ecc71", "#f39c12", "#9b59b6", "#e67e22",
  "#1abc9c", "#e74c3c",
];

const STICKY_BG = "#1a1a2e";

export default function LobbyScoreTracker() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [error, setError] = useState("");
  const [kicked, setKicked] = useState(false);
  // Rows = scoring types; columns = players (transposed)
  const [rows, setRows] = useState(["Score A", "Score B", "Score C"]);
  const [editingRow, setEditingRow] = useState(null);
  // localScores: { "row_0": { "player-uuid": 5, ... }, "row_1": { ... } }
  const [localScores, setLocalScores] = useState({});
  const [showTotal, setShowTotal] = useState(false); // Default OFF for Play Together
  const [revealed, setRevealed] = useState(false);
  const pollRef = useRef(null);
  const lastPushRef = useRef("");

  const playerId = localStorage.getItem("gmai_player_id");
  const isHost = lobby?.host_id === playerId;

  // Load game-specific score types from API
  useEffect(() => {
    if (!lobby?.game_id) return;
    fetch(`${API_BASE}/api/scores/${lobby.game_id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.scoring_type !== "unavailable" && data.categories?.length) {
          setRows(data.categories.map((c) => c.label || c.name || c.id));
        }
      })
      .catch(() => {});
  }, [lobby?.game_id]);

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`gmai_lobby_scores_${lobbyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.scores) setLocalScores(parsed.scores);
        if (parsed.showTotal !== undefined) setShowTotal(parsed.showTotal);
        if (parsed.revealed) setRevealed(parsed.revealed);
      }
    } catch { /* ignore */ }
  }, [lobbyId]);

  // Persist to localStorage
  useEffect(() => {
    if (Object.keys(localScores).length === 0) return;
    try {
      localStorage.setItem(`gmai_lobby_scores_${lobbyId}`, JSON.stringify({
        scores: localScores, showTotal, revealed,
      }));
    } catch { /* ignore */ }
  }, [lobbyId, localScores, showTotal, revealed]);

  // Poll lobby state every 2s
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const state = await getLobbyState(lobbyId);
        if (!mounted) return;

        if (state.kicked?.includes(playerId)) {
          setKicked(true);
          clearInterval(pollRef.current);
          return;
        }

        setLobby(state);

        // Merge remote scores — remote wins for keys we haven't locally changed
        const remoteScores = state.scores?.shared || {};
        setLocalScores((prev) => {
          const merged = { ...prev };
          for (const [rowKey, rowScores] of Object.entries(remoteScores)) {
            if (!merged[rowKey]) {
              merged[rowKey] = { ...rowScores };
            } else {
              merged[rowKey] = { ...rowScores, ...merged[rowKey] };
              for (const [pid, val] of Object.entries(rowScores)) {
                if (merged[rowKey][pid] === undefined) {
                  merged[rowKey][pid] = val;
                }
              }
            }
          }
          return merged;
        });
      } catch {
        if (mounted) setError("Session ended or not found");
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(pollRef.current); };
  }, [lobbyId, playerId]);

  // Push all scores to server when local scores change
  useEffect(() => {
    if (!playerId || Object.keys(localScores).length === 0) return;
    const serialized = JSON.stringify(localScores);
    if (serialized === lastPushRef.current) return;
    lastPushRef.current = serialized;
    updateLobbyScores(lobbyId, "shared", localScores).catch(() => {});
  }, [lobbyId, playerId, localScores]);

  const handleScoreChange = (rowKey, pid, value) => {
    const numVal = value === "" ? "" : Number(value);
    setLocalScores((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [pid]: numVal },
    }));
  };

  const handleLeave = async () => {
    try { await leaveLobby(lobbyId, playerId); } catch { /* ignore */ }
    localStorage.removeItem("gmai_lobby_id");
    localStorage.removeItem("gmai_player_id");
    localStorage.removeItem(`gmai_lobby_scores_${lobbyId}`);
    navigate("/games");
  };

  const handleKick = async (kickId) => {
    try { await kickPlayer(lobbyId, playerId, kickId); } catch { /* ignore */ }
  };

  const addRow = () => {
    setRows((prev) => [...prev, `Score ${String.fromCharCode(65 + prev.length)}`]);
  };

  const renameRow = (idx, newName) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? newName : r)));
  };

  const getPlayerTotal = (pid) => {
    let total = 0;
    for (const rowKey of rows.map((_, i) => `row_${i}`)) {
      total += Number((localScores[rowKey] || {})[pid]) || 0;
    }
    return total;
  };

  if (kicked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "16px" }}>{"\uD83D\uDE14"}</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>You were removed</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>The host removed you from this session.</p>
        <button onClick={() => navigate("/games")} style={{ padding: "12px 32px", borderRadius: "12px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
          Back to Games
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>Session Not Found</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{error}</p>
        <button onClick={() => navigate("/games")} style={{ padding: "12px 32px", borderRadius: "12px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
          Back to Games
        </button>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spinnerRotate 0.6s linear infinite" }} />
      </div>
    );
  }

  const players = lobby.players || [];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px", paddingTop: "60px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
        <button onClick={() => navigate(`/game/${lobby.game_id}`)} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
          ← Game
        </button>
        <h1 style={{ flex: 1, fontSize: "1.3rem", margin: 0, color: "var(--text-primary)" }}>
          Score Tracker
        </h1>
      </div>

      {/* Session info */}
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 12px" }}>
        Session {lobby.lobby_code} &middot; {players.length} player{players.length !== 1 ? "s" : ""}
      </p>

      {/* Controls bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap",
      }}>
        <label style={{
          display: "flex", alignItems: "center", gap: "6px",
          fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={showTotal}
            onChange={(e) => { setShowTotal(e.target.checked); if (!e.target.checked) setRevealed(false); }}
            style={{ accentColor: "var(--accent)" }}
          />
          Show Running Total
        </label>
      </div>

      {/* Transposed score table */}
      <div style={{ overflowX: "auto", marginBottom: "20px", WebkitOverflowScrolling: "touch" }}>
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
                <th key={player.id} style={{
                  padding: "12px 10px", textAlign: "center", fontSize: "0.85rem",
                  borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)",
                  minWidth: "80px", whiteSpace: "nowrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: PLAYER_COLORS[pIdx % PLAYER_COLORS.length], flexShrink: 0,
                    }} />
                    <span style={{ color: "var(--text-primary)", fontWeight: player.is_host ? 600 : 400 }}>
                      {player.name}
                    </span>
                    {player.is_host && <span style={{ fontSize: "0.7rem" }}>{"\uD83D\uDC51"}</span>}
                    {isHost && !player.is_host && (
                      <button
                        onClick={() => handleKick(player.id)}
                        title={`Remove ${player.name}`}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "0.8rem", color: "var(--text-secondary)", padding: "0 2px",
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
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
                  {players.map((player) => {
                    const val = (localScores[rowKey] || {})[player.id];
                    return (
                      <td key={player.id} style={{ padding: "6px 4px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={val === undefined || val === "" ? "" : val}
                          onChange={(e) => handleScoreChange(rowKey, player.id, e.target.value)}
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

            {/* Total row */}
            {showTotal && (
              <tr style={{ animation: revealed ? "scoreReveal 0.5s ease-out" : "none" }}>
                <td style={{
                  padding: "12px 14px", borderTop: "2px solid var(--border)",
                  fontSize: "0.9rem", fontWeight: 700, color: "var(--accent)",
                  position: "sticky", left: 0, zIndex: 1, background: STICKY_BG,
                }}>
                  Total
                </td>
                {players.map((player) => (
                  <td key={player.id} style={{
                    padding: "12px 14px", borderTop: "2px solid var(--border)",
                    textAlign: "center", fontWeight: 700, fontSize: "1.1rem",
                    fontFamily: "monospace", color: "var(--accent)",
                  }}>
                    {getPlayerTotal(player.id)}
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
            players.forEach((p) => {
              const t = getPlayerTotal(p.id);
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

      {/* Leave */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <button
          onClick={handleLeave}
          style={{
            padding: "12px 24px", borderRadius: "12px", fontSize: "0.95rem",
            background: "transparent", color: "#ef4444",
            border: "1px solid #ef4444", cursor: "pointer", fontWeight: 600,
          }}
        >
          Leave Session
        </button>
      </div>

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
