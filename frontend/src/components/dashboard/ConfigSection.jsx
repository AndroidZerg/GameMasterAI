import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../../services/api";
import { sectionCard } from "./OverviewSection";
import {
  fetchGames,
  fetchVenueHomeConfig,
  saveVenueHomeConfig,
  fetchMeetupToggle,
  setMeetupToggle,
  clearRecentlyPlayed,
} from "../../services/api";

export default function ConfigSection({ venueId, token, isSuperAdmin, refreshKey }) {
  const [games, setGames] = useState([]);
  const [featured, setFeatured] = useState("");
  const [staffPicks, setStaffPicks] = useState([]);
  const [meetupEnabled, setMeetupEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const effectiveVenueId = venueId || "_default";

  // Load game list
  useEffect(() => {
    fetchGames().then((data) => {
      const list = Array.isArray(data) ? data : data?.games || [];
      setGames(list);
    }).catch(() => {});
  }, []);

  // Load config for selected venue
  useEffect(() => {
    if (!token) return;
    fetchVenueHomeConfig(effectiveVenueId)
      .then((data) => {
        setFeatured(data?.featured?.game_id || "");
        setStaffPicks(data?.staff_picks || []);
      })
      .catch(() => { setFeatured(""); setStaffPicks([]); });

    if (isSuperAdmin) {
      fetchMeetupToggle()
        .then((data) => setMeetupEnabled(data?.enabled || false))
        .catch(() => {});
    }
  }, [effectiveVenueId, token, refreshKey, isSuperAdmin]);

  const handleSaveFeatured = useCallback(async () => {
    setSaving(true);
    try {
      await saveVenueHomeConfig(effectiveVenueId, { featured: { mode: "manual", game_id: featured } });
      setMsg("Featured game saved!");
    } catch { setMsg("Failed to save"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }, [effectiveVenueId, featured]);

  const handleSaveStaffPicks = useCallback(async () => {
    setSaving(true);
    try {
      await saveVenueHomeConfig(effectiveVenueId, { staffPicks });
      setMsg("Staff picks saved!");
    } catch { setMsg("Failed to save"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }, [effectiveVenueId, staffPicks]);

  const handleMeetupToggle = useCallback(async () => {
    const next = !meetupEnabled;
    setMeetupEnabled(next);
    try {
      await setMeetupToggle(next);
      setMsg(`Meetup mode ${next ? "enabled" : "disabled"}`);
    } catch { setMsg("Failed to toggle meetup"); setMeetupEnabled(!next); }
    setTimeout(() => setMsg(""), 3000);
  }, [meetupEnabled]);

  const handleClearRecent = useCallback(async () => {
    try {
      await clearRecentlyPlayed();
      setMsg("Recently played cleared!");
    } catch { setMsg("Failed to clear"); }
    setTimeout(() => setMsg(""), 3000);
  }, []);

  const toggleStaffPick = (gameId) => {
    setStaffPicks((prev) => {
      if (prev.includes(gameId)) return prev.filter((id) => id !== gameId);
      if (prev.length >= 6) return prev;
      return [...prev, gameId];
    });
  };

  const gameOptions = games.map((g) => ({ id: g.game_id || g.id, title: g.title || g.game_id || g.id }));

  return (
    <div>
      {msg && (
        <div style={{
          padding: "8px 16px", borderRadius: 8, marginBottom: 16,
          background: msg.includes("Failed") ? "#7f1d1d" : "#14532d",
          color: msg.includes("Failed") ? "#fca5a5" : "#86efac",
          fontSize: "0.85rem",
        }}>{msg}</div>
      )}

      <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 16 }}>
        Configuring: {venueId || "Default (All Venues)"}
      </div>

      {/* Game of the Day */}
      <div style={{ ...sectionCard, marginBottom: 16 }}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Game of the Day</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={featured}
            onChange={(e) => setFeatured(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 6, border: "1px solid #334155",
              background: "#0f172a", color: "#e2e8f0", fontSize: "0.85rem", minWidth: 200,
            }}
          >
            <option value="">Select a game...</option>
            {gameOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          <button onClick={handleSaveFeatured} disabled={saving} style={{
            padding: "8px 16px", borderRadius: 6, border: "none",
            background: "#1e40af", color: "#fff", cursor: "pointer", fontSize: "0.85rem",
            opacity: saving ? 0.6 : 1,
          }}>Save</button>
        </div>
      </div>

      {/* Staff Picks */}
      <div style={{ ...sectionCard, marginBottom: 16 }}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 8px" }}>Staff Picks ({staffPicks.length}/6)</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {staffPicks.map((id) => {
            const g = gameOptions.find((go) => go.id === id);
            return (
              <span key={id} onClick={() => toggleStaffPick(id)} style={{
                padding: "4px 10px", borderRadius: 16, fontSize: "0.75rem",
                background: "#1e40af", color: "#fff", cursor: "pointer",
              }}>
                {g?.title || id} &times;
              </span>
            );
          })}
        </div>
        <select
          onChange={(e) => { if (e.target.value) toggleStaffPick(e.target.value); e.target.value = ""; }}
          style={{
            padding: "8px 12px", borderRadius: 6, border: "1px solid #334155",
            background: "#0f172a", color: "#e2e8f0", fontSize: "0.85rem", minWidth: 200, marginRight: 12,
          }}
        >
          <option value="">Add a game...</option>
          {gameOptions.filter((g) => !staffPicks.includes(g.id)).map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
        <button onClick={handleSaveStaffPicks} disabled={saving} style={{
          padding: "8px 16px", borderRadius: 6, border: "none",
          background: "#1e40af", color: "#fff", cursor: "pointer", fontSize: "0.85rem",
          opacity: saving ? 0.6 : 1,
        }}>Save Staff Picks</button>
      </div>

      {/* Meetup Toggle (super_admin only) */}
      {isSuperAdmin && (
        <div style={{ ...sectionCard, marginBottom: 16 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Meetup Mode</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={handleMeetupToggle} style={{
              padding: "8px 20px", borderRadius: 20, border: "none",
              background: meetupEnabled ? "#22c55e" : "#334155",
              color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
              transition: "background 0.2s",
            }}>
              {meetupEnabled ? "ON" : "OFF"}
            </button>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {meetupEnabled ? "Meetup mode is active" : "Meetup mode is disabled"}
            </span>
          </div>
        </div>
      )}

      {/* Clear Recently Played */}
      <div style={sectionCard}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Clear Recently Played</h3>
        <button onClick={handleClearRecent} style={{
          padding: "8px 16px", borderRadius: 6, border: "1px solid #334155",
          background: "#0f172a", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem",
        }}>Clear All Recently Played</button>
      </div>
    </div>
  );
}
