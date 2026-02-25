import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, createLobby, getLobbyState, updateLobbyScores, leaveLobby, kickPlayer } from "../services/api";

const PLAYER_COLORS = [
  "#e94560", "#4a90d9", "#2ecc71", "#f39c12", "#9b59b6", "#e67e22",
  "#1abc9c", "#e74c3c",
];
const STICKY_BG = "#1a1a2e";

/* ── localStorage helpers ──────────────────────────────────── */
function loadSaved(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function saveTo(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

/* ── Post-Game Survey ──────────────────────────────────────── */
function Survey({ gameId, lobbyId, playerName, onDone }) {
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
          game_id: gameId, lobby_id: lobbyId || null, venue_id: venueId,
          player_name: playerName || null, game_rating: gameRating,
          played_before: playedBefore,
          helpful_setup: helpfulSetup || null, helpful_rules: helpfulRules || null,
          helpful_strategy: helpfulStrategy || null, helpful_scoring: helpfulScoring || null,
          would_use_again: wouldUseAgain, feedback_text: feedbackText || null,
          submitted_at: new Date().toISOString(),
        }),
      });
    } catch { /* non-fatal */ }
    onDone();
  };

  return (
    <div style={{ padding: "20px 0" }}>
      <h2 style={{ textAlign: "center", fontSize: "1.3rem", color: "var(--text-primary)", marginBottom: "24px" }}>
        How was your experience?
      </h2>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
        <StarRow label="Rate this game:" value={gameRating} onChange={setGameRating} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Played this game before?</span>
          <YesNo value={playedBefore} onChange={setPlayedBefore} />
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
          How helpful was GameMaster AI for:
        </p>
        <StarRow label="Setup" value={helpfulSetup} onChange={setHelpfulSetup} />
        <StarRow label="Rules" value={helpfulRules} onChange={setHelpfulRules} />
        <StarRow label="Strategies" value={helpfulStrategy} onChange={setHelpfulStrategy} />
        <StarRow label="Keeping Score" value={helpfulScoring} onChange={setHelpfulScoring} />
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", flex: 1, marginRight: "8px" }}>
            Would you use GameMaster AI to learn a new game?
          </span>
          <YesNo value={wouldUseAgain} onChange={setWouldUseAgain} />
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", marginBottom: "20px" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Any other feedback? (optional)</p>
        <textarea
          value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Tell us what you think..." rows={3}
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

/* ── Results Screen ────────────────────────────────────────── */
function Results({ players, getTotal, myId, gameId, onSurvey, onNewGame }) {
  const sorted = [...players]
    .map((p) => ({ ...p, total: getTotal(p.id) }))
    .sort((a, b) => b.total - a.total);

  const confettiColors = ["#e94560", "#ff6b81", "#a855f7", "#22c55e", "#3b82f6", "#f59e0b"];
  const RANK_MSG = [
    { icon: "\u{1F3C6}", msg: "You won! 1st Place!", color: "#f59e0b" },
    { icon: "\u{1F948}", msg: "Great game! 2nd Place!", color: "#94a3b8" },
    { icon: "\u{1F949}", msg: "Well played! 3rd Place!", color: "#cd7f32" },
  ];
  const getRank = (r) => r < 3 ? RANK_MSG[r] : { icon: "", msg: `You got ${r + 1}th place. Better luck next time!`, color: "var(--text-secondary)" };
  const myRank = sorted.findIndex((p) => p.id === myId);

  return (
    <div style={{ padding: "20px 0", position: "relative", overflow: "hidden" }}>
      {confettiColors.map((color, i) =>
        Array.from({ length: 6 }).map((_, j) => (
          <div key={`${i}-${j}`} style={{
            position: "absolute", top: 0, left: `${5 + (i * 6 + j) * 2.5}%`,
            width: j % 3 === 0 ? "10px" : "8px", height: j % 3 === 0 ? "10px" : "8px",
            borderRadius: j % 2 === 0 ? "50%" : "2px", background: color,
            animation: `confetti 2s ease-out ${(i * 6 + j) * 0.05}s forwards`, opacity: 0.9,
          }} />
        ))
      )}

      <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: "8px", color: "var(--text-primary)" }}>
        Final Scores
      </h2>

      {myId && myRank >= 0 && (
        <p style={{ textAlign: "center", fontSize: "1rem", marginBottom: "20px", color: getRank(myRank).color, fontWeight: 600 }}>
          {getRank(myRank).icon} {getRank(myRank).msg}
        </p>
      )}

      {sorted.map((p, rank) => {
        const isWinner = rank === 0;
        const isMe = p.id === myId;
        const pColor = PLAYER_COLORS[players.findIndex((x) => x.id === p.id) % PLAYER_COLORS.length];
        return (
          <div key={p.id} style={{
            background: isWinner ? pColor : "var(--bg-secondary)",
            borderRadius: "12px", padding: "14px 16px", marginBottom: "8px",
            border: isMe ? "2px solid var(--accent)" : isWinner ? `2px solid ${pColor}` : "1px solid var(--border)",
            animation: isWinner ? "glow 2s ease-in-out infinite" : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: isWinner ? "#fff" : "var(--text-secondary)", minWidth: "24px" }}>
                  #{rank + 1}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: isWinner ? "#fff" : "var(--text-primary)" }}>
                  {rank === 0 ? "\u{1F3C6} " : ""}{p.name}{isMe ? " (you)" : ""}
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
          border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer", fontSize: "1rem",
        }}>New Game</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN: ScoreTab
   ══════════════════════════════════════════════════════════════ */
export default function ScoreTab({ gameId, gameTitle, playerCount, timerRunning, timerElapsed, onTimerToggle }) {
  const navigate = useNavigate();

  // Phase: setup | scoring | results | survey
  const [phase, setPhase] = useState("setup");
  const [myName, setMyName] = useState(() => localStorage.getItem("gmai_player_name") || "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Lobby state
  const [lobbyId, setLobbyId] = useState(null);
  const [lobbyCode, setLobbyCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Score state
  const [scoreConfig, setScoreConfig] = useState(null);
  const [rows, setRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [scores, setScores] = useState({});
  const [showTotal, setShowTotal] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [lobbyCollapsed, setLobbyCollapsed] = useState(() => {
    try { return localStorage.getItem("gmai-lobby-collapsed") === "true"; } catch { return false; }
  });

  // Join-another-lobby
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  // Refs
  const pollRef = useRef(null);
  const debounceRef = useRef(null);
  const lastPushRef = useRef("");

  // Load score config
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/scores/${gameId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data && data.scoring_type !== "unavailable") setScoreConfig(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [gameId]);

  const buildDefaultRows = useCallback(() => {
    if (scoreConfig?.categories?.length) {
      return scoreConfig.categories.map((c) => c.label || c.name || c.id);
    }
    return ["Score A", "Score B", "Score C"];
  }, [scoreConfig]);

  // Try restoring a saved session
  useEffect(() => {
    const savedLobby = localStorage.getItem("gmai_lobby_id_" + gameId);
    const savedPid = localStorage.getItem("gmai_player_id");
    if (savedLobby && savedPid) {
      const saved = loadSaved(`gmai_scores_${savedLobby}`);
      if (saved) {
        setLobbyId(savedLobby);
        setMyPlayerId(savedPid);
        setLobbyCode(saved.lobbyCode || "");
        setRows(saved.rows || buildDefaultRows());
        setScores(saved.scores || {});
        setShowTotal(saved.showTotal || false);
        setRevealed(saved.revealed || false);
        setPlayers(saved.players || []);
        setIsHost(saved.isHost || false);
        setMyName(saved.myName || "");
        setPhase("scoring");
      }
    }
  }, [gameId, buildDefaultRows]);

  // Persist scores
  useEffect(() => {
    if (phase === "scoring" && lobbyId) {
      saveTo(`gmai_scores_${lobbyId}`, {
        lobbyCode, rows, scores, showTotal, revealed, players, isHost, myName,
      });
    }
  }, [phase, lobbyId, lobbyCode, rows, scores, showTotal, revealed, players, isHost, myName]);

  // Poll lobby state every 2s
  useEffect(() => {
    if (!lobbyId || phase !== "scoring") return;
    let mounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}`);
        if (!mounted) return;

        // Lobby gone — stop polling, keep playing locally
        if (res.status === 404) {
          clearInterval(pollRef.current);
          console.warn("Lobby not found, stopped polling");
          return;
        }
        if (!res.ok) return; // other server error — skip this poll

        const state = await res.json();
        if (!mounted) return;

        // Kicked check
        if (state.kicked?.includes(myPlayerId)) {
          clearInterval(pollRef.current);
          cleanup();
          if (mounted) {
            setError("You were removed from the session.");
            setPhase("setup");
          }
          return;
        }

        // Merge server players with local-only players
        setPlayers((prev) => {
          const serverPlayers = state.players || [];
          const localOnly = prev.filter((p) => p.is_local);
          const serverIds = new Set(serverPlayers.map((p) => p.id));
          const merged = [...serverPlayers, ...localOnly.filter((p) => !serverIds.has(p.id))];
          return merged;
        });
        setIsHost(state.host_id === myPlayerId);

        // Host ended game → show results
        if (state.status === "ended" && phase === "scoring") {
          setShowTotal(true);
          setRevealed(true);
          setPhase("results");
        }

        // Merge remote scores
        const remote = state.scores?.shared || {};
        setScores((prev) => {
          const merged = { ...prev };
          for (const [rowKey, rowScores] of Object.entries(remote)) {
            if (!merged[rowKey]) {
              merged[rowKey] = { ...rowScores };
            } else {
              for (const [pid, val] of Object.entries(rowScores)) {
                if (merged[rowKey][pid] === undefined) {
                  merged[rowKey][pid] = val;
                }
              }
              merged[rowKey] = { ...rowScores, ...merged[rowKey] };
            }
          }
          return merged;
        });
      } catch (e) {
        // Network error — don't crash, just skip this poll
        console.warn("Lobby poll failed:", e);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(pollRef.current); };
  }, [lobbyId, myPlayerId, phase]);

  // Debounced push scores to server (500ms)
  useEffect(() => {
    if (!lobbyId || !myPlayerId || Object.keys(scores).length === 0) return;
    const serialized = JSON.stringify(scores);
    if (serialized === lastPushRef.current) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastPushRef.current = serialized;
      updateLobbyScores(lobbyId, "shared", scores).catch(() => {});
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [lobbyId, myPlayerId, scores]);

  const cleanup = () => {
    localStorage.removeItem("gmai_lobby_id_" + gameId);
    localStorage.removeItem("gmai_player_id");
    localStorage.removeItem("gmai_player_name");
    if (lobbyId) localStorage.removeItem(`gmai_scores_${lobbyId}`);
    clearInterval(pollRef.current);
  };

  const getTotal = (pid) => {
    let total = 0;
    for (let i = 0; i < rows.length; i++) {
      total += Number((scores[`row_${i}`] || {})[pid]) || 0;
    }
    return total;
  };

  /* ── Start: create lobby automatically ───────────────────── */
  const handleStart = async () => {
    const trimmed = myName.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      const data = await createLobby(gameId, trimmed);
      const lid = data.lobby_id;
      const pid = data.host_id;

      localStorage.setItem("gmai_lobby_id_" + gameId, lid);
      localStorage.setItem("gmai_player_id", pid);
      localStorage.setItem("gmai_player_name", trimmed);

      setLobbyId(lid);
      setMyPlayerId(pid);
      setIsHost(true);
      setLobbyCode(data.lobby_code);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.qr_url)}`);
      setPlayers(data.players || [{ id: pid, name: trimmed, is_host: true }]);
      setRows(buildDefaultRows());
      setScores({});
      setShowTotal(false);
      setRevealed(false);
      setPhase("scoring");
    } catch (err) {
      setError(err.message || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  /* ── Add a local player (no lobby account) ───────────────── */
  const handleAddPlayer = () => {
    const idx = players.length;
    const newPlayer = {
      id: `local_${Date.now()}`,
      name: `Player ${idx + 1}`,
      is_host: false,
      is_local: true,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  };

  /* ── Score change ────────────────────────────────────────── */
  const handleScoreChange = (rowKey, pid, value) => {
    const numVal = value === "" ? "" : Number(value);
    setScores((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [pid]: numVal },
    }));
  };

  /* ── Row management ──────────────────────────────────────── */
  const addRow = () => {
    setRows((prev) => [...prev, `Score ${String.fromCharCode(65 + prev.length)}`]);
  };
  const renameRow = (idx, newName) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? newName : r)));
  };

  /* ── Leave session ───────────────────────────────────────── */
  const handleLeave = async () => {
    if (lobbyId && myPlayerId) {
      try { await leaveLobby(lobbyId, myPlayerId); } catch {}
    }
    cleanup();
    setPhase("setup");
    setPlayers([]);
    setScores({});
    setRows([]);
    setLobbyId(null);
    setLobbyCode("");
  };

  /* ── Kick player (host only) ─────────────────────────────── */
  const handleKick = async (kickId) => {
    if (lobbyId && myPlayerId) {
      try { await kickPlayer(lobbyId, myPlayerId, kickId); } catch {}
    }
  };

  /* ── End game ────────────────────────────────────────────── */
  const handleEndGame = async () => {
    setShowEndConfirm(false);
    if (lobbyId && myPlayerId) {
      try {
        await fetch(`${API_BASE}/api/lobby/${lobbyId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host_id: myPlayerId }),
        });
      } catch {}
    }
    setShowTotal(true);
    setRevealed(true);
    setPhase("results");
  };

  /* ── New game (after results/survey) ─────────────────────── */
  const handleNewGame = () => {
    cleanup();
    setPhase("setup");
    setPlayers([]);
    setScores({});
    setRows([]);
    setLobbyId(null);
    setLobbyCode("");
    setShowTotal(false);
    setRevealed(false);
  };

  /* ── Join another lobby ──────────────────────────────────── */
  const handleJoinLobby = async () => {
    const code = joinCode.trim();
    const name = (joinName.trim() || myName.trim());
    if (!code || !name) return;
    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch(`${API_BASE}/api/lobby/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, player_name: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Session not found");
      }
      const data = await res.json();
      localStorage.setItem("gmai_lobby_id", data.lobby_id);
      localStorage.setItem("gmai_player_id", data.player_id);
      localStorage.setItem("gmai_player_name", name);
      navigate(`/lobby/${data.lobby_id}`);
    } catch (err) {
      setJoinError(err.message || "Session not found");
    } finally {
      setJoining(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER: Setup Phase
     ═══════════════════════════════════════════════════════════ */
  if (phase === "setup") {
    return (
      <div style={{ padding: "20px 0", maxWidth: "400px", margin: "0 auto" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem", color: "var(--text-primary)", textAlign: "center" }}>
          Score Tracker
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", margin: "0 0 24px" }}>
          Enter your name to start tracking scores. Friends can join by scanning a QR code.
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="text"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="Your name"
            maxLength={20}
            autoFocus
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            data-form-type="other" data-lpignore="true"
            style={{
              flex: 1, padding: "14px 16px", fontSize: "1rem", borderRadius: "12px",
              border: "2px solid var(--border)", background: "var(--bg-primary)",
              color: "var(--text-primary)", outline: "none",
            }}
          />
          <button
            onClick={handleStart}
            disabled={!myName.trim() || creating}
            style={{
              padding: "14px 28px", borderRadius: "12px", fontWeight: 700,
              background: !myName.trim() || creating ? "var(--border)" : "var(--accent)",
              color: "#fff", border: "none", fontSize: "1rem", cursor: "pointer",
              minWidth: "100px",
            }}
          >
            {creating ? "..." : "Start"}
          </button>
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", textAlign: "center" }}>{error}</p>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Results Phase
     ═══════════════════════════════════════════════════════════ */
  if (phase === "results") {
    return (
      <Results
        players={players}
        getTotal={getTotal}
        myId={myPlayerId}
        gameId={gameId}
        onSurvey={() => setPhase("survey")}
        onNewGame={handleNewGame}
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Survey Phase
     ═══════════════════════════════════════════════════════════ */
  if (phase === "survey") {
    return (
      <Survey
        gameId={gameId}
        lobbyId={lobbyId}
        playerName={myName}
        onDone={handleNewGame}
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Scoring Phase
     ═══════════════════════════════════════════════════════════ */
  const qrSrc = qrUrl || (lobbyCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/join/${lobbyCode}`)}`
    : "");

  return (
    <div style={{ padding: "4px 0", paddingBottom: "80px" }}>

      {/* ── End Game Confirmation Modal ──────────────────────── */}
      {showEndConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }} onClick={() => setShowEndConfirm(false)}>
          <div style={{
            background: "var(--bg-primary)", borderRadius: "16px", padding: "24px",
            width: "100%", maxWidth: "340px", border: "1px solid var(--border)", textAlign: "center",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{"\u{1F3C1}"}</div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "8px", fontSize: "1.2rem" }}>End this game?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Final scores will be revealed for all players.
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

      {/* ── TOP BAR: Leave | Timer | + Player ────────────────── */}
      <div style={{
        display: "flex", gap: "8px", marginBottom: "12px",
        maxWidth: "500px", margin: "0 auto 12px", padding: "0 8px",
        width: "100%", boxSizing: "border-box",
      }}>
        <button
          onClick={handleLeave}
          style={{
            flex: 1, padding: "10px 8px", fontSize: "0.85rem", borderRadius: "10px",
            background: "none", border: "1px solid var(--border)",
            color: "var(--text-primary)", cursor: "pointer", whiteSpace: "nowrap",
            fontWeight: 600, minHeight: "44px",
          }}
        >
          Leave
        </button>

        <button
          onClick={onTimerToggle}
          title={timerRunning ? "Pause timer" : "Resume timer"}
          style={{
            flex: 1, padding: "10px 8px", fontSize: "0.85rem", borderRadius: "10px",
            background: timerRunning ? "var(--bg-card)" : "none",
            border: timerRunning ? "1px solid var(--accent)" : "1px solid var(--border)",
            color: timerRunning ? "var(--accent)" : "var(--text-primary)",
            cursor: "pointer", whiteSpace: "nowrap",
            fontWeight: 600, fontFamily: "monospace", minHeight: "44px",
          }}
        >
          {timerRunning ? "▶" : "⏸"} {(() => {
            const h = Math.floor(timerElapsed / 3600);
            const m = Math.floor((timerElapsed % 3600) / 60);
            const s = timerElapsed % 60;
            return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
          })()}
        </button>

        <button
          onClick={handleAddPlayer}
          style={{
            flex: 1, padding: "10px 8px", fontSize: "0.85rem", borderRadius: "10px",
            background: "none", border: "1px solid var(--border)",
            color: "var(--text-primary)", cursor: "pointer", whiteSpace: "nowrap",
            fontWeight: 600, minHeight: "44px",
          }}
        >
          + Player
        </button>
      </div>

      {/* Session info (subtle) */}
      {lobbyCode && (
        <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: "0 0 8px", textAlign: "center", opacity: 0.7 }}>
          Session {lobbyCode} &middot; {players.length} player{players.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── SCORE TABLE ─────────────────────────────────────── */}
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
                <th key={player.id} style={{
                  padding: "10px 8px", textAlign: "center", fontSize: "0.85rem",
                  borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)",
                  minWidth: "80px", whiteSpace: "nowrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: PLAYER_COLORS[pIdx % PLAYER_COLORS.length], flexShrink: 0,
                    }} />
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => {
                        setPlayers((prev) => prev.map((p, i) =>
                          i === pIdx ? { ...p, name: e.target.value } : p
                        ));
                      }}
                      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                      data-form-type="other" data-lpignore="true"
                      style={{
                        background: "transparent", border: "none", color: "var(--text-primary)",
                        fontWeight: player.is_host ? 600 : 500, fontSize: "0.85rem",
                        textAlign: "center", width: "70px", outline: "none", padding: "2px 0",
                      }}
                    />
                    {player.is_host && <span style={{ fontSize: "0.7rem" }}>{"\uD83D\uDC51"}</span>}
                    {isHost && !player.is_host && (
                      <button
                        onClick={() => player.is_local
                          ? setPlayers((prev) => prev.filter((p) => p.id !== player.id))
                          : handleKick(player.id)
                        }
                        title={`Remove ${player.name}`}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "0.75rem", color: "var(--text-secondary)", padding: "0 2px", lineHeight: 1,
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
                      position: "sticky", left: 0, zIndex: 1, background: STICKY_BG, fontWeight: 500,
                    }}
                  >
                    {editingRow === rIdx ? (
                      <input
                        type="text" value={rowLabel}
                        onChange={(e) => renameRow(rIdx, e.target.value)}
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingRow(null)}
                        autoFocus
                        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                        data-form-type="other" data-lpignore="true"
                        style={{
                          width: "100%", fontSize: "0.9rem",
                          background: "var(--bg-primary)", border: "1px solid var(--accent)",
                          borderRadius: "6px", padding: "4px 8px", color: "var(--text-primary)", outline: "none",
                        }}
                      />
                    ) : rowLabel}
                  </td>
                  {players.map((player) => {
                    const val = (scores[rowKey] || {})[player.id];
                    return (
                      <td key={player.id} style={{ padding: "6px 4px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                        <input
                          type="number" inputMode="numeric" pattern="[0-9]*"
                          value={val === undefined || val === "" ? "" : val}
                          onChange={(e) => handleScoreChange(rowKey, player.id, e.target.value)}
                          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                          data-form-type="other" data-lpignore="true"
                          style={{
                            width: "100%", maxWidth: "70px", padding: "8px 4px", textAlign: "center",
                            fontSize: "1rem", fontWeight: 600, fontFamily: "monospace",
                            borderRadius: "8px", border: "1px solid var(--border)",
                            background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Total row */}
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
                  {showTotal ? getTotal(player.id) : "???"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── LOBBY SECTION (collapsible) ──────────────────────── */}
      {lobbyCode && (
        <div style={{
          background: "var(--bg-secondary)", borderRadius: "12px",
          border: "1px solid var(--border)", marginBottom: "16px", overflow: "hidden",
        }}>
          <button
            onClick={() => {
              setLobbyCollapsed((prev) => {
                const next = !prev;
                try { localStorage.setItem("gmai-lobby-collapsed", String(next)); } catch {}
                return next;
              });
            }}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", background: "var(--bg-secondary)", color: "var(--text-primary)",
              border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, textAlign: "left",
            }}
          >
            <span>Invite to Your Lobby</span>
            <span style={{ transform: lobbyCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: "0.7rem" }}>▼</span>
          </button>

          {!lobbyCollapsed && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>
                    Room Code:
                  </p>
                  <div style={{
                    fontSize: "2rem", fontWeight: 800, letterSpacing: "0.15em",
                    color: "var(--accent)", fontFamily: "monospace", marginBottom: "8px",
                  }}>
                    {lobbyCode}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                    Friends can scan the QR or enter the code at the join page.
                  </p>
                </div>
                {qrSrc && (
                  <img
                    src={qrSrc} alt="QR code to join"
                    style={{
                      width: "120px", height: "120px", borderRadius: "10px",
                      background: "#fff", padding: "6px", flexShrink: 0,
                    }}
                  />
                )}
              </div>

              {/* Join another lobby */}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: "16px", paddingTop: "12px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px" }}>
                  Join Another Lobby
                </p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text" value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Code" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    data-form-type="other" data-lpignore="true"
                    style={{
                      width: "80px", padding: "8px 10px", textAlign: "center",
                      fontSize: "1rem", fontFamily: "monospace", fontWeight: 700,
                      borderRadius: "8px", border: "1px solid var(--border)",
                      background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none",
                    }}
                  />
                  <input
                    type="text" value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Your name" maxLength={20}
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    data-form-type="other" data-lpignore="true"
                    style={{
                      flex: 1, padding: "8px 10px", fontSize: "0.9rem",
                      borderRadius: "8px", border: "1px solid var(--border)",
                      background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none",
                    }}
                  />
                  <button
                    onClick={handleJoinLobby}
                    disabled={joinCode.length < 4 || joining}
                    style={{
                      padding: "8px 16px", borderRadius: "8px", fontWeight: 600,
                      background: joinCode.length < 4 ? "var(--border)" : "var(--accent)",
                      color: "#fff", border: "none", cursor: "pointer", fontSize: "0.9rem",
                    }}
                  >
                    {joining ? "..." : "Join"}
                  </button>
                </div>
                {joinError && (
                  <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "6px" }}>{joinError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Winner banner after reveal */}
      {revealed && (
        <div style={{
          textAlign: "center", padding: "16px", marginBottom: "12px",
          background: "var(--bg-card)", borderRadius: "12px",
          border: "2px solid var(--accent)", animation: "scoreReveal 0.5s ease-out",
        }}>
          {(() => {
            let maxScore = -Infinity;
            let winners = [];
            players.forEach((p) => {
              const t = getTotal(p.id);
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

      {/* ── BOTTOM BAR (sticky) ─────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg-primary)", borderTop: "1px solid var(--border)",
        padding: "10px 16px", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
      }}>
        <button
          onClick={addRow}
          style={{
            flex: 1, padding: "10px 8px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 600,
            background: "var(--bg-card)", color: "var(--text-secondary)",
            border: "1px solid var(--border)", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          + Score Type
        </button>

        <button
          onClick={() => setShowTotal((v) => !v)}
          style={{
            flex: 1, padding: "10px 8px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 600,
            background: showTotal ? "var(--accent)" : "var(--bg-card)",
            color: showTotal ? "#fff" : "var(--text-secondary)",
            border: showTotal ? "none" : "1px solid var(--border)", cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {showTotal ? "Hide Total" : "Show Total"}
        </button>

        <button
          onClick={() => setShowEndConfirm(true)}
          style={{
            flex: 1, padding: "10px 8px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 600,
            background: "#ef4444", color: "#fff", border: "none",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          End Game
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
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60vh) rotate(720deg); opacity: 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(233,69,96,0.3); }
          50% { box-shadow: 0 0 20px rgba(233,69,96,0.6); }
        }
      `}</style>
    </div>
  );
}
