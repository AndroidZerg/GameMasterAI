import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchGames, fetchVenueConfig, fetchVenueCollection, API_BASE } from "../services/api";

const COMPLEXITY_COLORS = {
  party: "#a855f7",
  gateway: "#22c55e",
  midweight: "#3b82f6",
  heavy: "#ef4444",
};

// Estimated play times by game ID
const PLAY_TIMES = {
  "codenames": 15, "skull": 20, "love-letter": 20, "coup": 15,
  "one-night-ultimate-werewolf": 10, "dixit": 30, "just-one": 20,
  "wavelength": 30, "sushi-go-party": 20, "telestrations": 30, "decrypto": 30,
  "catan": 75, "ticket-to-ride": 60, "azul": 35, "splendor": 30,
  "kingdomino": 20, "carcassonne": 40, "pandemic": 45, "king-of-tokyo": 30,
  "patchwork": 25, "takenoko": 45, "mysterium": 45,
  "wingspan": 60, "everdell": 60, "viticulture": 75, "dominion": 30,
  "7-wonders": 30, "lords-of-waterdeep": 75, "quacks-of-quedlinburg": 45,
  "clank": 60, "sagrada": 40, "the-crew": 20, "century-spice-road": 40,
  "sheriff-of-nottingham": 60, "concordia": 90, "villainous": 50,
  "above-and-below": 60, "photosynthesis": 45, "dead-of-winter": 90,
  "castles-of-burgundy": 75, "cosmic-encounter": 60,
  "terraforming-mars": 120, "root": 90, "spirit-island": 120,
  "brass-birmingham": 120, "great-western-trail": 120, "agricola": 90,
  "power-grid": 120,
};

// "Best for" tags derived from player count and complexity
function getBestForTags(game) {
  const tags = [];
  const min = game.player_count?.min || 1;
  const max = game.player_count?.max || 4;
  if (min === 1) tags.push("Solo");
  if (min <= 2 && max >= 2) tags.push("Great for 2");
  if (max >= 5 && (game.complexity === "party" || max >= 6)) tags.push("Party");
  if (game.complexity === "party" || game.complexity === "gateway") {
    if (max >= 3) tags.push("Family");
  }
  if (game.complexity === "heavy") tags.push("Brain Burner");
  return tags.slice(0, 2); // Max 2 tags
}

const BEST_FOR_COLORS = {
  "Solo": "#6366f1",
  "Great for 2": "#ec4899",
  "Party": "#a855f7",
  "Family": "#22c55e",
  "Brain Burner": "#ef4444",
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
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "4px" }}>
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
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              {game.player_count?.min}-{game.player_count?.max}p
            </span>
            {PLAY_TIMES[game.game_id] && (
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                {PLAY_TIMES[game.game_id]}min
              </span>
            )}
          </div>
        )}
        {!small && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
            {getBestForTags(game).map((tag) => (
              <span key={tag} style={{
                fontSize: "0.65rem", padding: "1px 6px", borderRadius: "999px",
                background: (BEST_FOR_COLORS[tag] || "#666") + "22",
                color: BEST_FOR_COLORS[tag] || "#666",
                border: `1px solid ${(BEST_FOR_COLORS[tag] || "#666")}44`,
                fontWeight: 600,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PLAY_TIME_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "<30m", value: 30 },
  { label: "30-60m", value: 60 },
  { label: "60-90m", value: 90 },
  { label: "90m+", value: 91 },
];

const BEST_FOR_OPTIONS = ["Any", "Solo", "Great for 2", "Family", "Party", "Brain Burner"];

function FilterBar({ complexity, setComplexity, playerCount, setPlayerCount, playTime, setPlayTime, bestFor, setBestFor }) {
  const [expanded, setExpanded] = useState(false);
  const hasAdvanced = playTime > 0 || bestFor !== "Any";

  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Row 1: Complexity + Player count */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
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

        {/* More filters toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: "6px 12px", borderRadius: "999px", fontSize: "0.8rem",
            background: hasAdvanced ? "var(--accent)" : "var(--bg-secondary)",
            color: hasAdvanced ? "#fff" : "var(--text-secondary)",
            border: "1px solid " + (hasAdvanced ? "transparent" : "var(--border)"),
            cursor: "pointer", fontWeight: hasAdvanced ? 700 : 400,
          }}
        >
          {expanded ? "Less" : "More"} {hasAdvanced ? `(${(playTime > 0 ? 1 : 0) + (bestFor !== "Any" ? 1 : 0)})` : ""}
        </button>
      </div>

      {/* Row 2: Advanced filters (play time + best for) */}
      {expanded && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", animation: "fadeIn 0.2s ease-out" }}>
          {/* Play time */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginRight: "4px" }}>Time:</span>
            {PLAY_TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPlayTime(opt.value)}
                style={{
                  padding: "6px 12px", borderRadius: "999px", fontSize: "0.8rem",
                  fontWeight: playTime === opt.value ? 700 : 400,
                  background: playTime === opt.value ? "var(--accent)" : "var(--bg-secondary)",
                  color: playTime === opt.value ? "#fff" : "var(--text-secondary)",
                  border: "1px solid " + (playTime === opt.value ? "transparent" : "var(--border)"),
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ width: "1px", height: "24px", background: "var(--border)", margin: "0 4px" }} />

          {/* Best for */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginRight: "4px" }}>Best for:</span>
            {BEST_FOR_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setBestFor(opt)}
                style={{
                  padding: "6px 12px", borderRadius: "999px", fontSize: "0.8rem",
                  fontWeight: bestFor === opt ? 700 : 400,
                  background: bestFor === opt ? (BEST_FOR_COLORS[opt] || "var(--accent)") : "var(--bg-secondary)",
                  color: bestFor === opt ? "#fff" : "var(--text-secondary)",
                  border: "1px solid " + (bestFor === opt ? "transparent" : "var(--border)"),
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GenreCarousel({ title, games, onGameClick, color }) {
  if (!games || games.length === 0) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{ fontSize: "1rem", color: color || "var(--text-secondary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
        {title}
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>({games.length})</span>
      </h2>
      <div style={{
        display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px",
        scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        {games.map((game) => (
          <div key={game.game_id} style={{ scrollSnapAlign: "start", flexShrink: 0, width: "160px" }}>
            <GameCard game={game} onClick={() => onGameClick(game)} small />
          </div>
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
  const [playTime, setPlayTimeState] = useState(parseInt(searchParams.get("time")) || 0);
  const [bestFor, setBestForState] = useState(searchParams.get("bestfor") || "Any");

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

  const setPlayTime = (val) => {
    setPlayTimeState(val);
    const params = new URLSearchParams(searchParams);
    if (val === 0) params.delete("time"); else params.set("time", val);
    setSearchParams(params, { replace: true });
    trackEvent("filter_playtime", { play_time: val });
  };

  const setBestFor = (val) => {
    setBestForState(val);
    const params = new URLSearchParams(searchParams);
    if (val === "Any") params.delete("bestfor"); else params.set("bestfor", val);
    setSearchParams(params, { replace: true });
    trackEvent("filter_bestfor", { best_for: val });
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

  // Filter pipeline: collection → complexity → player count → play time → best for
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
  if (playTime > 0) {
    displayGames = displayGames.filter((g) => {
      const t = PLAY_TIMES[g.game_id];
      if (!t) return true; // Include games without time data
      if (playTime === 30) return t < 30;
      if (playTime === 60) return t >= 30 && t <= 60;
      if (playTime === 90) return t > 60 && t <= 90;
      if (playTime === 91) return t > 90;
      return true;
    });
  }
  if (bestFor !== "Any") {
    displayGames = displayGames.filter((g) => getBestForTags(g).includes(bestFor));
  }

  const recentGameData = recentGames
    .map((id) => displayGames.find((g) => g.game_id === id))
    .filter(Boolean)
    .slice(0, 8);

  const hasActiveFilters = complexity !== "all" || playerCount > 0 || playTime > 0 || bestFor !== "Any";

  // Build genre carousels from all available games (before filtering)
  const allDisplayGames = collection ? games.filter((g) => collection.has(g.game_id)) : games;
  const genreCarousels = !search && !hasActiveFilters && allDisplayGames.length > 4
    ? [
        { title: "Party Games", color: COMPLEXITY_COLORS.party, games: allDisplayGames.filter((g) => g.complexity === "party").slice(0, 12) },
        { title: "Easy to Learn", color: COMPLEXITY_COLORS.gateway, games: allDisplayGames.filter((g) => g.complexity === "gateway").slice(0, 12) },
        { title: "For Strategists", color: COMPLEXITY_COLORS.midweight, games: allDisplayGames.filter((g) => g.complexity === "midweight").slice(0, 12) },
        { title: "Brain Burners", color: COMPLEXITY_COLORS.heavy, games: allDisplayGames.filter((g) => g.complexity === "heavy").slice(0, 12) },
      ].filter((c) => c.games.length > 0)
    : [];

  return (
    <div style={{ padding: "70px 20px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header with branding */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "4px" }}>
          <span style={{ fontSize: "1.5rem" }}>{"\u{1F3B2}"}</span>
          <h1 style={{ fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)", margin: 0, color: "var(--text-primary)", fontWeight: 800 }}>
            GameMaster AI
          </h1>
        </div>
        {venueConfig?.venue_name && (
          <p style={{ color: "var(--accent)", fontSize: "0.95rem", fontWeight: 600, marginBottom: "2px" }}>
            at {venueConfig.venue_name}
          </p>
        )}
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0" }}>
          {venueConfig?.venue_tagline || "Tap a game to start learning"}
        </p>
        {displayGames.length > 0 && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "4px" }}>
            {displayGames.length} game{displayGames.length !== 1 ? "s" : ""} {hasActiveFilters ? "matching" : "available"}
          </p>
        )}
      </div>

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
        playTime={playTime}
        setPlayTime={setPlayTime}
        bestFor={bestFor}
        setBestFor={setBestFor}
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

      {/* Genre Carousels */}
      {genreCarousels.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {genreCarousels.map((carousel) => (
            <GenreCarousel
              key={carousel.title}
              title={carousel.title}
              games={carousel.games}
              onGameClick={handleGameClick}
              color={carousel.color}
            />
          ))}
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
              onClick={() => { setComplexity("all"); setPlayerCount(0); setPlayTime(0); setBestFor("Any"); }}
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
