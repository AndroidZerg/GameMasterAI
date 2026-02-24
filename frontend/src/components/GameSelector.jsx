import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchGames, fetchVenueConfig, fetchVenueCollection, API_BASE } from "../services/api";

const COMPLEXITY_COLORS = {
  party: "#a855f7",
  gateway: "#22c55e",
  midweight: "#3b82f6",
  heavy: "#ef4444",
};

const COMPLEXITY_OPTIONS = ["all", "party", "gateway", "midweight", "heavy"];
const PLAYER_COUNT_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "2", value: 2 },
  { label: "3-4", value: 3 },
  { label: "5-6", value: 5 },
  { label: "7+", value: 7 },
];

function trackEvent(eventName, data) {
  try {
    fetch(`${API_BASE}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventName, ...data, timestamp: new Date().toISOString() }),
    }).catch(() => {});
  } catch {}
}

function SkeletonCard({ small }) {
  return (
    <div style={{ borderRadius: "12px", border: "2px solid var(--border)", overflow: "hidden" }}>
      <div style={{
        height: small ? "100px" : "160px",
        background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }} />
      <div style={{ padding: small ? "6px 10px" : "10px 14px", background: "var(--bg-secondary)" }}>
        <div style={{ height: "1rem", width: "70%", borderRadius: "4px", background: "var(--bg-card)" }} />
        {!small && <div style={{ height: "0.75rem", width: "50%", borderRadius: "4px", background: "var(--bg-card)", marginTop: "6px" }} />}
      </div>
    </div>
  );
}

function GameCard({ game, onClick, small }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
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
        animation: "fadeIn 0.3s ease-out",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div
        style={{
          height: small ? "100px" : "160px",
          background: imgError ? fallbackColor : "var(--bg-primary)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {!imgError && (
          <>
            {imgLoading && (
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }} />
            )}
            <img
              src={imgUrl}
              alt=""
              onError={() => { setImgError(true); setImgLoading(false); }}
              onLoad={() => setImgLoading(false)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </>
        )}
      </div>

      <div style={{
        padding: small ? "6px 10px" : "10px 14px",
        background: "var(--bg-secondary)",
      }}>
        <h3 style={{
          margin: 0,
          fontSize: small ? "0.85rem" : "1rem",
          color: "var(--text-primary)",
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
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
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              {game.player_count?.min}-{game.player_count?.max} players
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBar({ complexity, setComplexity, playerCount, setPlayerCount }) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
      {/* Complexity pills */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {COMPLEXITY_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setComplexity(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: complexity === opt ? 700 : 400,
              background: complexity === opt
                ? (opt === "all" ? "var(--accent)" : COMPLEXITY_COLORS[opt])
                : "var(--bg-secondary)",
              color: complexity === opt ? "#fff" : "var(--text-secondary)",
              border: "1px solid " + (complexity === opt ? "transparent" : "var(--border)"),
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {opt === "all" ? "All" : opt}
          </button>
        ))}
      </div>

      <div style={{ width: "1px", height: "24px", background: "var(--border)", margin: "0 4px" }} />

      {/* Player count pills */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginRight: "4px" }}>Players:</span>
        {PLAYER_COUNT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPlayerCount(opt.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: playerCount === opt.value ? 700 : 400,
              background: playerCount === opt.value ? "var(--accent)" : "var(--bg-secondary)",
              color: playerCount === opt.value ? "#fff" : "var(--text-secondary)",
              border: "1px solid " + (playerCount === opt.value ? "transparent" : "var(--border)"),
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
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
  const [collection, setCollection] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filter state from URL params
  const [complexity, setComplexityState] = useState(searchParams.get("complexity") || "all");
  const [playerCount, setPlayerCountState] = useState(parseInt(searchParams.get("players")) || 0);

  const setComplexity = (val) => {
    setComplexityState(val);
    const params = new URLSearchParams(searchParams);
    if (val === "all") params.delete("complexity"); else params.set("complexity", val);
    setSearchParams(params, { replace: true });
    trackEvent("filter_complexity", { complexity: val });
  };

  const setPlayerCount = (val) => {
    setPlayerCountState(val);
    const params = new URLSearchParams(searchParams);
    if (val === 0) params.delete("players"); else params.set("players", val);
    setSearchParams(params, { replace: true });
    trackEvent("filter_players", { player_count: val });
  };

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    fetchVenueConfig()
      .then((data) => {
        setVenueConfig(data);
        if (data.accent_color) document.documentElement.style.setProperty("--accent", data.accent_color);
      })
      .catch(() => {
        setVenueConfig({ venue_name: "Meepleville", venue_tagline: "Las Vegas Board Game Cafe", accent_color: "#e94560" });
      });

    fetchVenueCollection()
      .then((data) => {
        if (data.game_ids && data.game_ids.length > 0) setCollection(new Set(data.game_ids));
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem("gmai_venue_collection") || "null");
          if (local && local.length > 0) setCollection(new Set(local));
        } catch {}
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchGames(search)
        .then((data) => {
          setGames(data);
          try { localStorage.setItem("gmai_games_cache", JSON.stringify(data)); } catch {}
        })
        .catch((err) => {
          console.error(err);
          try {
            const cached = JSON.parse(localStorage.getItem("gmai_games_cache") || "[]");
            if (cached.length > 0) setGames(cached);
            else setError("GameMaster is taking a break — try again in a moment");
          } catch {
            setError("GameMaster is taking a break — try again in a moment");
          }
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

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
    trackEvent("game_selected", { game_id: game.game_id, game_title: game.title });
    navigate(`/game/${game.game_id}`);
  };

  // Filter pipeline: collection → complexity → player count
  let displayGames = collection ? games.filter((g) => collection.has(g.game_id)) : games;
  if (complexity !== "all") {
    displayGames = displayGames.filter((g) => g.complexity === complexity);
  }
  if (playerCount > 0) {
    displayGames = displayGames.filter((g) => {
      const min = g.player_count?.min || 1;
      const max = g.player_count?.max || 99;
      return playerCount >= min && playerCount <= max;
    });
  }

  const recentGameData = recentGames
    .map((id) => displayGames.find((g) => g.game_id === id))
    .filter(Boolean)
    .slice(0, 8);

  const hasActiveFilters = complexity !== "all" || playerCount > 0;

  return (
    <div style={{ padding: "70px 20px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)", marginBottom: "4px", color: "var(--text-primary)" }}>
        {venueConfig ? `GameMaster AI at ${venueConfig.venue_name}` : "GameMaster AI"}
      </h1>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "4px", fontSize: "0.95rem" }}>
        {venueConfig?.venue_tagline || "Tap a game to start learning"}
      </p>
      {displayGames.length > 0 && (
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px", fontSize: "0.8rem" }}>
          {displayGames.length} game{displayGames.length !== 1 ? "s" : ""} {hasActiveFilters ? "matching" : "available"}
        </p>
      )}

      {isOffline && (
        <div style={{ background: "#4a3a1a", borderRadius: "8px", padding: "8px 16px", marginBottom: "16px", textAlign: "center", fontSize: "0.85rem", color: "#f59e0b", border: "1px solid #5a4a2a" }}>
          You're offline — showing cached games
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search games"
          style={{
            width: "100%", padding: "14px 18px", fontSize: "1.1rem",
            borderRadius: "12px", border: "2px solid var(--border)",
            background: "var(--bg-primary)", color: "var(--text-primary)",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <FilterBar
        complexity={complexity}
        setComplexity={setComplexity}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
      />

      {recentGameData.length > 0 && !search && !hasActiveFilters && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.15rem", color: "var(--text-secondary)", marginBottom: "12px" }}>Recently Played</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {recentGameData.map((game) => (
              <GameCard key={game.game_id} game={game} onClick={() => handleGameClick(game)} small />
            ))}
          </div>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "16px" }}>{error}</p>
          <button
            onClick={() => { setError(null); setSearch(search + " "); setTimeout(() => setSearch(search), 50); }}
            aria-label="Retry loading games"
            style={{ padding: "12px 28px", borderRadius: "12px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "1rem" }}
          >
            Try Again
          </button>
        </div>
      )}

      {loading && displayGames.length === 0 && !error ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !error && displayGames.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-secondary)" }}>No games found{hasActiveFilters ? " with these filters" : ""}.</p>
          {hasActiveFilters && (
            <button
              onClick={() => { setComplexity("all"); setPlayerCount(0); }}
              style={{ marginTop: "12px", padding: "8px 20px", borderRadius: "10px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.9rem" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : !error && (
        <>
          {recentGameData.length > 0 && !search && !hasActiveFilters && (
            <h2 style={{ fontSize: "1.15rem", color: "var(--text-secondary)", marginBottom: "12px" }}>All Games</h2>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {displayGames.map((game) => (
              <GameCard key={game.game_id} game={game} onClick={() => handleGameClick(game)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
