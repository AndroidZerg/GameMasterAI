import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8100";

// Mock scoring config for demo
const MOCK_SCORES = {
  catan: {
    game_title: "Catan",
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
    categories: [
      { id: "route_points", name: "Route Points", type: "manual", points_each: 1 },
      { id: "tickets_completed", name: "Completed Tickets", type: "manual", points_each: 1 },
      { id: "tickets_failed", name: "Failed Tickets", type: "manual", points_each: -1 },
      { id: "longest_route", name: "Longest Route", type: "boolean", points_each: 10 },
    ],
  },
};

function PlayerSetup({ minPlayers, maxPlayers, onStart }) {
  const [numPlayers, setNumPlayers] = useState(minPlayers || 2);
  const [names, setNames] = useState([]);

  useEffect(() => {
    setNames(
      Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`)
    );
  }, [numPlayers]);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "20px", textAlign: "center", color: "var(--text-primary)" }}>
        How many players?
      </h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={() => setNumPlayers(Math.max(minPlayers || 1, numPlayers - 1))}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontSize: "1.3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          -
        </button>
        <span style={{ fontSize: "2rem", fontWeight: 700, minWidth: "40px", textAlign: "center" }}>{numPlayers}</span>
        <button
          onClick={() => setNumPlayers(Math.min(maxPlayers || 10, numPlayers + 1))}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontSize: "1.3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      <div style={{ maxWidth: "320px", margin: "0 auto" }}>
        {names.map((name, i) => (
          <input
            key={i}
            type="text"
            value={name}
            onChange={(e) => {
              const next = [...names];
              next[i] = e.target.value;
              setNames(next);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              marginBottom: "8px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "1rem",
              outline: "none",
            }}
          />
        ))}
      </div>

      <button
        onClick={() => onStart(names)}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "320px",
          margin: "20px auto 0",
          padding: "14px",
          borderRadius: "12px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          fontSize: "1.05rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Start Scoring
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
      // Clear all players for this category
      players.forEach((_, pi) => {
        next[pi] = { ...(next[pi] || {}), [catId]: false };
      });
      // Set the clicked player
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
            marginBottom: "16px",
            background: "var(--bg-secondary)",
            borderRadius: "12px",
            padding: "12px 16px",
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
            players.map((name, pi) => (
              <div
                key={pi}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}
              >
                <span style={{ flex: 1, fontSize: "0.9rem", color: "var(--text-secondary)" }}>{name}</span>
                <button
                  onClick={() => updateScore(pi, cat.id, Math.max(0, (scores[pi]?.[cat.id] || 0) - 1))}
                  aria-label={`Decrease ${cat.name} for ${name}`}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    fontSize: "1.2rem",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  -
                </button>
                <span key={scores[pi]?.[cat.id] || 0} style={{ minWidth: "32px", textAlign: "center", fontWeight: 700, fontSize: "1.1rem", animation: "numberPop 0.2s ease-out" }}>
                  {scores[pi]?.[cat.id] || 0}
                </span>
                <button
                  onClick={() => updateScore(pi, cat.id, (scores[pi]?.[cat.id] || 0) + 1)}
                  aria-label={`Increase ${cat.name} for ${name}`}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    fontSize: "1.2rem",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)", minWidth: "40px", textAlign: "right" }}>
                  = {(scores[pi]?.[cat.id] || 0) * cat.points_each}
                </span>
              </div>
            ))}

          {cat.type === "boolean" &&
            players.map((name, pi) => (
              <button
                key={pi}
                onClick={() => handleBooleanToggle(pi, cat.id)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  marginBottom: "4px",
                  borderRadius: "8px",
                  background: scores[pi]?.[cat.id] ? "var(--accent)" : "var(--bg-card)",
                  color: scores[pi]?.[cat.id] ? "#fff" : "var(--text-secondary)",
                  border: scores[pi]?.[cat.id] ? "1px solid var(--accent)" : "1px solid var(--border)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: scores[pi]?.[cat.id] ? 600 : 400,
                }}
              >
                {name} {scores[pi]?.[cat.id] ? `(+${cat.points_each} pts)` : ""}
              </button>
            ))}

          {cat.type === "manual" &&
            players.map((name, pi) => (
              <div
                key={pi}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}
              >
                <span style={{ flex: 1, fontSize: "0.9rem", color: "var(--text-secondary)" }}>{name}</span>
                <input
                  type="number"
                  value={scores[pi]?.[cat.id] || 0}
                  onChange={(e) => updateScore(pi, cat.id, parseInt(e.target.value) || 0)}
                  style={{
                    width: "70px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>
            ))}
        </div>
      ))}

      {/* Running totals */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "12px",
          padding: "16px",
          border: "2px solid var(--accent)",
          marginTop: "8px",
        }}
      >
        <h3 style={{ fontSize: "1rem", marginBottom: "8px", color: "var(--accent)" }}>Running Totals</h3>
        {players.map((name, pi) => (
          <div
            key={pi}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: pi < players.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>{name}</span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent)" }}>{getPlayerTotal(pi)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsScreen({ players, categories, scores, onPlayAgain, onNewGame }) {
  const totals = players.map((_, pi) =>
    categories.reduce((sum, cat) => {
      const val = scores[pi]?.[cat.id] || 0;
      if (cat.type === "boolean") return sum + (val ? cat.points_each : 0);
      return sum + val * cat.points_each;
    }, 0)
  );

  const sorted = players
    .map((name, i) => ({ name, total: totals[i], idx: i }))
    .sort((a, b) => b.total - a.total);

  const winnerTotal = sorted[0]?.total;

  const confettiColors = ["#e94560", "#ff6b81", "#a855f7", "#22c55e", "#3b82f6", "#f59e0b"];

  return (
    <div style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Confetti particles */}
      {confettiColors.map((color, i) =>
        Array.from({ length: 4 }).map((_, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              position: "absolute",
              top: "0",
              left: `${10 + (i * 4 + j) * 3.5}%`,
              width: "8px",
              height: "8px",
              borderRadius: j % 2 === 0 ? "50%" : "2px",
              background: color,
              animation: `confetti 1.5s ease-out ${(i * 4 + j) * 0.08}s forwards`,
              opacity: 0.8,
            }}
          />
        ))
      )}
      <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: "20px", color: "var(--text-primary)" }}>
        Final Scores
      </h2>

      {sorted.map((p, rank) => (
        <div
          key={p.idx}
          style={{
            background: p.total === winnerTotal ? "var(--accent)" : "var(--bg-secondary)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "10px",
            border: p.total === winnerTotal ? "2px solid var(--accent-light)" : "1px solid var(--border)",
            animation: p.total === winnerTotal ? "glow 2s ease-in-out infinite" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: p.total === winnerTotal ? "#fff" : "var(--text-primary)" }}>
                {rank === 0 ? "🏆 " : ""}{p.name}
              </span>
              {rank === 0 && (
                <span style={{ marginLeft: "8px", fontSize: "0.85rem", color: p.total === winnerTotal ? "#ffd" : "var(--accent)" }}>
                  Winner!
                </span>
              )}
            </div>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: p.total === winnerTotal ? "#fff" : "var(--accent)" }}>
              {p.total}
            </span>
          </div>

          <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {categories.map((cat) => {
              const val = scores[p.idx]?.[cat.id] || 0;
              const pts =
                cat.type === "boolean" ? (val ? cat.points_each : 0) : val * cat.points_each;
              if (pts === 0) return null;
              return (
                <span
                  key={cat.id}
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: p.total === winnerTotal ? "rgba(255,255,255,0.2)" : "var(--bg-card)",
                    color: p.total === winnerTotal ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {cat.name}: {pts}
                </span>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button
          onClick={onPlayAgain}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Play Again
        </button>
        <button
          onClick={onNewGame}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
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
  const [scores, setScores] = useState({});
  const [noConfig, setNoConfig] = useState(false);

  useEffect(() => {
    // Try API first, fall back to mock
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scores/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
          return;
        }
      } catch {}

      // Check mock data
      if (MOCK_SCORES[gameId]) {
        setCategories(MOCK_SCORES[gameId].categories);
      } else {
        setNoConfig(true);
      }
    };
    fetchConfig();
  }, [gameId]);

  if (noConfig) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "400px",
            textAlign: "center",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🏆</div>
          <p style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
            Score tracker coming soon for <strong>{gameTitle}</strong>!
          </p>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  if (!categories) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          minHeight: "100vh",
          background: "var(--bg-primary)",
          padding: "16px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
            🏆 {gameTitle} — Score Tracker
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {phase === "setup" && (
          <PlayerSetup
            minPlayers={playerCount?.min || 1}
            maxPlayers={playerCount?.max || 10}
            onStart={(names) => {
              setPlayers(names);
              const initialScores = {};
              names.forEach((_, i) => {
                initialScores[i] = {};
                categories.forEach((cat) => {
                  initialScores[i][cat.id] = cat.type === "boolean" ? false : 0;
                });
              });
              setScores(initialScores);
              setPhase("scoring");
            }}
          />
        )}

        {phase === "scoring" && (
          <>
            <ScoreEntry
              players={players}
              categories={categories}
              scores={scores}
              setScores={setScores}
            />
            <button
              onClick={() => setPhase("results")}
              style={{
                display: "block",
                width: "100%",
                padding: "14px",
                marginTop: "16px",
                borderRadius: "12px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: "1.05rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Calculate Winner
            </button>
          </>
        )}

        {phase === "results" && (
          <ResultsScreen
            players={players}
            categories={categories}
            scores={scores}
            onPlayAgain={() => {
              const resetScores = {};
              players.forEach((_, i) => {
                resetScores[i] = {};
                categories.forEach((cat) => {
                  resetScores[i][cat.id] = cat.type === "boolean" ? false : 0;
                });
              });
              setScores(resetScores);
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
