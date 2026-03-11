import { useState, useEffect, useCallback } from "react";
import { sectionCard } from "./OverviewSection";
import {
  fetchMeetupToggle,
  setMeetupToggle,
  clearRecentlyPlayed,
} from "../../services/api";

export default function ConfigSection({ venueId, token, isSuperAdmin, refreshKey }) {
  const [meetupEnabled, setMeetupEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Load meetup toggle state
  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    fetchMeetupToggle()
      .then((data) => setMeetupEnabled(data?.enabled || false))
      .catch(() => {});
  }, [token, refreshKey, isSuperAdmin]);

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
        Game of the Day and Staff Picks have moved to{" "}
        <a href="/admin/customize" style={{ color: "#60a5fa" }}>Customize Home</a>.
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
