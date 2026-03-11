import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchGames,
  fetchAllVenues,
  fetchVenueHomeConfig,
  saveVenueHomeConfig,
  resetVenueHomeConfig,
  API_BASE,
} from "../services/api";
import Breadcrumb from "./Breadcrumb";

// Ordered venue options for the dropdown
const SPECIAL_ACCOUNTS = [
  { venue_id: "convention", venue_name: "Convention (/signup)" },
  { venue_id: "meetup", venue_name: "Meetup" },
];

const DEMO_VENUE_ORDER = [
  "thaihouse",
  "shallweplay",
  "dicetowerwest",
];

export default function CustomizeHomePage() {
  const [allGames, setAllGames] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success"); // "success" or "error"

  // Venue selector
  const [selectedVenue, setSelectedVenue] = useState("global");
  const [isCustom, setIsCustom] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Featured state
  const [featuredMode, setFeaturedMode] = useState("auto");
  const [featuredGameId, setFeaturedGameId] = useState("");
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [showFeaturedDropdown, setShowFeaturedDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  // Staff picks state
  const [staffPicks, setStaffPicks] = useState([]);
  const [picksSearch, setPicksSearch] = useState("");
  const [showPicksDropdown, setShowPicksDropdown] = useState(false);

  const featuredRef = useRef(null);
  const picksRef = useRef(null);

  // Load games + venues on mount
  useEffect(() => {
    Promise.all([fetchGames(), fetchAllVenues()])
      .then(([games, venueList]) => {
        setAllGames(games);
        setVenues(venueList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load config for the selected venue
  const loadVenueConfig = useCallback(async (venueId) => {
    setConfigLoading(true);
    try {
      const data = await fetchVenueHomeConfig(venueId);
      setFeaturedMode(data.featured?.mode || "auto");
      setFeaturedGameId(data.featured?.game_id || "");
      setStaffPicks(data.staff_picks || []);
      setIsCustom(data.is_custom || false);
    } catch {
      setFeaturedMode("auto");
      setFeaturedGameId("");
      setStaffPicks([]);
      setIsCustom(false);
    }
    setConfigLoading(false);
    setFeaturedSearch("");
    setPicksSearch("");
  }, []);

  // Load config when venue changes or on initial load
  useEffect(() => {
    if (!loading) {
      loadVenueConfig(selectedVenue);
    }
  }, [selectedVenue, loading, loadVenueConfig]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (featuredRef.current && !featuredRef.current.contains(e.target)) {
        setShowFeaturedDropdown(false);
      }
      if (picksRef.current && !picksRef.current.contains(e.target)) {
        setShowPicksDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3000);
  };

  const gamesMap = {};
  allGames.forEach((g) => { gamesMap[g.game_id] = g; });
  const getGameTitle = (id) => gamesMap[id]?.title || id;

  // Build ordered dropdown options
  const buildVenueOptions = () => {
    const options = [
      { value: "global", label: "Global Defaults", group: null },
    ];

    // Special accounts
    for (const sa of SPECIAL_ACCOUNTS) {
      const match = venues.find((v) => v.venue_id === sa.venue_id);
      options.push({
        value: sa.venue_id,
        label: match ? `${match.venue_name}` : sa.venue_name,
        group: "special",
      });
    }

    // Demo venues in specified order
    for (const vid of DEMO_VENUE_ORDER) {
      const match = venues.find((v) => v.venue_id === vid);
      if (match) {
        options.push({ value: vid, label: match.venue_name, group: "demo" });
      }
    }

    // Any remaining venues not in the lists above
    const listed = new Set(["global", ...SPECIAL_ACCOUNTS.map((s) => s.venue_id), ...DEMO_VENUE_ORDER]);
    const extras = venues.filter((v) => !listed.has(v.venue_id) && !["admin", "meetup-admin", "demo-dicetower", "playgmai-demo"].includes(v.venue_id) && v.role !== "super_admin");
    for (const v of extras) {
      options.push({ value: v.venue_id, label: v.venue_name, group: "other" });
    }

    return options;
  };

  // ── Save both sections at once ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const featured = featuredMode === "auto"
        ? { mode: "auto" }
        : { mode: "manual", game_id: featuredGameId };
      await saveVenueHomeConfig(selectedVenue, { featured, staffPicks });
      // Refetch from Turso to confirm what was actually stored
      await loadVenueConfig(selectedVenue);
      setIsCustom(selectedVenue !== "global");
      showToast(`Saved for ${selectedVenueName()}!`, "success");
      // Signal GameSelector to refetch without full page reload
      window.dispatchEvent(new CustomEvent("venue-config-updated"));
    } catch {
      showToast("Failed to save", "error");
    }
    setSaving(false);
  };

  // ── Reset to global defaults ──
  const handleReset = async () => {
    setSaving(true);
    try {
      await resetVenueHomeConfig(selectedVenue);
      await loadVenueConfig(selectedVenue);
      showToast("Reset to global defaults", "success");
      window.dispatchEvent(new CustomEvent("venue-config-updated"));
    } catch {
      showToast("Failed to reset", "error");
    }
    setSaving(false);
  };

  const selectedVenueName = () => {
    if (selectedVenue === "global") return "Global Defaults";
    const match = venues.find((v) => v.venue_id === selectedVenue);
    return match?.venue_name || selectedVenue;
  };

  const addPick = (gameId) => {
    if (staffPicks.length >= 10) return;
    if (staffPicks.includes(gameId)) return;
    setStaffPicks([...staffPicks, gameId]);
    setPicksSearch("");
    setShowPicksDropdown(false);
  };

  const removePick = (gameId) => {
    setStaffPicks(staffPicks.filter((id) => id !== gameId));
  };

  const movePick = (index, dir) => {
    const arr = [...staffPicks];
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
    setStaffPicks(arr);
  };

  // ── Filtered search results ──
  const featuredResults = featuredSearch.trim()
    ? allGames.filter((g) => g.title.toLowerCase().includes(featuredSearch.toLowerCase())).slice(0, 8)
    : [];

  const picksResults = picksSearch.trim()
    ? allGames
        .filter((g) => g.title.toLowerCase().includes(picksSearch.toLowerCase()))
        .filter((g) => !staffPicks.includes(g.game_id))
        .slice(0, 8)
    : [];

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const btnStyle = (disabled) => ({
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    background: disabled ? "var(--border)" : "var(--accent)",
    color: "#fff",
    border: "none",
    fontSize: "1.05rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    marginTop: "4px",
    maxHeight: "240px",
    overflowY: "auto",
    zIndex: 10,
  };

  const dropdownItemStyle = {
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid var(--border)",
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ height: "200px", borderRadius: "16px", background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    );
  }

  const venueOptions = buildVenueOptions();

  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "600px", margin: "0 auto" }}>
      <Breadcrumb items={[{ label: "Admin" }, { label: "Customize Home" }]} />
      <h1 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)" }}>
        Customize Home
      </h1>

      {/* Toast */}
      {toast && (
        <div style={{
          background: toastType === "error" ? "#dc2626" : "var(--accent)",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: "10px",
          marginBottom: "16px",
          textAlign: "center",
          fontSize: "0.9rem",
          animation: "fadeIn 0.2s ease-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}>
          {toastType === "success" && <span>{"\u2705"}</span>}
          {toastType === "error" && <span>{"\u274C"}</span>}
          {toast}
        </div>
      )}

      {/* ── VENUE SELECTOR ── */}
      <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px 24px", border: "1px solid var(--border)", marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          Customize for:
        </label>
        <select
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
            appearance: "auto",
          }}
        >
          {venueOptions.map((opt, idx) => {
            // Insert group separators
            const prev = idx > 0 ? venueOptions[idx - 1] : null;
            const showSep = opt.group && (!prev || prev.group !== opt.group);
            return [
              showSep && opt.group === "special" && (
                <option key="sep-special" disabled style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.8rem" }}>
                  {"--- Special Accounts ---"}
                </option>
              ),
              showSep && opt.group === "demo" && (
                <option key="sep-demo" disabled style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.8rem" }}>
                  {"--- Demo Venues ---"}
                </option>
              ),
              showSep && opt.group === "other" && (
                <option key="sep-other" disabled style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.8rem" }}>
                  {"--- Other ---"}
                </option>
              ),
              <option key={opt.value} value={opt.value}>{opt.label}</option>,
            ];
          })}
        </select>

        {/* Defaults indicator + reset button */}
        {selectedVenue !== "global" && (
          <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              fontSize: "0.82rem",
              color: isCustom ? "var(--accent)" : "var(--text-secondary)",
              fontStyle: isCustom ? "normal" : "italic",
            }}>
              {isCustom ? "Has custom config" : "Using global defaults"}
            </span>
            {isCustom && (
              <button
                onClick={handleReset}
                disabled={saving}
                style={{
                  background: "none",
                  border: "none",
                  color: "#e94560",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                Reset to defaults
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay when switching venues */}
      {configLoading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Loading config...
        </div>
      )}

      {!configLoading && (
        <>
          {/* ── SECTION 1: Game of the Day ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border)", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              Game of the Day
            </h2>

            {/* Mode toggle */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Mode</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "auto", label: "Auto-Rotate" },
                  { value: "manual", label: "Manual Pick" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFeaturedMode(opt.value)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: "999px",
                      fontSize: "0.9rem",
                      background: featuredMode === opt.value ? "var(--accent)" : "var(--bg-secondary)",
                      color: featuredMode === opt.value ? "#fff" : "var(--text-secondary)",
                      border: featuredMode === opt.value ? "2px solid var(--accent)" : "2px solid var(--border)",
                      fontWeight: featuredMode === opt.value ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual game search */}
            {featuredMode === "manual" && (
              <div ref={featuredRef} style={{ position: "relative", marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Select Game
                </label>

                {/* Currently selected */}
                {featuredGameId && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px", borderRadius: "10px",
                    background: "var(--bg-secondary)", border: "1px solid var(--accent)",
                    marginBottom: "10px",
                  }}>
                    <img
                      src={`${API_BASE}/api/images/${featuredGameId}.jpg`}
                      alt=""
                      style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span style={{ flex: 1, fontWeight: 600, color: "var(--text-primary)" }}>
                      {getGameTitle(featuredGameId)}
                    </span>
                    <button
                      onClick={() => setFeaturedGameId("")}
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}
                    >
                      {"\u2715"}
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={featuredSearch}
                  onChange={(e) => { setFeaturedSearch(e.target.value); setShowFeaturedDropdown(true); }}
                  onFocus={() => setShowFeaturedDropdown(true)}
                  placeholder="Search for a game..."
                  style={inputStyle}
                />

                {showFeaturedDropdown && featuredResults.length > 0 && (
                  <div style={dropdownStyle}>
                    {featuredResults.map((g) => (
                      <div
                        key={g.game_id}
                        onClick={() => {
                          setFeaturedGameId(g.game_id);
                          setFeaturedSearch("");
                          setShowFeaturedDropdown(false);
                        }}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <img
                          src={`${API_BASE}/api/images/${g.game_id}.jpg`}
                          alt=""
                          style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <span>{g.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {featuredMode === "auto" && (
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                A different game is automatically featured each day based on the date.
              </p>
            )}
          </div>

          {/* ── SECTION 2: Staff Picks ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border)", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
              Staff Picks
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Choose up to 10 games to highlight on the home page.
            </p>

            {/* Current picks list */}
            {staffPicks.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                {staffPicks.map((gameId, idx) => (
                  <div
                    key={gameId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "var(--bg-secondary)",
                      marginBottom: "6px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600, width: "20px", textAlign: "center" }}>
                      {idx + 1}
                    </span>
                    <img
                      src={`${API_BASE}/api/images/${gameId}.jpg`}
                      alt=""
                      style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span style={{ flex: 1, fontSize: "0.95rem", fontWeight: 500, color: "var(--text-primary)" }}>
                      {getGameTitle(gameId)}
                    </span>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <button
                        onClick={() => movePick(idx, -1)}
                        disabled={idx === 0}
                        style={{
                          background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer",
                          color: idx === 0 ? "var(--border)" : "var(--text-secondary)", fontSize: "1rem", padding: "4px",
                        }}
                      >
                        {"\u25B2"}
                      </button>
                      <button
                        onClick={() => movePick(idx, 1)}
                        disabled={idx === staffPicks.length - 1}
                        style={{
                          background: "none", border: "none", cursor: idx === staffPicks.length - 1 ? "default" : "pointer",
                          color: idx === staffPicks.length - 1 ? "var(--border)" : "var(--text-secondary)", fontSize: "1rem", padding: "4px",
                        }}
                      >
                        {"\u25BC"}
                      </button>
                    </div>
                    <button
                      onClick={() => removePick(gameId)}
                      style={{ background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                    >
                      {"\u2715"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add game search */}
            {staffPicks.length < 10 && (
              <div ref={picksRef} style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="text"
                  value={picksSearch}
                  onChange={(e) => { setPicksSearch(e.target.value); setShowPicksDropdown(true); }}
                  onFocus={() => setShowPicksDropdown(true)}
                  placeholder="Search to add a game..."
                  style={inputStyle}
                />

                {showPicksDropdown && picksResults.length > 0 && (
                  <div style={dropdownStyle}>
                    {picksResults.map((g) => (
                      <div
                        key={g.game_id}
                        onClick={() => addPick(g.game_id)}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <img
                          src={`${API_BASE}/api/images/${g.game_id}.jpg`}
                          alt=""
                          style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <span>{g.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {staffPicks.length}/10 picks selected
              </span>
              {staffPicks.length > 0 && (
                <button
                  onClick={() => setStaffPicks([])}
                  style={{ background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* ── SAVE BUTTON ── */}
          <button
            onClick={handleSave}
            disabled={saving || (featuredMode === "manual" && !featuredGameId)}
            style={btnStyle(saving || (featuredMode === "manual" && !featuredGameId))}
          >
            {saving ? "Saving..." : `Save ${selectedVenue === "global" ? "Global Defaults" : selectedVenueName()}`}
          </button>
        </>
      )}
    </div>
  );
}
