import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchGames, fetchVenueConfig, fetchVenueCollection, fetchFeaturedGame, fetchStaffPicks, fetchClearRecentTs, submitRentalRequest, fetchMyRental, API_BASE } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import EventTracker from "../services/EventTracker";

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
// Fallback play time estimates by complexity
const COMPLEXITY_TIME_ESTIMATES = {
  party: 20,
  gateway: 45,
  midweight: 75,
  heavy: 120,
};

function getPlayTime(game) {
  return PLAY_TIMES[game.game_id] || COMPLEXITY_TIME_ESTIMATES[game.complexity] || 45;
}

function getBestForTags(game) {
  const tags = [];
  const min = game.player_count?.min || 1;
  const max = game.player_count?.max || 4;
  const time = getPlayTime(game);
  const cats = game.categories || [];
  if (min === 1) tags.push("Solo");
  if (min <= 2 && max >= 2) tags.push("Great for 2");
  if (max >= 5 && (game.complexity === "party" || max >= 6)) tags.push("Party");
  if (game.complexity === "party" || game.complexity === "gateway") {
    if (max >= 3) tags.push("Family");
  }
  if (game.complexity === "heavy") tags.push("Brain Burner");
  if (game.complexity === "midweight" || game.complexity === "heavy") tags.push("For Strategists");
  if (min <= 2 && max <= 2) tags.push("Date Night");
  if (game.complexity === "party" || (game.complexity === "gateway" && time <= 30)) tags.push("Kids");
  if (max >= 7) tags.push("Large Group");
  if (time <= 25) tags.push("Quick Filler");
  if (cats.includes("campaign") || cats.includes("legacy-elements") || cats.includes("legacy")) tags.push("Campaign");
  return tags;
}

const BEST_FOR_COLORS = {
  "Solo": "#6366f1",
  "Great for 2": "#ec4899",
  "Party": "#a855f7",
  "Family": "#22c55e",
  "Brain Burner": "#ef4444",
  "For Strategists": "#3b82f6",
  "Date Night": "#f43f5e",
  "Kids": "#facc15",
  "Large Group": "#14b8a6",
  "Quick Filler": "#f97316",
  "Campaign": "#8b5cf6",
};

const COMPLEXITY_OPTIONS = ["all", "gateway", "midweight", "heavy"];
const PLAYER_COUNT_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "2", value: 2 },
  { label: "3-4", value: 3 },
  { label: "5-6", value: 5 },
  { label: "7+", value: 7 },
];

// Legacy trackEvent removed — all analytics now go through EventTracker

// Staff picks — fallback curated list of game IDs
const STAFF_PICKS_FALLBACK = ["wingspan", "azul", "codenames", "root", "the-crew", "patchwork", "7-wonders", "quacks-of-quedlinburg"];

// Deterministic "Game of the Day" based on date (client-side fallback)
function getGameOfTheDayFallback(games) {
  if (!games || games.length === 0) return null;
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return games[daysSinceEpoch % games.length];
}

function GameOfTheDay({ game, onClick }) {
  if (!game) return null;
  const [imgSrc, setImgSrc] = useState(`${API_BASE}/api/images/${game.game_id}.jpg`);
  const [imgError, setImgError] = useState(false);
  const triedPng = useRef(false);

  // Reset image state when game changes
  useEffect(() => {
    setImgSrc(`${API_BASE}/api/images/${game.game_id}.jpg`);
    setImgError(false);
    triedPng.current = false;
  }, [game.game_id]);

  const handleImgError = () => {
    if (!triedPng.current) {
      triedPng.current = true;
      setImgSrc(`${API_BASE}/api/images/${game.game_id}.png`);
    } else {
      setImgError(true);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{
        borderRadius: "16px", overflow: "hidden",
        cursor: "pointer", marginBottom: "24px",
        border: "2px solid var(--accent)",
        background: "var(--bg-card)",
        animation: "fadeIn 0.3s ease-out",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Square image — no overlay */}
      <div style={{ aspectRatio: "1 / 1", width: "100%", background: imgError ? "var(--accent)" : "var(--bg-primary)", position: "relative", flexShrink: 0 }}>
        {!imgError && (
          <img
            src={imgSrc} alt={game.title} onError={handleImgError}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
      </div>
      {/* Metadata below image */}
      <div style={{ padding: "12px 16px", background: "var(--bg-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{
            background: "var(--accent)", color: "#fff", padding: "3px 10px",
            borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Game of the Day
          </span>
        </div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{game.title}</h3>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px", alignItems: "center" }}>
          <span style={{
            background: COMPLEXITY_COLORS[game.complexity] || "#666",
            color: "#fff", padding: "2px 8px", borderRadius: "999px",
            fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
          }}>
            {game.complexity}
          </span>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {game.player_count?.min}-{game.player_count?.max}p
          </span>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {getPlayTime(game)}min
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ small }) {
  return (
    <div style={{ borderRadius: "12px", border: "2px solid var(--border)", overflow: "hidden" }}>
      <div style={{
        aspectRatio: "1 / 1",
        width: "100%",
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
  const [imgSrc, setImgSrc] = useState(`${API_BASE}/api/images/${game.game_id}.jpg`);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const triedPng = useRef(false);
  const fallbackColor = COMPLEXITY_COLORS[game.complexity] || "#666";

  const handleImgError = () => {
    if (!triedPng.current) {
      triedPng.current = true;
      setImgSrc(`${API_BASE}/api/images/${game.game_id}.png`);
    } else {
      setImgError(true);
      setImgLoading(false);
    }
  };

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
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          background: imgError ? fallbackColor : "var(--bg-primary)",
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
                zIndex: 2,
              }} />
            )}
            {/* Blurred background fill */}
            <img
              src={imgSrc}
              alt=""
              style={{
                position: "absolute",
                top: 0, left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(20px) brightness(0.4)",
                transform: "scale(1.1)",
              }}
            />
            {/* Actual image — full, no crop */}
            <img
              src={imgSrc}
              alt={game.title}
              onError={handleImgError}
              onLoad={() => setImgLoading(false)}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                zIndex: 1,
                display: "block",
              }}
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
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              {getPlayTime(game)}min
            </span>
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

const BEST_FOR_OPTIONS = ["Any", "Solo", "Great for 2", "Family", "Party", "Date Night", "Campaign"];

function FilterBar({ complexity, setComplexity, playerCount, setPlayerCount, playTime, setPlayTime, bestFor, setBestFor }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pillStyle = (active, color) => ({
    padding: "6px 12px", borderRadius: "999px", fontSize: "0.8rem",
    fontWeight: active ? 700 : 400,
    background: active ? (color || "var(--accent)") : "var(--bg-secondary)",
    color: active ? "#fff" : "var(--text-secondary)",
    border: "1px solid " + (active ? "transparent" : "var(--border)"),
    cursor: "pointer",
  });
  const rowStyle = { display: "flex", flexWrap: "wrap", width: "100%", gap: "4px", alignItems: "center", marginBottom: "8px" };
  const labelStyle = { fontSize: "0.8rem", color: "var(--text-secondary)", marginRight: "4px", whiteSpace: "nowrap" };

  const selectStyle = {
    flex: 1, padding: "8px 12px", borderRadius: "10px", fontSize: "0.85rem",
    background: "var(--bg-secondary)", color: "var(--text-primary)",
    border: "1px solid var(--border)", outline: "none",
    appearance: "auto", cursor: "pointer",
  };
  const mobileRowStyle = {
    display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px",
  };
  const mobileLabelStyle = {
    fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap", minWidth: "60px",
  };

  if (isMobile) {
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={mobileRowStyle}>
          <span style={mobileLabelStyle}>Best for:</span>
          <select value={bestFor} onChange={(e) => setBestFor(e.target.value)} style={selectStyle}>
            {BEST_FOR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div style={mobileRowStyle}>
          <span style={mobileLabelStyle}>Players:</span>
          <select value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value))} style={selectStyle}>
            {PLAYER_COUNT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={mobileRowStyle}>
          <span style={mobileLabelStyle}>Time:</span>
          <select value={playTime} onChange={(e) => setPlayTime(parseInt(e.target.value))} style={selectStyle}>
            {PLAY_TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={mobileRowStyle}>
          <span style={mobileLabelStyle}>Difficulty:</span>
          <select value={complexity} onChange={(e) => setComplexity(e.target.value)} style={selectStyle}>
            {COMPLEXITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === "all" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Row 1: Best for */}
      <div style={rowStyle}>
        <span style={labelStyle}>Best for:</span>
        {BEST_FOR_OPTIONS.map((opt) => (
          <button key={opt} onClick={() => setBestFor(opt)}
            style={pillStyle(bestFor === opt, BEST_FOR_COLORS[opt])}>{opt}</button>
        ))}
      </div>

      {/* Row 2: Players */}
      <div style={rowStyle}>
        <span style={labelStyle}>Players:</span>
        {PLAYER_COUNT_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setPlayerCount(opt.value)}
            style={pillStyle(playerCount === opt.value)}>{opt.label}</button>
        ))}
      </div>

      {/* Row 3: Time */}
      <div style={rowStyle}>
        <span style={labelStyle}>Time:</span>
        {PLAY_TIME_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setPlayTime(opt.value)}
            style={pillStyle(playTime === opt.value)}>{opt.label}</button>
        ))}
      </div>

      {/* Row 4: Difficulty */}
      <div style={rowStyle}>
        <span style={labelStyle}>Difficulty:</span>
        {COMPLEXITY_OPTIONS.map((opt) => (
          <button key={opt} onClick={() => setComplexity(opt)}
            style={{ ...pillStyle(complexity === opt, opt === "all" ? undefined : COMPLEXITY_COLORS[opt]), textTransform: "capitalize" }}>
            {opt === "all" ? "All" : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function GenreCarousel({ title, games, onGameClick, color, source }) {
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
            <GameCard game={game} onClick={() => onGameClick(game, source || 'carousel')} small />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rental system (SWP venue only) ──────────────────────────────

const RENTAL_VENUES = new Set(["shallweplay"]);

function isRentalVenue() {
  const venueId = localStorage.getItem("gmai_venue_id") || "";
  if (RENTAL_VENUES.has(venueId)) return true;
  // Also check URL param for /play?venue=shallweplay flow
  try {
    const params = new URLSearchParams(window.location.search);
    if (RENTAL_VENUES.has(params.get("venue"))) return true;
  } catch {}
  return false;
}

function RentalBanner({ onDismiss }) {
  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      borderRadius: "16px",
      padding: "20px 24px",
      marginBottom: "20px",
      border: "1px solid rgba(233, 69, 96, 0.3)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss rental banner"
        style={{
          position: "absolute", top: "10px", right: "10px",
          background: "rgba(255,255,255,0.1)", border: "none",
          color: "rgba(255,255,255,0.6)", width: "28px", height: "28px",
          borderRadius: "50%", cursor: "pointer", fontSize: "0.9rem",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        &times;
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <span style={{ fontSize: "1.4rem" }}>{"\u{1F3B2}"}</span>
        <h3 style={{
          margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff",
          letterSpacing: "0.02em",
        }}>
          TAKE HOME RENTALS &mdash; $10/month
        </h3>
      </div>

      <p style={{
        color: "rgba(255,255,255,0.8)", fontSize: "0.9rem",
        margin: "0 0 14px 0", lineHeight: 1.5,
      }}>
        Borrow one game at a time. Play at home. Return when ready. No late fees.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            const grid = document.getElementById("game-grid");
            if (grid) grid.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            padding: "8px 18px", borderRadius: "10px", fontWeight: 700,
            fontSize: "0.85rem", background: "var(--accent)", color: "#fff",
            border: "none", cursor: "pointer",
          }}
        >
          Browse Rentals
        </button>
        <details style={{ display: "inline-block" }}>
          <summary style={{
            padding: "8px 18px", borderRadius: "10px", fontWeight: 600,
            fontSize: "0.85rem", background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer", listStyle: "none",
          }}>
            Learn More
          </summary>
          <ul style={{
            margin: "12px 0 0", padding: "0 0 0 18px",
            color: "rgba(255,255,255,0.8)", fontSize: "0.85rem", lineHeight: 1.8,
          }}>
            <li>$10/month unlimited rentals</li>
            <li>Borrow one game at a time from our library</li>
            <li>Return anytime, no late fees</li>
            <li>Pick up in store</li>
            <li>Cancel anytime</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

function RentalModal({ game, onClose }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { email, password, game, is_returning }
  const [copied, setCopied] = useState(false);

  if (!game) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !contact.trim()) return;
    setSubmitting(true);
    try {
      const venueId = localStorage.getItem("gmai_venue_id") || "";
      const res = await submitRentalRequest({
        game_id: game.game_id,
        name: name.trim(),
        contact: contact.trim(),
        venue_id: venueId,
        table_number: null,
        device_id: localStorage.getItem("gmai_device_id") || null,
      });
      EventTracker.track("rental_requested", game.game_id, {
        game_title: game.title,
      });
      setResult(res);
    } catch (err) {
      console.error("Rental request failed:", err);
    }
    setSubmitting(false);
  };

  const handleCopy = () => {
    if (!result) return;
    const text = result.password
      ? `GameMaster Guide Home Access\nLogin: ${result.email}\nPassword: ${result.password}\nURL: playgmg.com/login`
      : `GameMaster Guide Home Access\nLogin: ${result.email}\nURL: playgmg.com/login`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1px solid var(--border)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1400,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-primary)", borderRadius: "16px",
          padding: "24px", width: "100%", maxWidth: "380px",
          border: "1px solid var(--border)",
          animation: "fadeIn 0.2s ease-out",
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          /* ── Confirmation screen with account info ── */
          <div style={{ padding: "8px 0" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>&#x2705;</div>
              <h3 style={{ color: "var(--text-primary)", fontSize: "1.15rem", marginBottom: "6px" }}>
                Rental Request Submitted!
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                Staff will prepare <strong>{result.game}</strong> for pickup.
              </p>
            </div>

            {/* Home access credentials — only for new subscribers */}
            {result.password && (
              <div style={{
                background: "var(--bg-secondary)", borderRadius: "12px",
                border: "1px solid var(--border)", padding: "16px", marginBottom: "16px",
              }}>
                <div style={{
                  fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px",
                  borderBottom: "1px solid var(--border)", paddingBottom: "8px",
                }}>
                  Your GMG Home Access
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Use the teaching guides, Q&amp;A, and rules at home while you play your rental.
                </p>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Login: </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {result.email}
                  </span>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Password: </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {result.password}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>URL: </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent)" }}>
                    playgmg.com/login
                  </span>
                </div>
              </div>
            )}

            {/* Returning subscriber — welcome back */}
            {result.is_returning && (
              <div style={{
                background: "var(--bg-secondary)", borderRadius: "12px",
                border: "1px solid var(--border)", padding: "16px", marginBottom: "16px",
                textAlign: "center",
              }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                  Welcome back! Your GMG account is still active. Log in at{" "}
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>playgmg.com/login</span>{" "}
                  with your original credentials.
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              {result.password && (
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    border: "1px solid var(--border)", fontWeight: 600,
                    cursor: "pointer", fontSize: "0.85rem",
                  }}
                >
                  {copied ? "Copied!" : "Copy Login Info"}
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "12px", borderRadius: "10px",
                  background: "var(--accent)", color: "#fff",
                  border: "none", fontWeight: 600, cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Rental request form ── */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "1.3rem" }}>{"\u{1F3B2}"}</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Rent This Game
              </h3>
            </div>

            {/* Game preview */}
            <div style={{
              display: "flex", gap: "14px", padding: "14px",
              background: "var(--bg-secondary)", borderRadius: "12px",
              border: "1px solid var(--border)", marginBottom: "16px",
            }}>
              <img
                src={`${API_BASE}/api/images/${game.game_id}.jpg`}
                alt={game.title}
                onError={(e) => { e.target.style.display = "none"; }}
                style={{
                  width: "64px", height: "64px", borderRadius: "10px",
                  objectFit: "cover", flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                  {game.title}
                </div>
                <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.9rem", marginTop: "4px" }}>
                  $10/mo &middot; Unlimited Rentals
                </div>
              </div>
            </div>

            <p style={{
              color: "var(--text-secondary)", fontSize: "0.85rem",
              margin: "0 0 16px", lineHeight: 1.5,
            }}>
              One game at a time. Return anytime. No late fees.
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                Name <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                Phone or Email <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number or email" style={inputStyle} />
            </div>

            <button
              disabled={submitting || !name.trim() || !contact.trim()}
              onClick={handleSubmit}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px",
                background: submitting || !name.trim() || !contact.trim() ? "#6b7280" : "#22c55e",
                color: "#fff", border: "none", fontSize: "0.95rem",
                fontWeight: 700, cursor: submitting || !name.trim() || !contact.trim() ? "not-allowed" : "pointer",
                opacity: submitting || !name.trim() || !contact.trim() ? 0.7 : 1,
                marginBottom: "10px",
              }}
            >
              {submitting ? "Submitting\u2026" : "Request This Game"}
            </button>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center", margin: 0 }}>
              Staff will prepare your game for pickup.
            </p>
          </>
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
  const [collection, setCollection] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [apiFeatured, setApiFeatured] = useState(null);
  const [apiStaffPicks, setApiStaffPicks] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, venueName, role, venueId } = useAuth();

  // Rental system state — show for SWP venue OR rental_subscriber role
  const rentalsEnabled = isRentalVenue() || role === "rental_subscriber";
  const [rentalBannerDismissed, setRentalBannerDismissed] = useState(
    () => sessionStorage.getItem("gmai_rental_banner_dismissed") === "1"
  );
  const [rentalGame, setRentalGame] = useState(null); // game object for modal
  const [currentRental, setCurrentRental] = useState(null); // { game_id, title } for subscriber banner

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
    EventTracker.track('filter_applied', null, { filter_type: 'difficulty', filter_value: val });
  };

  const setPlayerCount = (val) => {
    setPlayerCountState(val);
    const params = new URLSearchParams(searchParams);
    if (val === 0) params.delete("players"); else params.set("players", val);
    setSearchParams(params, { replace: true });
    EventTracker.track('filter_applied', null, { filter_type: 'players', filter_value: val });
  };

  const setPlayTime = (val) => {
    setPlayTimeState(val);
    const params = new URLSearchParams(searchParams);
    if (val === 0) params.delete("time"); else params.set("time", val);
    setSearchParams(params, { replace: true });
    EventTracker.track('filter_applied', null, { filter_type: 'time', filter_value: val });
  };

  const setBestFor = (val) => {
    setBestForState(val);
    const params = new URLSearchParams(searchParams);
    if (val === "Any") params.delete("bestfor"); else params.set("bestfor", val);
    setSearchParams(params, { replace: true });
    EventTracker.track('filter_applied', null, { filter_type: 'best_for', filter_value: val });
  };

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchVenueConfig()
      .then((data) => {
        if (!mounted) return;
        setVenueConfig(data);
        if (data.accent_color) document.documentElement.style.setProperty("--accent", data.accent_color);
      })
      .catch(() => {
        if (mounted) setVenueConfig({ venue_name: "", venue_tagline: "", accent_color: "#e94560" });
      });

    fetchVenueCollection()
      .then((data) => {
        if (mounted && data.game_ids && data.game_ids.length > 0) setCollection(new Set(data.game_ids));
      })
      .catch(() => {
        if (!mounted) return;
        try {
          const local = JSON.parse(localStorage.getItem("gmai_venue_collection") || "null");
          if (local && local.length > 0) setCollection(new Set(local));
        } catch {}
      });

    // Fetch featured game and staff picks from API (sends auth for per-venue config)
    fetchFeaturedGame()
      .then((data) => { if (mounted && data?.game_id) setApiFeatured(data); })
      .catch(() => {});

    fetchStaffPicks()
      .then((data) => { if (mounted && Array.isArray(data) && data.length > 0) setApiStaffPicks(data); })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
      fetchGames(search)
        .then((data) => {
          if (!mounted) return;
          setGames(data);
          try { localStorage.setItem("gmai_games_cache", JSON.stringify(data)); } catch {}
        })
        .catch((err) => {
          if (!mounted) return;
          console.error(err);
          try {
            const cached = JSON.parse(localStorage.getItem("gmai_games_cache") || "[]");
            if (cached.length > 0) setGames(cached);
            else setError("GameMaster is taking a break — try again in a moment");
          } catch {
            setError("GameMaster is taking a break — try again in a moment");
          }
        })
        .finally(() => { if (mounted) setLoading(false); });
    }, 200);
    return () => { mounted = false; clearTimeout(timer); };
  }, [search]);

  // Track game_search with 1s debounce (separate from fetch debounce)
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      const resultsShown = games.slice(0, 5).map((g) => g.game_id);
      EventTracker.track('game_search', null, {
        query: search.trim(),
        results_count: games.length,
        results_shown: resultsShown,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [search, games]);

  useEffect(() => {
    // Check if admin triggered a recently-played clear
    fetchClearRecentTs()
      .then((data) => {
        const serverTs = data.clear_recent_ts;
        const localTs = localStorage.getItem("gmai_recent_cleared_at");
        if (serverTs && serverTs > (localTs || "")) {
          localStorage.removeItem("gmai_recent");
          localStorage.setItem("gmai_recent_cleared_at", serverTs);
          setRecentGames([]);
          return;
        }
        // Load recent games from localStorage
        try {
          const recent = JSON.parse(localStorage.getItem("gmai_recent") || "[]");
          setRecentGames(recent);
        } catch {}
      })
      .catch(() => {
        // If endpoint unreachable, just load from localStorage
        try {
          const recent = JSON.parse(localStorage.getItem("gmai_recent") || "[]");
          setRecentGames(recent);
        } catch {}
      });
  }, []);

  // Fetch current rental for rental_subscriber users
  useEffect(() => {
    if (role !== "rental_subscriber") return;
    let mounted = true;
    fetchMyRental()
      .then((data) => { if (mounted && data.current_game) setCurrentRental(data.current_game); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [role]);

  const handleGameClick = (game, source = 'browse') => {
    try {
      const key = "gmai_recent";
      let recent = JSON.parse(localStorage.getItem(key) || "[]");
      recent = [game.game_id, ...recent.filter((id) => id !== game.game_id)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(recent));
    } catch {}
    // Determine source: if search is active, it's a search result click
    const effectiveSource = search.trim() ? 'search' : source;
    EventTracker.track('game_selected', game.game_id, { game_title: game.title, source: effectiveSource });
    EventTracker.track('session_start', game.game_id, { game_title: game.title });
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
      const t = getPlayTime(g);
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

  const dismissRentalBanner = () => {
    setRentalBannerDismissed(true);
    sessionStorage.setItem("gmai_rental_banner_dismissed", "1");
  };

  // Game of the Day + Staff Picks (prefer API, fallback to client-side)
  const allBaseGames = collection ? games.filter((g) => collection.has(g.game_id)) : games;
  const gameOfTheDay = !search && !hasActiveFilters
    ? (apiFeatured || getGameOfTheDayFallback(allBaseGames))
    : null;
  const staffPickGames = !search && !hasActiveFilters
    ? (apiStaffPicks || STAFF_PICKS_FALLBACK.map((id) => allBaseGames.find((g) => g.game_id === id)).filter(Boolean))
    : [];

  // Deterministic daily shuffle — same order all day, refreshes at midnight
  const dailyShuffle = (arr) => {
    if (arr.length <= 1) return arr;
    const today = new Date();
    let seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Build genre carousels from all available games (before filtering)
  const allDisplayGames = allBaseGames;
  const genreCarousels = !search && !hasActiveFilters && allDisplayGames.length > 4
    ? [
        { title: "Party Games", color: COMPLEXITY_COLORS.party, games: dailyShuffle(allDisplayGames.filter((g) => g.complexity === "party")).slice(0, 12) },
        { title: "Easy to Learn", color: COMPLEXITY_COLORS.gateway, games: dailyShuffle(allDisplayGames.filter((g) => g.complexity === "gateway")).slice(0, 12) },
        { title: "For Strategists", color: COMPLEXITY_COLORS.midweight, games: dailyShuffle(allDisplayGames.filter((g) => g.complexity === "midweight")).slice(0, 12) },
        { title: "Brain Burners", color: COMPLEXITY_COLORS.heavy, games: dailyShuffle(allDisplayGames.filter((g) => g.complexity === "heavy")).slice(0, 12) },
      ].filter((c) => c.games.length > 0)
    : [];

  return (
    <div style={{ padding: "70px 20px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header with branding */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "4px" }}>
          <span style={{ fontSize: "1.5rem" }}>{"\u{1F3B2}"}</span>
          <h1 style={{ fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)", margin: 0, color: "var(--text-primary)", fontWeight: 800 }}>
            GameMaster Guide
          </h1>
        </div>
        {(isLoggedIn ? venueName : venueConfig?.venue_name) && (
          <p style={{ color: "var(--accent)", fontSize: "0.95rem", fontWeight: 600, marginBottom: "2px" }}>
            at {isLoggedIn ? venueName : venueConfig.venue_name}
          </p>
        )}
        {displayGames.length > 0 && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "4px", marginBottom: "0" }}>
            {displayGames.length} game{displayGames.length !== 1 ? "s" : ""} {hasActiveFilters ? "matching" : "available"}
          </p>
        )}
      </div>

      {/* Stonemaier partner banner — convention and stonemaier accounts only */}
      {(role === "stonemaier" || role === "convention") && (
        <div style={{
          background: "linear-gradient(135deg, #0d4f4f 0%, #1a6b6b 100%)",
          borderRadius: "12px",
          padding: "10px 16px",
          marginBottom: "16px",
          textAlign: "center",
          fontSize: "0.9rem",
          color: "#b2dfdb",
          fontWeight: 500,
        }}>
          Stonemaier Games Collection &mdash; Powered by GameMaster Guide
        </div>
      )}

      {/* Rental Banner — SWP venues only */}
      {rentalsEnabled && !rentalBannerDismissed && role !== "rental_subscriber" && (
        <RentalBanner onDismiss={dismissRentalBanner} />
      )}

      {/* Current rental status for subscribers */}
      {currentRental && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px",
          background: "linear-gradient(135deg, #064e3b, #065f46)",
          borderRadius: "12px", marginBottom: "16px",
          border: "1px solid rgba(34,197,94,0.3)",
        }}>
          <span style={{ fontSize: "1.2rem" }}>{"\u{1F3B2}"}</span>
          <div style={{ flex: 1 }}>
            <span style={{ color: "#d1fae5", fontSize: "0.85rem" }}>Currently renting: </span>
            <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{currentRental.title}</strong>
          </div>
          <span style={{ color: "#86efac", fontSize: "0.75rem" }}>
            Return anytime at Shall We Play?
          </span>
        </div>
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
        playTime={playTime}
        setPlayTime={setPlayTime}
        bestFor={bestFor}
        setBestFor={setBestFor}
      />

      {/* Game of the Day */}
      {gameOfTheDay && (
        <GameOfTheDay game={gameOfTheDay} onClick={() => handleGameClick(gameOfTheDay, 'gotd')} />
      )}

      {/* Staff Picks */}
      {staffPickGames.length > 0 && (
        <GenreCarousel
          title="Staff Picks"
          games={staffPickGames}
          onGameClick={handleGameClick}
          color="var(--accent)"
          source="staff_pick"
        />
      )}

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
          <div id="game-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {displayGames.map((game) => (
              <div key={game.game_id} style={{ position: "relative" }}>
                <GameCard game={game} onClick={() => handleGameClick(game)} />
                {rentalsEnabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setRentalGame(game); }}
                    aria-label={`Rent ${game.title}`}
                    style={{
                      position: "absolute", bottom: "8px", right: "8px",
                      padding: "5px 12px", borderRadius: "8px", fontSize: "0.75rem",
                      fontWeight: 700, background: "rgba(34,197,94,0.9)", color: "#fff",
                      border: "none", cursor: "pointer", zIndex: 2,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    + Rent
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rental request modal */}
      {rentalGame && (
        <RentalModal game={rentalGame} onClose={() => setRentalGame(null)} />
      )}
    </div>
  );
}
