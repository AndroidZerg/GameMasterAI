import { useState, useEffect } from "react";

import { API_BASE } from "../services/api";

const MOCK_LEADERBOARD = {
  catan: [
    { name: "Sarah", score: 14, date: "2026-02-22" },
    { name: "Mike", score: 12, date: "2026-02-21" },
    { name: "Alex", score: 11, date: "2026-02-20" },
    { name: "Jordan", score: 10, date: "2026-02-19" },
    { name: "Pat", score: 10, date: "2026-02-18" },
  ],
  wingspan: [
    { name: "Emma", score: 98, date: "2026-02-22" },
    { name: "Leo", score: 91, date: "2026-02-21" },
    { name: "Sam", score: 87, date: "2026-02-20" },
  ],
  "ticket-to-ride": [
    { name: "Chris", score: 142, date: "2026-02-22" },
    { name: "Riley", score: 128, date: "2026-02-21" },
    { name: "Jamie", score: 115, date: "2026-02-19" },
  ],
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ gameId, gameTitle }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHighScore, setNewHighScore] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
          setLoading(false);
          return;
        }
      } catch {}
      // Fallback to mock
      setEntries(MOCK_LEADERBOARD[gameId] || []);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [gameId]);

  // Listen for new high score events from ScoreTracker
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.gameId === gameId) {
        setNewHighScore(e.detail);
        // Add to leaderboard
        setEntries((prev) => {
          const next = [...prev, { name: e.detail.name, score: e.detail.score, date: new Date().toISOString().split("T")[0] }];
          next.sort((a, b) => b.score - a.score);
          return next.slice(0, 10);
        });
        setTimeout(() => setNewHighScore(null), 5000);
      }
    };
    window.addEventListener("gmai-high-score", handler);
    return () => window.removeEventListener("gmai-high-score", handler);
  }, [gameId]);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{
          width: "24px", height: "24px", border: "2px solid var(--border)",
          borderTopColor: "var(--accent)", borderRadius: "50%",
          animation: "spinnerRotate 0.6s linear infinite",
          margin: "0 auto",
        }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏆</div>
        <p style={{ color: "var(--text-secondary)" }}>
          No high scores yet for {gameTitle}. Be the first!
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
          Use the score tracker to record your game and claim the top spot.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 0" }}>
      {newHighScore && (
        <div style={{
          background: "#1a2a0f", border: "2px solid #22c55e",
          borderRadius: "12px", padding: "12px 16px", marginBottom: "12px",
          textAlign: "center", animation: "fadeIn 0.3s ease-out",
        }}>
          <span style={{ fontSize: "1.2rem" }}>🎉</span>
          <span style={{ color: "#22c55e", fontWeight: 700, marginLeft: "8px" }}>
            New High Score! {newHighScore.name} — {newHighScore.score} pts
          </span>
        </div>
      )}

      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px",
        border: "1px solid var(--border)", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", padding: "12px 16px",
          borderBottom: "1px solid var(--border)", background: "var(--bg-card)",
        }}>
          <span style={{ width: "40px", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Rank</span>
          <span style={{ flex: 1, fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Player</span>
          <span style={{ width: "70px", textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Score</span>
          <span style={{ width: "80px", textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Date</span>
        </div>

        {entries.map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", padding: "10px 16px",
              borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none",
              background: i === 0 ? "rgba(233, 69, 96, 0.08)" : "transparent",
              animation: newHighScore?.name === entry.name && newHighScore?.score === entry.score
                ? "glow 2s ease-in-out infinite" : "none",
            }}
          >
            <span style={{ width: "40px", fontWeight: 700, fontSize: i < 3 ? "1.2rem" : "0.9rem", color: i < 3 ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {i < 3 ? MEDALS[i] : `#${i + 1}`}
            </span>
            <span style={{
              flex: 1, fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? "var(--accent)" : "var(--text-primary)",
              fontSize: "0.95rem",
            }}>
              {entry.name}
            </span>
            <span style={{
              width: "70px", textAlign: "right", fontWeight: 700,
              fontSize: i === 0 ? "1.1rem" : "0.95rem",
              color: i === 0 ? "var(--accent)" : "var(--text-primary)",
            }}>
              {entry.score}
            </span>
            <span style={{ width: "80px", textAlign: "right", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {entry.date ? new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
            </span>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px" }}>
        Top 10 scores at this venue
      </p>
    </div>
  );
}
