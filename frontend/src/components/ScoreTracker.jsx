import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8100";

const PLAYER_COLORS = [
  "#e94560", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#f97316", "#ec4899",
  "#84cc16", "#6366f1",
];

const PLAYER_AVATARS = [
  "\u{1F9D9}", "\u{1F9DC}", "\u{1F9DA}", "\u{1F9DE}", "\u{1F9DF}", "\u{1F9D1}\u200D\u{1F680}", "\u{1F9D1}\u200D\u{1F3A8}", "\u{1F977}",
  "\u{1F9B8}", "\u{1F9B9}",
];

// Mock scoring config for demo
const MOCK_SCORES = {
  catan: {
    game_title: "Catan",
    scoring_type: "calculator",
    categories: [
      { id: "settlements", name: "Settlements", type: "count", points_each: 1 },
      { id: "cities", name: "Cities", type: "count", points_each: 2 },
      { id: "longest_road", name: "Longest Road", type: "boolean", points_each: 2 },
      { id: "largest_army", name: "Largest Army", type: "boolean", points_each: 2 },
      { id: "vp_cards", name: "VP Cards", type: "count", points_each: 1 },
    ],
  },
  wingspan: {
    game_title: "Wingspan",
    scoring_type: "calculator",
    categories: [
      { id: "birds", name: "Bird Points", type: "manual", points_each: 1 },
      { id: "bonus_cards", name: "Bonus Cards", type: "manual", points_each: 1 },
      { id: "end_of_round", name: "End-of-Round Goals", type: "manual", points_each: 1 },
      { id: "eggs", name: "Eggs", type: "count", points_each: 1 },
      { id: "food_on_cards", name: "Cached Food", type: "count", points_each: 1 },
      { id: "tucked_cards", name: "Tucked Cards", type: "count", points_each: 1 },
    ],
  },
  "ticket-to-ride": {
    game_title: "Ticket to Ride",
    scoring_type: "calculator",
    categories: [
      { id: "route_points", name: "Route Points", type: "manual", points_each: 1 },
      { id: "tickets_completed", name: "Completed Tickets", type: "manual", points_each: 1 },
      { id: "tickets_failed", name: "Failed Tickets", type: "manual", points_each: -1 },
      { id: "longest_route", name: "Longest Route", type: "boolean", points_each: 10 },
    ],
  },
  pandemic: {
    game_title: "Pandemic",
    scoring_type: "cooperative",
    win_conditions: ["Cure all 4 diseases before outbreaks or deck runs out"],
  },
  "the-crew": {
    game_title: "The Crew",
    scoring_type: "cooperative",
    win_conditions: ["Complete all mission tasks without breaking trick rules"],
  },
  "king-of-tokyo": {
    game_title: "King of Tokyo",
    scoring_type: "elimination",
    categories: [
      { id: "vp", name: "Victory Points", type: "count", points_each: 1 },
    ],
  },
};

function PlayerSetup({ minPlayers, maxPlayers, onStart, scoringType }) {
  const [numPlayers, setNumPlayers] = useState(minPlayers || 2);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    setPlayers(
      Array.from({ length: numPlayers }, (_, i) => ({
        name: `Player ${i + 1}`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        avatar: PLAYER_AVATARS[i % PLAYER_AVATARS.length],
      }))
    );
  }, [numPlayers]);

  const updatePlayer = (idx, field, value) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "20px", textAlign: "center", color: "var(--text-primary)" }}>
        {scoringType === "cooperative" ? "Who's playing?" : "How many players?"}
      </h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={() => setNumPlayers(Math.max(minPlayers || 1, numPlayers - 1))}
          style={{
            width: "44px", height: "44px", borderRadius: "50%",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border)", fontSize: "1.3rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
          }}
        >
          -
        </button>
        <span style={{ fontSize: "2rem", fontWeight: 700, minWidth: "40px", textAlign: "center" }}>{numPlayers}</span>
        <button
          onClick={() => setNumPlayers(Math.min(maxPlayers || 10, numPlayers + 1))}
          style={{
            width: "44px", height: "44px", borderRadius: "50%",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border)", fontSize: "1.3rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
          }}
        >
          +
        </button>
      </div>

      <div style={{ maxWidth: "360px", margin: "0 auto" }}>
        {players.map((player, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px",
              background: "var(--bg-secondary)", borderRadius: "12px", padding: "8px 12px",
              border: `2px solid ${player.color}`,
            }}
          >
            <button
              onClick={() => {
                const nextIdx = (PLAYER_AVATARS.indexOf(player.avatar) + 1) % PLAYER_AVATARS.length;
                updatePlayer(i, "avatar", PLAYER_AVATARS[nextIdx]);
              }}
              style={{
                fontSize: "1.5rem", background: "none", border: "none",
                cursor: "pointer", padding: "4px", flexShrink: 0,
              }}
              title="Change avatar"
            >
              {player.avatar}
            </button>
            <input
              type="text"
              value={player.name}
              onChange={(e) => updatePlayer(i, "name", e.target.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "8px",
                border: "1px solid var(--border)", background: "var(--bg-primary)",
                color: "var(--text-primary)", fontSize: "1rem", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {PLAYER_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => updatePlayer(i, "color", c)}
                  style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: c, border: player.color === c ? "2px solid #fff" : "2px solid transparent",
                    cursor: "pointer", padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onStart(players)}
        style={{
          display: "block", width: "100%", maxWidth: "360px",
          margin: "20px auto 0", padding: "14px",
          borderRadius: "12px", background: "var(--accent)",
          color: "#fff", border: "none", fontSize: "1.05rem",
          fontWeight: 700, cursor: "pointer",
        }}
      >
        {scoringType === "cooperative" ? "Start Game" : "Start Scoring"}
      </button>
    </div>
  );
}

function ScoreEntry({ players, categories, scores, setScores }) {
  const getPlayerTotal = (playerIdx) => {
    return categories.reduce((sum, cat) => {
      const val = scores[playerIdx]?.[cat.id] || 0;
      if (cat.type === "boolean") return sum + (val ? cat.points_each : 0);
      return sum + val * cat.points_each;
    }, 0);
  };

  const updateScore = (playerIdx, catId, value) => {
    setScores((prev) => {
      const next = { ...prev };
      next[playerIdx] = { ...(next[playerIdx] || {}), [catId]: value };
      return next;
    });
  };

  const handleBooleanToggle = (playerIdx, catId) => {
    setScores((prev) => {
      const next = { ...prev };
      players.forEach((_, pi) => {
        next[pi] = { ...(next[pi] || {}), [catId]: false };
      });
      next[playerIdx] = { ...(next[playerIdx] || {}), [catId]: true };
      return next;
    });
  };

  return (
    <div style={{ padding: "10px 0" }}>
      {categories.map((cat) => (
        <div
          key={cat.id}
          style={{
            marginBottom: "16px", background: "var(--bg-secondary)",
            borderRadius: "12px", padding: "12px 16px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {cat.type === "boolean"
                ? `${cat.points_each} pts (one player)`
                : cat.type === "manual"
                ? "manual entry"
                : `${cat.points_each} pts each`}
            </span>
          </div>

          {cat.type === "count" &&
            players.map((player, pi) => (
              <div key={pi} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{player.avatar}</span>
                <span style={{ flex: 1, fontSize: "0.9rem", color: player.color, fontWeight: 500 }}>{player.name}</span>
                <button
                  onClick={() => updateScore(pi, cat.id, Math.max(0, (scores[pi]?.[cat.id] || 0) - 1))}
                  aria-label={`Decrease ${cat.name} for ${player.name}`}
                  style={{
                    width: "44px", height: "44px", borderRadius: "8px",
                    background: "var(--bg-card)", color: "var(--text-primary)",
                    border: "1px solid var(--border)", fontSize: "1.2rem",
                    padding: 0, cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >-</button>
                <span key={scores[pi]?.[cat.id] || 0} style={{ minWidth: "32px", textAlign: "center", fontWeight: 700, fontSize: "1.1rem", animation: "numberPop 0.2s ease-out" }}>
                  {scores[pi]?.[cat.id] || 0}
                </span>
                <button
                  onClick={() => updateScore(pi, cat.id, (scores[pi]?.[cat.id] || 0) + 1)}
                  aria-label={`Increase ${cat.name} for ${player.name}`}
                  style={{
                    width: "44px", height: "44px", borderRadius: "8px",
                    background: "var(--bg-card)", color: "var(--text-primary)",
                    border: "1px solid var(--border)", fontSize: "1.2rem",
                    padding: 0, cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >+</button>
                <span style={{ fontSize: "0.8rem", color: player.color, minWidth: "40px", textAlign: "right" }}>
                  = {(scores[pi]?.[cat.id] || 0) * cat.points_each}
                </span>
              </div>
            ))}

          {cat.type === "boolean" &&
            players.map((player, pi) => (
              <button
                key={pi}
                onClick={() => handleBooleanToggle(pi, cat.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "8px 12px", marginBottom: "4px",
                  borderRadius: "8px",
                  background: scores[pi]?.[cat.id] ? player.color : "var(--bg-card)",
                  color: scores[pi]?.[cat.id] ? "#fff" : "var(--text-secondary)",
                  border: scores[pi]?.[cat.id] ? `1px solid ${player.color}` : "1px solid var(--border)",
                  fontSize: "0.9rem", cursor: "pointer", textAlign: "left",
                  fontWeight: scores[pi]?.[cat.id] ? 600 : 400,
                }}
              >
                <span>{player.avatar}</span>
                <span>{player.name} {scores[pi]?.[cat.id] ? `(+${cat.points_each} pts)` : ""}</span>
              </button>
            ))}

          {cat.type === "manual" &&
            players.map((player, pi) => (
              <div key={pi} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{player.avatar}</span>
                <span style={{ flex: 1, fontSize: "0.9rem", color: player.color, fontWeight: 500 }}>{player.name}</span>
                <input
                  type="number"
                  value={scores[pi]?.[cat.id] || 0}
                  onChange={(e) => updateScore(pi, cat.id, parseInt(e.target.value) || 0)}
                  style={{
                    width: "70px", padding: "6px 10px", borderRadius: "8px",
                    border: "1px solid var(--border)", background: "var(--bg-card)",
                    color: "var(--text-primary)", fontSize: "0.95rem",
                    textAlign: "center", outline: "none",
                  }}
                />
              </div>
            ))}
        </div>
      ))}

      {/* Running totals */}
      <div style={{
        background: "var(--bg-card)", borderRadius: "12px",
        padding: "16px", border: "2px solid var(--accent)", marginTop: "8px",
      }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "8px", color: "var(--accent)" }}>Running Totals</h3>
        {players.map((player, pi) => (
          <div key={pi} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 0",
            borderBottom: pi < players.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{player.avatar}</span>
              <span style={{ color: player.color, fontWeight: 500 }}>{player.name}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: player.color }}>{getPlayerTotal(pi)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CooperativeTracker({ players, winConditions, onFinish }) {
  const [won, setWon] = useState(null);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h3 style={{ color: "var(--text-primary)", marginBottom: "16px" }}>Cooperative Mode</h3>
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px",
        padding: "16px", marginBottom: "24px", border: "1px solid var(--border)",
      }}>
        <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>Win Condition:</p>
        {winConditions.map((cond, i) => (
          <p key={i} style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>{cond}</p>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "999px", background: p.color + "22", border: `1px solid ${p.color}` }}>
            <span>{p.avatar}</span>
            <span style={{ color: p.color, fontSize: "0.9rem", fontWeight: 500 }}>{p.name}</span>
          </div>
        ))}
      </div>
      {won === null ? (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => { setWon(true); onFinish(true); }}
            style={{
              padding: "14px 32px", borderRadius: "12px",
              background: "#22c55e", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "1.1rem", cursor: "pointer",
            }}
          >
            We Won!
          </button>
          <button
            onClick={() => { setWon(false); onFinish(false); }}
            style={{
              padding: "14px 32px", borderRadius: "12px",
              background: "#ef4444", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "1.1rem", cursor: "pointer",
            }}
          >
            We Lost
          </button>
        </div>
      ) : (
        <div style={{
          padding: "24px", borderRadius: "16px",
          background: won ? "#0f2a0f" : "#2a0f0f",
          border: won ? "2px solid #22c55e" : "2px solid #ef4444",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>{won ? "\u{1F389}" : "\u{1F614}"}</div>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: won ? "#22c55e" : "#ef4444" }}>
            {won ? "Victory!" : "Defeat"}
          </p>
        </div>
      )}
    </div>
  );
}

function EliminationTracker({ players, categories, scores, setScores, onFinish }) {
  const [eliminated, setEliminated] = useState(new Set());

  const updateScore = (playerIdx, catId, value) => {
    setScores((prev) => {
      const next = { ...prev };
      next[playerIdx] = { ...(next[playerIdx] || {}), [catId]: value };
      return next;
    });
  };

  const toggleEliminate = (pi) => {
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(pi)) next.delete(pi); else next.add(pi);
      return next;
    });
  };

  const alive = players.filter((_, i) => !eliminated.has(i));

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px", padding: "0 4px",
      }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {alive.length} of {players.length} remaining
        </span>
      </div>

      {players.map((player, pi) => (
        <div
          key={pi}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "8px", padding: "10px 14px",
            borderRadius: "12px",
            background: eliminated.has(pi) ? "var(--bg-primary)" : "var(--bg-secondary)",
            border: eliminated.has(pi) ? "1px solid var(--border)" : `2px solid ${player.color}`,
            opacity: eliminated.has(pi) ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>{player.avatar}</span>
          <span style={{
            flex: 1, fontWeight: 600,
            color: eliminated.has(pi) ? "var(--text-secondary)" : player.color,
            textDecoration: eliminated.has(pi) ? "line-through" : "none",
          }}>
            {player.name}
          </span>
          {categories && categories.length > 0 && !eliminated.has(pi) && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => updateScore(pi, categories[0].id, Math.max(0, (scores[pi]?.[categories[0].id] || 0) - 1))}
                style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "1rem", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >-</button>
              <span style={{ minWidth: "28px", textAlign: "center", fontWeight: 700, fontSize: "1rem" }}>
                {scores[pi]?.[categories[0].id] || 0}
              </span>
              <button
                onClick={() => updateScore(pi, categories[0].id, (scores[pi]?.[categories[0].id] || 0) + 1)}
                style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "1rem", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >+</button>
            </div>
          )}
          <button
            onClick={() => toggleEliminate(pi)}
            style={{
              padding: "6px 12px", borderRadius: "8px", fontSize: "0.8rem",
              background: eliminated.has(pi) ? "#22c55e" : "#ef4444",
              color: "#fff", border: "none", cursor: "pointer", fontWeight: 600,
            }}
          >
            {eliminated.has(pi) ? "Revive" : "Eliminate"}
          </button>
        </div>
      ))}

      {alive.length <= 1 && alive.length > 0 && (
        <div style={{
          marginTop: "16px", padding: "20px", borderRadius: "12px",
          background: alive[0].color + "22", border: `2px solid ${alive[0].color}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "4px" }}>{alive[0].avatar}</div>
          <p style={{ fontWeight: 700, fontSize: "1.2rem", color: alive[0].color }}>
            {alive[0].name} wins!
          </p>
        </div>
      )}
    </div>
  );
}

function ResultsScreen({ players, categories, scores, scoringType, coopResult, onPlayAgain, onNewGame, gameId, gameTitle }) {
  const totals = players.map((_, pi) =>
    categories
      ? categories.reduce((sum, cat) => {
          const val = scores[pi]?.[cat.id] || 0;
          if (cat.type === "boolean") return sum + (val ? cat.points_each : 0);
          return sum + val * cat.points_each;
        }, 0)
      : 0
  );

  const sorted = players
    .map((player, i) => ({ ...player, total: totals[i], idx: i }))
    .sort((a, b) => b.total - a.total);

  const winnerTotal = sorted[0]?.total;
  const confettiColors = ["#e94560", "#ff6b81", "#a855f7", "#22c55e", "#3b82f6", "#f59e0b"];

  // POST session data
  useEffect(() => {
    const postSession = async () => {
      try {
        await fetch(`${API_BASE}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: gameId,
            game_title: gameTitle,
            scoring_type: scoringType,
            players: players.map((p, i) => ({
              name: p.name,
              avatar: p.avatar,
              color: p.color,
              score: totals[i],
            })),
            winner: scoringType === "cooperative"
              ? (coopResult ? "team_win" : "team_loss")
              : sorted[0]?.name,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {}
    };
    postSession();
  }, []);

  return (
    <div style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Confetti particles */}
      {confettiColors.map((color, i) =>
        Array.from({ length: 4 }).map((_, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              position: "absolute", top: "0",
              left: `${10 + (i * 4 + j) * 3.5}%`,
              width: "8px", height: "8px",
              borderRadius: j % 2 === 0 ? "50%" : "2px",
              background: color,
              animation: `confetti 1.5s ease-out ${(i * 4 + j) * 0.08}s forwards`,
              opacity: 0.8,
            }}
          />
        ))
      )}
      <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: "20px", color: "var(--text-primary)" }}>
        {scoringType === "cooperative" ? (coopResult ? "Victory!" : "Defeat") : "Final Scores"}
      </h2>

      {scoringType !== "cooperative" ? (
        sorted.map((p, rank) => (
          <div
            key={p.idx}
            style={{
              background: p.total === winnerTotal ? p.color : "var(--bg-secondary)",
              borderRadius: "12px", padding: "16px", marginBottom: "10px",
              border: p.total === winnerTotal ? `2px solid ${p.color}` : "1px solid var(--border)",
              animation: p.total === winnerTotal ? "glow 2s ease-in-out infinite" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>{p.avatar}</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: p.total === winnerTotal ? "#fff" : "var(--text-primary)" }}>
                  {rank === 0 ? "\u{1F3C6} " : ""}{p.name}
                </span>
                {rank === 0 && (
                  <span style={{ fontSize: "0.85rem", color: p.total === winnerTotal ? "#ffd" : "var(--accent)" }}>
                    Winner!
                  </span>
                )}
              </div>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: p.total === winnerTotal ? "#fff" : p.color }}>
                {p.total}
              </span>
            </div>

            {categories && (
              <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {categories.map((cat) => {
                  const val = scores[p.idx]?.[cat.id] || 0;
                  const pts = cat.type === "boolean" ? (val ? cat.points_each : 0) : val * cat.points_each;
                  if (pts === 0) return null;
                  return (
                    <span key={cat.id} style={{
                      fontSize: "0.75rem", padding: "2px 8px", borderRadius: "999px",
                      background: p.total === winnerTotal ? "rgba(255,255,255,0.2)" : "var(--bg-card)",
                      color: p.total === winnerTotal ? "#fff" : "var(--text-secondary)",
                    }}>
                      {cat.name}: {pts}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "8px" }}>{coopResult ? "\u{1F389}" : "\u{1F614}"}</div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            {players.map((p, i) => (
              <span key={i} style={{ padding: "4px 12px", borderRadius: "999px", background: p.color + "22", border: `1px solid ${p.color}`, color: p.color, fontSize: "0.9rem" }}>
                {p.avatar} {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onPlayAgain} style={{
          flex: 1, padding: "14px", borderRadius: "12px",
          background: "var(--accent)", color: "#fff", border: "none",
          fontWeight: 600, cursor: "pointer", fontSize: "1rem",
        }}>
          Play Again
        </button>
        <button onClick={onNewGame} style={{
          flex: 1, padding: "14px", borderRadius: "12px",
          background: "var(--bg-secondary)", color: "var(--text-primary)",
          border: "1px solid var(--border)", fontWeight: 600,
          cursor: "pointer", fontSize: "1rem",
        }}>
          New Game
        </button>
      </div>
    </div>
  );
}

export default function ScoreTracker({ gameId, gameTitle, playerCount, onClose, onNewGame }) {
  const [phase, setPhase] = useState("setup"); // setup | scoring | results
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState(null);
  const [scoringType, setScoringType] = useState("calculator");
  const [winConditions, setWinConditions] = useState([]);
  const [scores, setScores] = useState({});
  const [coopResult, setCoopResult] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scores/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || null);
          setScoringType(data.scoring_type || "calculator");
          setWinConditions(data.win_conditions || []);
          return;
        }
      } catch {}

      if (MOCK_SCORES[gameId]) {
        const mock = MOCK_SCORES[gameId];
        setCategories(mock.categories || null);
        setScoringType(mock.scoring_type || "calculator");
        setWinConditions(mock.win_conditions || []);
      } else {
        // Generic fallback — simple manual total entry for any game
        setCategories([
          { id: "score", name: "Score", type: "manual", points_each: 1 },
        ]);
        setScoringType("calculator");
      }
    };
    fetchConfig();
  }, [gameId]);

  if (scoringType !== "cooperative" && !categories) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      zIndex: 1000, overflowY: "auto",
    }}>
      <div style={{
        maxWidth: "500px", margin: "0 auto", minHeight: "100vh",
        background: "var(--bg-primary)", padding: "16px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
            {"\u{1F3C6}"} {gameTitle}
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-secondary)",
            fontSize: "1.5rem", cursor: "pointer", padding: "4px 8px",
          }}>
            {"\u2715"}
          </button>
        </div>

        {phase === "setup" && (
          <PlayerSetup
            minPlayers={playerCount?.min || 1}
            maxPlayers={playerCount?.max || 10}
            scoringType={scoringType}
            onStart={(playerData) => {
              setPlayers(playerData);
              if (scoringType === "cooperative") {
                setPhase("scoring");
              } else {
                const initialScores = {};
                playerData.forEach((_, i) => {
                  initialScores[i] = {};
                  if (categories) {
                    categories.forEach((cat) => {
                      initialScores[i][cat.id] = cat.type === "boolean" ? false : 0;
                    });
                  }
                });
                setScores(initialScores);
                setPhase("scoring");
              }
            }}
          />
        )}

        {phase === "scoring" && scoringType === "calculator" && (
          <>
            <ScoreEntry players={players} categories={categories} scores={scores} setScores={setScores} />
            <button onClick={() => setPhase("results")} style={{
              display: "block", width: "100%", padding: "14px", marginTop: "16px",
              borderRadius: "12px", background: "var(--accent)", color: "#fff",
              border: "none", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer",
            }}>
              Calculate Winner
            </button>
          </>
        )}

        {phase === "scoring" && scoringType === "cooperative" && (
          <CooperativeTracker
            players={players}
            winConditions={winConditions}
            onFinish={(won) => {
              setCoopResult(won);
              setPhase("results");
            }}
          />
        )}

        {phase === "scoring" && scoringType === "elimination" && (
          <>
            <EliminationTracker
              players={players}
              categories={categories}
              scores={scores}
              setScores={setScores}
              onFinish={() => setPhase("results")}
            />
            <button onClick={() => setPhase("results")} style={{
              display: "block", width: "100%", padding: "14px", marginTop: "16px",
              borderRadius: "12px", background: "var(--accent)", color: "#fff",
              border: "none", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer",
            }}>
              End Game
            </button>
          </>
        )}

        {phase === "results" && (
          <ResultsScreen
            players={players}
            categories={categories}
            scores={scores}
            scoringType={scoringType}
            coopResult={coopResult}
            gameId={gameId}
            gameTitle={gameTitle}
            onPlayAgain={() => {
              if (categories) {
                const resetScores = {};
                players.forEach((_, i) => {
                  resetScores[i] = {};
                  categories.forEach((cat) => {
                    resetScores[i][cat.id] = cat.type === "boolean" ? false : 0;
                  });
                });
                setScores(resetScores);
              }
              setCoopResult(null);
              setPhase("scoring");
            }}
            onNewGame={() => {
              onClose();
              if (onNewGame) onNewGame();
            }}
          />
        )}
      </div>
    </div>
  );
}
