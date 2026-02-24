import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLobbyState, updateLobbyScores, leaveLobby, kickPlayer } from "../services/api";

const PLAYER_COLORS = [
  "#e94560", "#4a90d9", "#2ecc71", "#f39c12", "#9b59b6", "#e67e22",
  "#1abc9c", "#e74c3c",
];

export default function LobbyScoreTracker() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [error, setError] = useState("");
  const [kicked, setKicked] = useState(false);
  const [synced, setSynced] = useState(false);
  const [columns, setColumns] = useState(["Round 1", "Round 2", "Round 3"]);
  const [editingCol, setEditingCol] = useState(null);
  const [localScores, setLocalScores] = useState({});
  const pollRef = useRef(null);
  const lastPushRef = useRef("");

  const playerId = localStorage.getItem("gmai_player_id");
  const isHost = lobby?.host_id === playerId;

  // Poll lobby state
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const state = await getLobbyState(lobbyId);
        if (!mounted) return;

        // Check if kicked
        if (state.kicked?.includes(playerId)) {
          setKicked(true);
          clearInterval(pollRef.current);
          return;
        }

        setLobby(state);
        setSynced(true);
        setTimeout(() => mounted && setSynced(false), 1200);

        // Merge remote scores into local (remote wins for other players)
        setLocalScores((prev) => {
          const merged = { ...prev };
          for (const [pid, scores] of Object.entries(state.scores || {})) {
            if (pid !== playerId) {
              merged[pid] = scores;
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

  // Push local scores to server when they change
  useEffect(() => {
    if (!playerId || !localScores[playerId]) return;
    const serialized = JSON.stringify(localScores[playerId]);
    if (serialized === lastPushRef.current) return;
    lastPushRef.current = serialized;
    updateLobbyScores(lobbyId, playerId, localScores[playerId]).catch(() => {});
  }, [lobbyId, playerId, localScores]);

  const handleScoreChange = (pid, colKey, value) => {
    const numVal = value === "" ? "" : Number(value);
    setLocalScores((prev) => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [colKey]: numVal },
    }));
  };

  const handleLeave = async () => {
    try {
      await leaveLobby(lobbyId, playerId);
    } catch { /* ignore */ }
    localStorage.removeItem("gmai_lobby_id");
    localStorage.removeItem("gmai_player_id");
    navigate("/games");
  };

  const handleKick = async (kickId) => {
    try {
      await kickPlayer(lobbyId, playerId, kickId);
    } catch { /* ignore */ }
  };

  const addColumn = () => {
    setColumns((prev) => [...prev, `Round ${prev.length + 1}`]);
  };

  const renameColumn = (idx, newName) => {
    setColumns((prev) => prev.map((c, i) => (i === idx ? newName : c)));
  };

  const getTotal = (pid) => {
    const scores = localScores[pid] || {};
    return Object.values(scores).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  if (kicked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "16px" }}>😔</div>
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
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem",
          background: synced ? "rgba(34,197,94,0.15)" : "var(--bg-card)",
          color: synced ? "#22c55e" : "var(--text-secondary)",
          border: `1px solid ${synced ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
          transition: "all 0.3s",
        }}>
          {synced ? "Synced \u2713" : "Live"}
        </div>
      </div>

      {/* Session info */}
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px" }}>
        Session {lobby.lobby_code} &middot; {players.length} player{players.length !== 1 ? "s" : ""}
      </p>

      {/* Score table */}
      <div style={{ overflowX: "auto", marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "var(--bg-card)", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)" }}>
          <thead>
            <tr>
              <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.85rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", minWidth: "120px" }}>
                Player
              </th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => setEditingCol(i)}
                  style={{
                    padding: "12px 10px", textAlign: "center", fontSize: "0.85rem",
                    color: "var(--text-secondary)", borderBottom: "1px solid var(--border)",
                    background: "var(--bg-secondary)", minWidth: "80px", cursor: "pointer",
                  }}
                >
                  {editingCol === i ? (
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => renameColumn(i, e.target.value)}
                      onBlur={() => setEditingCol(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingCol(null)}
                      autoFocus
                      style={{
                        width: "100%", textAlign: "center", fontSize: "0.85rem",
                        background: "var(--bg-primary)", border: "1px solid var(--accent)",
                        borderRadius: "6px", padding: "4px", color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                  ) : col}
                </th>
              ))}
              <th style={{ padding: "12px 14px", textAlign: "center", fontSize: "0.85rem", color: "var(--accent)", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", fontWeight: 700, minWidth: "70px" }}>
                Total
              </th>
              {isHost && (
                <th style={{ padding: "12px 8px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", width: "40px" }} />
              )}
            </tr>
          </thead>
          <tbody>
            {players.map((player, pIdx) => (
              <tr key={player.id}>
                <td style={{
                  padding: "10px 14px", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: PLAYER_COLORS[pIdx % PLAYER_COLORS.length], flexShrink: 0,
                  }} />
                  <span style={{
                    color: "var(--text-primary)", fontWeight: player.is_host ? 600 : 400,
                    fontSize: "0.95rem",
                  }}>
                    {player.name}
                  </span>
                  {player.is_host && (
                    <span style={{ fontSize: "0.7rem", color: "var(--accent)" }}>
                      {"\uD83D\uDC51"}
                    </span>
                  )}
                </td>
                {columns.map((_, colIdx) => {
                  const colKey = `col_${colIdx}`;
                  const val = (localScores[player.id] || {})[colKey];
                  return (
                    <td key={colIdx} style={{ padding: "6px 4px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={val === undefined || val === "" ? "" : val}
                        onChange={(e) => handleScoreChange(player.id, colKey, e.target.value)}
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
                <td style={{
                  padding: "10px 14px", borderBottom: "1px solid var(--border)",
                  textAlign: "center", fontWeight: 700, fontSize: "1.1rem",
                  fontFamily: "monospace", color: "var(--accent)",
                }}>
                  {getTotal(player.id)}
                </td>
                {isHost && !player.is_host && (
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                    <button
                      onClick={() => handleKick(player.id)}
                      title={`Remove ${player.name}`}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "1rem", color: "var(--text-secondary)", padding: "4px",
                      }}
                    >
                      ✕
                    </button>
                  </td>
                )}
                {isHost && player.is_host && (
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add column */}
      <button
        onClick={addColumn}
        style={{
          padding: "8px 20px", borderRadius: "10px", fontSize: "0.9rem",
          background: "var(--bg-card)", color: "var(--text-secondary)",
          border: "1px solid var(--border)", cursor: "pointer", marginBottom: "24px",
        }}
      >
        + Add Round
      </button>

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
    </div>
  );
}
