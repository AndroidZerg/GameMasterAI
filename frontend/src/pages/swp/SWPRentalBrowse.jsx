import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { THEME, FONTS_LINK, styles } from "./swpTheme";
import SWPRentalNav from "./SWPRentalNav";
import {
  fetchRentalProfile,
  fetchRentalCatalog,
  fetchGames,
  createRentalReservation,
  addToWishlist,
  removeFromWishlist,
} from "../../services/api";

const STRIPE_LINK = "https://buy.stripe.com/3cI6oA4Yldsb5ne5UG5Vu01";

// ── Filter constants ────────────────────────────────────────────

const COMPLEXITY_COLORS = {
  party: "#a855f7",
  gateway: "#22c55e",
  midweight: "#3b82f6",
  heavy: "#ef4444",
};

const PLAYER_COUNT_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "2", value: 2 },
  { label: "3-4", value: 3 },
  { label: "5-6", value: 5 },
  { label: "7+", value: 7 },
];

const PLAY_TIME_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "<30m", value: 30 },
  { label: "30-60m", value: 60 },
  { label: "60-90m", value: 90 },
  { label: "90m+", value: 91 },
];

const BEST_FOR_OPTIONS = [
  "Any", "Solo", "Great for 2", "Family", "Party",
  "Date Night", "Brain Burner", "For Strategists",
  "Quick Filler", "Large Group", "Campaign", "Kids",
];

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

const COMPLEXITY_TIME_ESTIMATES = { party: 20, gateway: 45, midweight: 75, heavy: 120 };

function getPlayTime(game) {
  if (!game._meta) return 45;
  const id = game._meta.game_id;
  if (PLAY_TIMES[id]) return PLAY_TIMES[id];
  return COMPLEXITY_TIME_ESTIMATES[game._meta.complexity] || 45;
}

function getBestForTags(game) {
  if (!game._meta) return [];
  const m = game._meta;
  const tags = [];
  const min = m.player_count?.min || 1;
  const max = m.player_count?.max || 4;
  const time = getPlayTime(game);
  const cats = m.categories || [];
  if (min === 1) tags.push("Solo");
  if (min <= 2 && max >= 2) tags.push("Great for 2");
  if (max >= 5 && (m.complexity === "party" || max >= 6)) tags.push("Party");
  if (m.complexity === "party" || m.complexity === "gateway") {
    if (max >= 3) tags.push("Family");
  }
  if (m.complexity === "heavy") tags.push("Brain Burner");
  if (m.complexity === "midweight" || m.complexity === "heavy") tags.push("For Strategists");
  if (min <= 2 && max <= 2) tags.push("Date Night");
  if (m.complexity === "party" || (m.complexity === "gateway" && time <= 30)) tags.push("Kids");
  if (max >= 7) tags.push("Large Group");
  if (time <= 25) tags.push("Quick Filler");
  if (cats.includes("campaign") || cats.includes("legacy-elements") || cats.includes("legacy")) tags.push("Campaign");
  return tags;
}

// ── Date options ────────────────────────────────────────────────

function getDateOptions() {
  const opts = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    opts.push({ label, value: d.toISOString().split("T")[0] });
  }
  return opts;
}

// ── FilterBar ───────────────────────────────────────────────────

const filterRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 4,
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
  marginBottom: 8,
};

function FilterPill({ active, color, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 13px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        background: active ? (color || THEME.primary) : "#fff",
        color: active ? "#fff" : THEME.textSecondary,
        border: `1px solid ${active ? "transparent" : "#ddd"}`,
        cursor: "pointer",
        fontFamily: THEME.fontBody,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function FilterBar({ complexity, setComplexity, playerCount, setPlayerCount,
                     playTime, setPlayTime, bestFor, setBestFor }) {
  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: THEME.text,
    marginRight: 4, flexShrink: 0, textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Best For */}
      <div style={filterRowStyle}>
        <span style={labelStyle}>Best for</span>
        {BEST_FOR_OPTIONS.map((opt) => (
          <FilterPill key={opt} active={bestFor === opt}
            color={BEST_FOR_COLORS[opt]} label={opt}
            onClick={() => setBestFor(bestFor === opt ? "Any" : opt)} />
        ))}
      </div>
      {/* Players */}
      <div style={filterRowStyle}>
        <span style={labelStyle}>Players</span>
        {PLAYER_COUNT_OPTIONS.map((opt) => (
          <FilterPill key={opt.value} active={playerCount === opt.value}
            label={opt.label}
            onClick={() => setPlayerCount(opt.value)} />
        ))}
      </div>
      {/* Time */}
      <div style={filterRowStyle}>
        <span style={labelStyle}>Time</span>
        {PLAY_TIME_OPTIONS.map((opt) => (
          <FilterPill key={opt.value} active={playTime === opt.value}
            label={opt.label}
            onClick={() => setPlayTime(opt.value)} />
        ))}
      </div>
      {/* Difficulty */}
      <div style={filterRowStyle}>
        <span style={labelStyle}>Difficulty</span>
        {["all", "gateway", "midweight", "heavy"].map((opt) => (
          <FilterPill key={opt} active={complexity === opt}
            color={opt === "all" ? null : COMPLEXITY_COLORS[opt]}
            label={opt === "all" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}
            onClick={() => setComplexity(opt)} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export default function SWPRentalBrowse() {
  const customerId = localStorage.getItem("swp_rental_customer");

  const [profile, setProfile] = useState(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [games, setGames] = useState([]);
  const [metadataMap, setMetadataMap] = useState(null); // Map<lowercase_title, gameObj>
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalGame, setModalGame] = useState(null);
  const [pickupDate, setPickupDate] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reserveMsg, setReserveMsg] = useState(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [wishlistUpdating, setWishlistUpdating] = useState(new Set());
  const [instoreToast, setInstoreToast] = useState(null);

  // Filter state
  const [complexity, setComplexity] = useState("all");
  const [playerCount, setPlayerCount] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [bestFor, setBestFor] = useState("Any");

  useEffect(() => {
    document.title = "Browse Games | SWP Rentals";
    if (!document.querySelector('link[href*="Fraunces"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS_LINK;
      document.head.appendChild(link);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Load rental catalog + main catalog in parallel
      const [catalogData, mainGames] = await Promise.all([
        fetchRentalCatalog("shallweplay", "all", customerId || null),
        fetchGames().catch(() => []),
      ]);
      setGames(catalogData.games || []);

      // Build title → metadata lookup
      const map = new Map();
      (Array.isArray(mainGames) ? mainGames : []).forEach((g) => {
        map.set(g.title.toLowerCase(), g);
      });
      setMetadataMap(map);

      // Load profile only if subscriber
      if (customerId) {
        try {
          const profileData = await fetchRentalProfile(customerId);
          if (profileData.subscriber && profileData.subscriber.status === "active") {
            setProfile(profileData);
            setIsSubscriber(true);
          }
        } catch {
          // Not a valid subscriber — can still browse
        }
      }
    } catch {
      // Catalog failed — show empty
      setMetadataMap(new Map());
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Enrich rental games with metadata
  const enriched = useMemo(() => {
    if (!metadataMap) return games;
    return games.map((g) => {
      const meta = metadataMap.get(g.title.toLowerCase()) || null;
      return meta ? { ...g, _meta: meta } : g;
    });
  }, [games, metadataMap]);

  // Filter pipeline
  const hasActiveFilters = complexity !== "all" || playerCount > 0 || playTime > 0 || bestFor !== "Any";

  const filtered = useMemo(() => {
    let list = enriched;

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q));
    }

    // Complexity
    if (complexity !== "all") {
      list = list.filter((g) => !g._meta || g._meta.complexity === complexity);
    }

    // Players
    if (playerCount > 0) {
      list = list.filter((g) => {
        if (!g._meta) return true;
        return (g._meta.player_count?.max || 99) >= playerCount;
      });
    }

    // Play time
    if (playTime > 0) {
      list = list.filter((g) => {
        if (!g._meta) return true;
        const t = getPlayTime(g);
        if (playTime === 30) return t < 30;
        if (playTime === 60) return t >= 30 && t <= 60;
        if (playTime === 90) return t > 60 && t <= 90;
        if (playTime === 91) return t > 90;
        return true;
      });
    }

    // Best For
    if (bestFor !== "Any") {
      list = list.filter((g) => !g._meta || getBestForTags(g).includes(bestFor));
    }

    // When filters active, sort matched games first, unmatched after
    if (hasActiveFilters) {
      list = [...list].sort((a, b) => {
        const aHas = a._meta ? 0 : 1;
        const bHas = b._meta ? 0 : 1;
        return aHas - bHas;
      });
    }

    return list;
  }, [enriched, search, complexity, playerCount, playTime, bestFor, hasActiveFilters]);

  const dateOptions = getDateOptions();

  const handleGameClick = (g) => {
    if (g.status !== "available") return;
    // In-store only games can't be reserved
    if (!g.rentable_takehome && g.rentable_instore) {
      setInstoreToast(g.title);
      setTimeout(() => setInstoreToast(null), 3000);
      return;
    }
    if (!isSubscriber) {
      setShowSubscribeModal(true);
      return;
    }
    setModalGame(g);
    setPickupDate("");
    setReserveMsg(null);
    setReserving(false);
  };

  const handleWishlistToggle = async (e, game) => {
    e.stopPropagation();
    if (!customerId || !isSubscriber) {
      setShowSubscribeModal(true);
      return;
    }
    const id = game.id;
    setWishlistUpdating((prev) => new Set(prev).add(id));
    try {
      if (game.wishlisted) {
        await removeFromWishlist({ stripe_customer_id: customerId, inventory_id: id });
      } else {
        await addToWishlist({ stripe_customer_id: customerId, inventory_id: id });
      }
      setGames((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, wishlisted: !g.wishlisted, wishlist_count: (g.wishlist_count || 0) + (g.wishlisted ? -1 : 1) }
            : g,
        ),
      );
    } catch { /* silently fail */ }
    setWishlistUpdating((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleReserve = async () => {
    if (!pickupDate || !modalGame || !customerId) return;
    setReserving(true);
    try {
      const result = await createRentalReservation({
        stripe_customer_id: customerId,
        inventory_id: modalGame.id,
        pickup_deadline: pickupDate,
      });
      setReserveMsg(result.message || "Reserved!");
      setTimeout(() => {
        setModalGame(null);
        setReserveMsg(null);
        setPickupDate("");
        loadData();
      }, 2000);
    } catch (err) {
      setReserveMsg(err.message || "Reservation failed");
      setReserving(false);
    }
  };

  const clearFilters = () => {
    setComplexity("all");
    setPlayerCount(0);
    setPlayTime(0);
    setBestFor("Any");
  };

  const currentRental = profile?.current_rental;
  const hasCurrentRental = !!currentRental;

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: THEME.textSecondary, fontSize: 16 }}>Loading catalog...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <SWPRentalNav subscriberName={profile?.subscriber?.name} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Heading */}
        <h1 style={{ fontFamily: THEME.fontHeading, fontSize: 24, fontWeight: 700, margin: "0 0 16px" }}>
          {isSubscriber
            ? <>Hey {profile?.subscriber?.name?.split(" ")[0] || "there"}! &#128075;</>
            : hasActiveFilters || search
              ? <>{filtered.length} of {games.length} games</>
              : <>{games.length} games</>}
        </h1>

        {/* Current rental banner (subscribers only) */}
        {hasCurrentRental && (
          <div style={{
            ...styles.card, padding: "14px 20px", marginBottom: 20,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>
              Currently renting: <strong>{currentRental.game_title}</strong>
            </span>
            {currentRental.game_id && (
              <Link to={`/game/${currentRental.game_id}`}
                style={{ color: THEME.primary, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Learn to Play &rarr;
              </Link>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder={`Search ${games.length}+ games...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...styles.input, fontSize: 15 }}
          />
        </div>

        {/* Filters */}
        {metadataMap && (
          <FilterBar
            complexity={complexity} setComplexity={setComplexity}
            playerCount={playerCount} setPlayerCount={setPlayerCount}
            playTime={playTime} setPlayTime={setPlayTime}
            bestFor={bestFor} setBestFor={setBestFor}
          />
        )}

        {/* Game grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 14,
        }}>
          {filtered.map((g) => {
            const isYours = hasCurrentRental && currentRental.game_title === g.title;
            const isAvailable = g.status === "available" && !isYours;
            const isUnmatched = hasActiveFilters && !g._meta;
            const instoreOnly = g.rentable_instore && !g.rentable_takehome;

            // Badge logic
            let badgeBg = "#9ca3af";
            let badgeText = "Rented";
            if (isYours) {
              badgeBg = THEME.primary;
              badgeText = "You have this!";
            } else if (g.status === "available") {
              if (instoreOnly) {
                badgeBg = "#3b82f6";
                badgeText = "In-Store Only";
              } else {
                badgeBg = "#22c55e";
                badgeText = "Available";
              }
            } else if (g.status === "reserved") {
              badgeBg = "#eab308";
              badgeText = "Reserved";
            }

            return (
              <div
                key={g.id}
                onClick={() => isAvailable ? handleGameClick(g) : null}
                style={{
                  ...styles.card, padding: 0, overflow: "hidden",
                  cursor: isAvailable ? "pointer" : "default",
                  opacity: isUnmatched ? 0.55
                    : (g.status !== "available" && !isYours) ? 0.7
                    : 1,
                  transition: "transform 0.1s, opacity 0.2s",
                }}
              >
                <div style={{
                  width: "100%", aspectRatio: "1", background: "#f0ece6",
                  position: "relative",
                }}>
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 32 }}>
                      &#127922;
                    </div>
                  )}
                  {/* Wishlist heart */}
                  <button
                    onClick={(e) => handleWishlistToggle(e, g)}
                    disabled={wishlistUpdating.has(g.id)}
                    style={{
                      position: "absolute", top: 8, left: 8,
                      background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%",
                      width: 30, height: 30, cursor: "pointer", fontSize: 14,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: wishlistUpdating.has(g.id) ? 0.5 : 1,
                    }}
                  >
                    {g.wishlisted ? "\u2764\uFE0F" : "\uD83E\uDD0D"}
                  </button>
                  {/* Status badge */}
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: badgeBg,
                    color: "#fff",
                  }}>
                    {badgeText}
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{g.title}</div>
                  {g.for_sale && g.shopify_price_cents > 0 && (
                    <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, marginTop: 2 }}>
                      ${(g.shopify_price_cents / 100).toFixed(2)}
                    </div>
                  )}
                  {g.wishlist_count > 0 && (
                    <div style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 2 }}>
                      {g.wishlist_count} wishlisted
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: THEME.textSecondary }}>
            {search
              ? <>No games found matching &ldquo;{search}&rdquo;</>
              : hasActiveFilters
              ? "No games match these filters"
              : "No games available"}
            {hasActiveFilters && (
              <div style={{ marginTop: 16 }}>
                <button onClick={clearFilters} style={{
                  padding: "10px 20px", borderRadius: 8, background: THEME.primary,
                  color: "#fff", border: "none", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: THEME.fontBody,
                }}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-store only toast */}
      {instoreToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1e40af", color: "#fff", padding: "12px 24px", borderRadius: 12,
          fontSize: 14, fontWeight: 600, zIndex: 1100, maxWidth: 340, textAlign: "center",
        }}>
          {instoreToast} is in-store only — visit Shall We Play? to play!
        </div>
      )}

      {/* Subscribe modal (non-subscribers clicking Reserve) */}
      {showSubscribeModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSubscribeModal(false); }}
        >
          <div style={{ ...styles.card, maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
            <h3 style={{ fontFamily: THEME.fontHeading, fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
              Subscribe to reserve games
            </h3>
            <p style={{ fontSize: 15, color: THEME.textSecondary, marginBottom: 6 }}>
              <strong style={{ color: THEME.text }}>$9.99/month</strong> — one game at a time, swap anytime.
            </p>
            <p style={{ fontSize: 13, color: "#C1432E", fontWeight: 600, marginBottom: 24 }}>
              Your $9.99 goes toward the purchase price if you buy it.
            </p>
            <a href={STRIPE_LINK} style={{
              display: "block", padding: "14px 28px", background: "#C1432E", color: "#fff",
              fontWeight: 700, fontSize: 15, borderRadius: 50, textDecoration: "none",
              marginBottom: 12,
            }}>
              Subscribe Now →
            </a>
            <button
              onClick={() => setShowSubscribeModal(false)}
              style={{
                background: "none", border: "none", color: THEME.textSecondary,
                fontSize: 14, cursor: "pointer", padding: 8,
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Reservation modal (subscribers) */}
      {modalGame && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setModalGame(null); } }}
        >
          <div style={{ ...styles.card, maxWidth: 400, width: "100%" }}>
            {reserveMsg ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>&#9989;</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>{reserveMsg}</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  {modalGame.image_url && (
                    <img src={modalGame.image_url} alt={modalGame.title}
                      style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <h3 style={{ fontFamily: THEME.fontHeading, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
                      {modalGame.title}
                    </h3>
                    <span style={{ fontSize: 13, color: THEME.textSecondary }}>Reserve this game</span>
                  </div>
                </div>

                {hasCurrentRental && (
                  <div style={{
                    background: "#fef3c7", borderRadius: 10, padding: "10px 14px",
                    marginBottom: 16, fontSize: 13, color: "#92400e",
                  }}>
                    This will be your return date for <strong>{currentRental.game_title}</strong>.
                  </div>
                )}

                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Pick up by:</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPickupDate(opt.value)}
                      style={{
                        flex: 1, padding: "12px 8px", borderRadius: 10,
                        border: pickupDate === opt.value ? `2px solid ${THEME.primary}` : "2px solid #e5e7eb",
                        background: pickupDate === opt.value ? "#f0fdfa" : "#fff",
                        cursor: "pointer", fontWeight: 600, fontSize: 14,
                        fontFamily: THEME.fontBody, color: THEME.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setModalGame(null)}
                    style={{ ...styles.ghostBtn, flex: 1, padding: "12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReserve}
                    disabled={!pickupDate || reserving}
                    style={{
                      ...styles.tealBtn, flex: 1, padding: "12px",
                      opacity: !pickupDate || reserving ? 0.5 : 1,
                    }}
                  >
                    {reserving ? "Reserving..." : "Reserve"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
