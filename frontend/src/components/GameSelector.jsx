import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "../services/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8100";

const COMPLEXITY_COLORS = {
  party: "#a855f7",
  gateway: "#22c55e",
  midweight: "#3b82f6",
  heavy: "#ef4444",
};

function SkeletonCard({ small }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        height: small ? "120px" : "200px",
        background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        border: "2px solid var(--border)",
      }}
    />
  );
}

function GameCard({ game, onClick, small }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = `${API_BASE}/api/images/${game.game_id}.jpg`;
  const fallbackColor = COMPLEXITY_COLORS[game.complexity] || "#666";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play ${game.title} — ${game.complexity}, ${game.player_count?.min}-${game.player_count?.max} players`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{
        borderRadius: "12px",
        cursor: "pointer",
        border: "2px solid var(--border)",
        transition: "border-color 0.2s, transform 0.15s",
        overflow: "hidden",
        position: "relative",
        height: small ? "120px" : "200px",
        background: imgError ? fallbackColor : "var(--bg-primary)",
        animation: "fadeIn 0.3s ease-out",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {!imgError && (
        <img
          src={imgUrl}
          alt=""
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}

      {/* Fallback: show title centered when no image */}
      {imgError && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <span style={{ fontSize: small ? "1rem" : "1.3rem", fontWeight: 700, color: "#fff", textAlign: "center", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {game.title}
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: small ? "8px 12px" : "14px 16px",
          background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
          paddingTop: small ? "30px" : "50px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: small ? "0.9rem" : "1.1rem", color: "#fff", fontWeight: 700 }}>
          {game.title}
        </h3>
        {!small && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "4px" }}>
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
            <span style={{ color: "#ccc", fontSize: "0.85rem" }}>
              {game.player_count?.min}-{game.player_count?.max} players
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameSelector() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [venueConfig, setVenueConfig] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Fetch venue config
  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/venue`);
        if (res.ok) {
          const data = await res.json();
          setVenueConfig(data);
          if (data.accent_color) {
            document.documentElement.style.setProperty("--accent", data.accent_color);
          }
        }
      } catch {
        setVenueConfig({
          venue_name: "Meepleville",
          venue_tagline: "Las Vegas Board Game Cafe",
          accent_color: "#e94560",
          show_buy_button: true,
          buy_button_text: "Love this game? We sell it — ask staff!",
        });
      }
    };
    fetchVenue();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchGames(search)
        .then((data) => {
          setGames(data);
          // Cache for offline use
          try { localStorage.setItem("gmai_games_cache", JSON.stringify(data)); } catch {}
        })
        .catch((err) => {
          console.error(err);
          // Try loading from cache
          try {
            const cached = JSON.parse(localStorage.getItem("gmai_games_cache") || "[]");
            if (cached.length > 0) {
              setGames(cached);
            } else {
              setError("GameMaster is taking a break — try again in a moment");
            }
          } catch {
            setError("GameMaster is taking a break — try again in a moment");
          }
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Load recently played
  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem("gmai_recent") || "[]");
      setRecentGames(recent);
    } catch {}
  }, []);

  const handleGameClick = (game) => {
    try {
      const key = "gmai_recent";
      let recent = JSON.parse(localStorage.getItem(key) || "[]");
      recent = [game.game_id, ...recent.filter((id) => id !== game.game_id)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(recent));
    } catch {}
    navigate(`/game/${game.game_id}`);
  };

  const recentGameData = recentGames
    .map((id) => games.find((g) => g.game_id === id))
    .filter(Boolean)
    .slice(0, 8);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)", marginBottom: "4px", color: "var(--text-primary)" }}>
        {venueConfig ? `GameMaster AI at ${venueConfig.venue_name}` : "GameMaster AI"}
      </h1>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.95rem" }}>
        {venueConfig?.venue_tagline || "Tap a game to start learning"}
      </p>

      {/* Offline banner */}
      {isOffline && (
        <div style={{ background: "#4a3a1a", borderRadius: "8px", padding: "8px 16px", marginBottom: "16px", textAlign: "center", fontSize: "0.85rem", color: "#f59e0b", border: "1px solid #5a4a2a" }}>
          You're offline — showing cached games
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search games"
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: "1.1rem",
            borderRadius: "12px",
            border: "2px solid var(--border)",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Recently Played */}
      {recentGameData.length > 0 && !search && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.15rem", color: "var(--text-secondary)", marginBottom: "12px" }}>Recently Played</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {recentGameData.map((game) => (
              <GameCard key={game.game_id} game={game} onClick={() => handleGameClick(game)} small />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "16px" }}>{error}</p>
          <button
            onClick={() => { setError(null); setSearch(search + " "); setTimeout(() => setSearch(search), 50); }}
            aria-label="Retry loading games"
            style={{
              padding: "12px 28px",
              borderRadius: "12px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && games.length === 0 && !error ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !error && games.length === 0 && !loading ? (
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>No games found.</p>
      ) : !error && (
        <>
          {recentGameData.length > 0 && !search && (
            <h2 style={{ fontSize: "1.15rem", color: "var(--text-secondary)", marginBottom: "12px" }}>All Games</h2>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {games.map((game) => (
              <GameCard key={game.game_id} game={game} onClick={() => handleGameClick(game)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
