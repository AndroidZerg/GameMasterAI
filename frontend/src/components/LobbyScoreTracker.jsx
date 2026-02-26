import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE, updateLobbyScores, leaveLobby, kickPlayer } from "../services/api";

const PLAYER_COLORS = [
  "#e94560", "#4a90d9", "#2ecc71", "#f39c12", "#9b59b6", "#e67e22",
  "#1abc9c", "#e74c3c",
];

const STICKY_BG = "#1a1a2e";

/* ── Post-Game Survey (Lobby) ──────────────────────────────── */
function LobbySurvey({ gameId, lobbyId, playerName, onDone }) {
  const [gameRating, setGameRating] = useState(0);
  const [playedBefore, setPlayedBefore] = useState(null);
  const [helpfulSetup, setHelpfulSetup] = useState(0);
  const [helpfulRules, setHelpfulRules] = useState(0);
  const [helpfulStrategy, setHelpfulStrategy] = useState(0);
  const [helpfulScoring, setHelpfulScoring] = useState(0);
  const [wouldUseAgain, setWouldUseAgain] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const StarRow = ({ label, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
      <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => onChange(s)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem",
            color: s <= value ? "#f59e0b" : "var(--border)", padding: "2px",
          }}>{s <= value ? "\u2605" : "\u2606"}</button>
        ))}
      </div>
    </div>
  );

  const YesNo = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: "8px" }}>
      {[true, false].map((v) => (
        <button key={String(v)} onClick={() => onChange(v)} style={{
          padding: "8px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer",
          background: value === v ? "var(--accent)" : "var(--bg-secondary)",
          color: value === v ? "#fff" : "var(--text-primary)",
          border: value === v ? "none" : "1px solid var(--border)",
        }}>{v ? "Yes" : "No"}</button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    if (gameRating === 0) return;
    setSubmitting(true);
    try {
      const venueId = localStorage.getItem("gmai_venue_id") || null;
      await fetch(`${API_BASE}/api/feedback/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          lobby_id: lobbyId || null,
          venue_id: venueId,
          player_name: playerName || null,
          game_rating: gameRating,
          played_before: playedBefore,
          helpful_setup: helpfulSetup || null,
          helpful_rules: helpfulRules || null,
          helpful_strategy: helpfulStrategy || null,
          helpful_scoring: helpfulScoring || null,
          would_use_again: wouldUseAgain,
          feedback_text: feedbackText || null,
          submitted_at: new Date().toISOString(),
        }),
      });
    } catch { /* non-fatal */ }
    onDone();
  };

  return (
    <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "1.3rem", color: "var(--text-primary)", marginBottom: "24px" }}>
        How was your experience?
      </h2>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
        <StarRow label={`Rate this game:`} value={gameRating} onChange={setGameRating} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Played this game before?</span>
          <YesNo value={playedBefore} onChange={setPlayedBefore} />
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
          How helpful was GameMaster Guide for:
        </p>
        <StarRow label="Setup" value={helpfulSetup} onChange={setHelpfulSetup} />
        <StarRow label="Rules" value={helpfulRules} onChange={setHelpfulRules} />
        <StarRow label="Strategies" value={helpfulStrategy} onChange={setHelpfulStrategy} />
        <StarRow label="Keeping Score" value={helpfulScoring} onChange={setHelpfulScoring} />
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", flex: 1, marginRight: "8px" }}>
            Would you use GameMaster Guide to learn a new game?
          </span>
          <YesNo value={wouldUseAgain} onChange={setWouldUseAgain} />
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "20px" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Any other feedback? (optional)</p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Tell us what you think..."
          rows={3}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid var(--border)", background: "var(--bg-primary)",
            color: "var(--text-primary)", fontSize: "0.9rem", resize: "vertical",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <button onClick={handleSubmit} disabled={submitting || gameRating === 0} style={{
        display: "block", width: "100%", padding: "14px", borderRadius: "12px",
        background: gameRating === 0 ? "var(--bg-secondary)" : "var(--accent)",
        color: gameRating === 0 ? "var(--text-secondary)" : "#fff",
        border: "none", fontSize: "1.05rem", fontWeight: 700,
        cursor: gameRating === 0 ? "default" : "pointer",
        marginBottom: "8px", opacity: submitting ? 0.6 : 1,
      }}>
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>

      <button onClick={onDone} style={{
        display: "block", width: "100%", padding: "10px",
        background: "none", border: "none", color: "var(--text-secondary)",
        fontSize: "0.85rem", cursor: "pointer", textAlign: "center",
      }}>Skip</button>
    </div>
  );
}

/* ── Lobby Results Screen ──────────────────────────────────── */
function LobbyResults({ players, getPlayerTotal, myPlayerId, onSurvey, onNewGame, gameId }) {
  const RANK_MESSAGES = [
    { icon: "\u{1F3C6}", msg: "You won! 1st Place!", color: "#f59e0b" },
    { icon: "\u{1F948}", msg: "Great game! 2nd Place!", color: "#94a3b8" },
    { icon: "\u{1F949}", msg: "Well played! 3rd Place!", color: "#cd7f32" },
  ];

  const sorted = [...players]
    .map((p, i) => ({ ...p, total: getPlayerTotal(p.id), pIdx: i }))
    .sort((a, b) => b.total - a.total);

  const confettiColors = ["#e94560", "#ff6b81", "#a855f7", "#22c55e", "#3b82f6", "#f59e0b"];

  const getRankInfo = (rank) => {
    if (rank < 3) return RANK_MESSAGES[rank];
    const n = rank + 1;
    return { icon: "", msg: `You got ${n}th place. Good try! Better luck next time!`, color: "var(--text-secondary)" };
  };

  // Find this player's rank for personalized message
  const myRank = sorted.findIndex((p) => p.id === myPlayerId);

  return (
    <div style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Confetti */}
      {confettiColors.map((color, i) =>
        Array.from({ length: 6 }).map((_, j) => (
          <div key={`${i}-${j}`} style={{
            position: "absolute", top: "0",
            left: `${5 + (i * 6 + j) * 2.5}%`,
            width: j % 3 === 0 ? "10px" : "8px",
            height: j % 3 === 0 ? "10px" : "8px",
            borderRadius: j % 2 === 0 ? "50%" : "2px",
            background: color,
            animation: `confetti 2s ease-out ${(i * 6 + j) * 0.05}s forwards`,
            opacity: 0.9,
          }} />
        ))
      )}

      <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: "8px", color: "var(--text-primary)" }}>
        Final Scores
      </h2>

      {/* Personalized message for this player */}
      {myPlayerId && myRank >= 0 && (
        <p style={{
          textAlign: "center", fontSize: "1rem", marginBottom: "20px",
          color: getRankInfo(myRank).color, fontWeight: 600,
        }}>
          {getRankInfo(myRank).icon} {getRankInfo(myRank).msg}
        </p>
      )}

      {/* Leaderboard */}
      {sorted.map((p, rank) => {
        const isWinner = rank === 0;
        const isMe = p.id === myPlayerId;
        return (
          <div key={p.id} style={{
            background: isWinner ? PLAYER_COLORS[p.pIdx % PLAYER_COLORS.length] : "var(--bg-secondary)",
            borderRadius: "12px", padding: "14px 16px", marginBottom: "8px",
            border: isMe ? `2px solid var(--accent)` : isWinner ? `2px solid ${PLAYER_COLORS[p.pIdx % PLAYER_COLORS.length]}` : "1px solid var(--border)",
            animation: isWinner ? "glow 2s ease-in-out infinite" : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: isWinner ? "#fff" : "var(--text-secondary)", minWidth: "24px" }}>
                  #{rank + 1}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: isWinner ? "#fff" : "var(--text-primary)" }}>
                  {rank === 0 ? "\u{1F3C6} " : ""}{p.name}
                  {isMe ? " (you)" : ""}
                </span>
              </div>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "monospace", color: isWinner ? "#fff" : "var(--accent)" }}>
                {p.total}
              </span>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onSurvey} style={{
          flex: 1, padding: "14px", borderRadius: "12px",
          background: "var(--accent)", color: "#fff", border: "none",
          fontWeight: 600, cursor: "pointer", fontSize: "1rem",
        }}>Rate This Game</button>
        <button onClick={onNewGame} style={{
          flex: 1, padding: "14px", borderRadius: "12px",
          background: "var(--bg-secondary)", color: "var(--text-primary)",
          border: "1px solid var(--border)", fontWeight: 600,
          cursor: "pointer", fontSize: "1rem",
        }}>New Game</button>
      </div>
    </div>
  );
}

export default function LobbyScoreTracker() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [error, setError] = useState("");
  const [kicked, setKicked] = useState(false);
  const [phase, setPhase] = useState("scoring"); // scoring | results | survey
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [rows, setRows] = useState(["Score A", "Score B", "Score C"]);
  const [editingRow, setEditingRow] = useState(null);
  const [localScores, setLocalScores] = useState({});
  const [showTotal, setShowTotal] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pollRef = useRef(null);
  const lastPushRef = useRef("");

  const playerId = localStorage.getItem("gmai_player_id");
  const playerName = lobby?.players?.find((p) => p.id === playerId)?.name || "";
  const isHost = lobby?.host_id === playerId;

  // Load game-specific score types from API
  useEffect(() => {
    if (!lobby?.game_id) return;
    let mounted = true;
    fetch(`${API_BASE}/api/scores/${lobby.game_id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (mounted && data && data.scoring_type !== "unavailable" && data.categories?.length) {
          setRows(data.categories.map((c) => c.label || c.name || c.id));
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
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
        const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}`);
        if (!mounted) return;

        if (res.status === 404) {
          clearInterval(pollRef.current);
          if (mounted) setError("Session ended or not found");
          return;
        }
        if (!res.ok) return; // skip this poll on other errors

        const state = await res.json();
        if (!mounted) return;

        if (state.kicked?.includes(playerId)) {
          clearInterval(pollRef.current);
          if (mounted) setKicked(true);
          return;
        }

        setLobby(state);

        // If host ended the game, show results for all players
        if (state.status === "ended" && phase === "scoring") {
          setShowTotal(true);
          setRevealed(true);
          setPhase("results");
        }

        // Merge remote scores
        const remoteScores = state.scores?.shared || {};
        setLocalScores((prev) => {
          const merged = { ...prev };
          for (const [rowKey, rowScores] of Object.entries(remoteScores || {})) {
            if (!rowScores || typeof rowScores !== "object") continue;
            if (!merged[rowKey]) {
              merged[rowKey] = { ...rowScores };
            } else {
              merged[rowKey] = { ...rowScores, ...merged[rowKey] };
              for (const [pid, val] of Object.entries(rowScores || {})) {
                if (merged[rowKey][pid] === undefined) {
                  merged[rowKey][pid] = val;
                }
              }
            }
          }
          return merged;
        });
      } catch (e) {
        console.warn("Lobby poll failed:", e);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(pollRef.current); };
  }, [lobbyId, playerId, phase]);

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

  const handleEndGame = async () => {
    setShowEndConfirm(false);
    // Notify server so all clients transition
    try {
      await fetch(`${API_BASE}/api/lobby/${lobbyId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host_id: playerId }),
      });
    } catch { /* ignore */ }
    setShowTotal(true);
    setRevealed(true);
    setPhase("results");
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

  // Survey phase
  if (phase === "survey") {
    return (
      <div style={{ maxWidth: "500px", margin: "0 auto", paddingTop: "60px", minHeight: "100vh" }}>
        <LobbySurvey
          gameId={lobby.game_id}
          lobbyId={lobbyId}
          playerName={playerName}
          onDone={() => {
            localStorage.removeItem("gmai_lobby_id");
            localStorage.removeItem("gmai_player_id");
            localStorage.removeItem(`gmai_lobby_scores_${lobbyId}`);
            navigate("/games");
          }}
        />
      </div>
    );
  }

  // Results phase
  if (phase === "results") {
    return (
      <div style={{ maxWidth: "500px", margin: "0 auto", paddingTop: "60px", minHeight: "100vh" }}>
        <LobbyResults
          players={players}
          getPlayerTotal={getPlayerTotal}
          myPlayerId={playerId}
          gameId={lobby.game_id}
          onSurvey={() => setPhase("survey")}
          onNewGame={() => {
            localStorage.removeItem("gmai_lobby_id");
            localStorage.removeItem("gmai_player_id");
            localStorage.removeItem(`gmai_lobby_scores_${lobbyId}`);
            navigate("/games");
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px", paddingTop: "60px", minHeight: "100vh" }}>
      {/* End Game Confirmation Modal */}
      {showEndConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }} onClick={() => setShowEndConfirm(false)}>
          <div style={{
            background: "var(--bg-primary)", borderRadius: "16px",
            padding: "24px", width: "100%", maxWidth: "340px",
            border: "1px solid var(--border)", textAlign: "center",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{"\u{1F3C1}"}</div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "8px", fontSize: "1.2rem" }}>End this game?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Final scores will be revealed. All players will see the results.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowEndConfirm(false)} style={{
                flex: 1, padding: "12px", borderRadius: "10px",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleEndGame} style={{
                flex: 1, padding: "12px", borderRadius: "10px",
                background: "#ef4444", color: "#fff", border: "none",
                fontWeight: 600, cursor: "pointer",
              }}>End Game</button>
            </div>
          </div>
        </div>
      )}

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

      {/* End Game button (host only) + Leave */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {isHost && (
          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              padding: "12px 24px", borderRadius: "12px", fontSize: "0.95rem",
              background: "#ef4444", color: "#fff",
              border: "none", cursor: "pointer", fontWeight: 600,
            }}
          >
            End Game
          </button>
        )}
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
