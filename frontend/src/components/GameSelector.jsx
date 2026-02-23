import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "../services/api";

const COMPLEXITY_COLORS = {
  party: "#a855f7",
  gateway: "#22c55e",
  midweight: "#3b82f6",
  heavy: "#ef4444",
};

export default function GameSelector() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchGames(search)
        .then(setGames)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "4px" }}>
        GameMaster AI
      </h1>
      <p style={{ textAlign: "center", color: "#888", marginBottom: "24px", fontSize: "0.95rem" }}>
        Tap a game to start learning
      </p>

      <div style={{ marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: "1.1rem",
            borderRadius: "12px",
            border: "2px solid #333",
            background: "#1a1a2e",
            color: "#eee",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {loading && games.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888" }}>Loading games...</p>
      ) : games.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888" }}>No games found.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {games.map((game) => (
            <div
              key={game.game_id}
              onClick={() => navigate(`/game/${game.game_id}`)}
              style={{
                background: "#1a1a2e",
                borderRadius: "12px",
                padding: "20px",
                cursor: "pointer",
                border: "2px solid #333",
                transition: "border-color 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#666";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#333";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem" }}>
                {game.title}
              </h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    background: COMPLEXITY_COLORS[game.complexity] || "#666",
                    color: "#fff",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {game.complexity}
                </span>
                <span style={{ color: "#aaa", fontSize: "0.85rem" }}>
                  {game.player_count.min}-{game.player_count.max} players
                </span>
              </div>
              {game.categories && game.categories.length > 0 && (
                <div style={{ marginTop: "8px", color: "#777", fontSize: "0.8rem" }}>
                  {game.categories.join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
