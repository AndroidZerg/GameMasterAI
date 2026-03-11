import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGames, fetchVenueCollection, saveVenueCollection, fetchAllVenues } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import Breadcrumb from "./Breadcrumb";

export default function CollectionManagerPage() {
  const navigate = useNavigate();
  const { role, venueId: myVenueId } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const [allGames, setAllGames] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Venue selector state (super_admin only)
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");

  // Load venues list for super_admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAllVenues()
      .then((list) => {
        setVenues(list);
        // Default to own venue
        if (myVenueId) setSelectedVenueId(myVenueId);
      })
      .catch(() => {});
  }, [isSuperAdmin, myVenueId]);

  // The venue_id to operate on
  const targetVenueId = isSuperAdmin ? selectedVenueId : myVenueId;

  const loadCollection = useCallback(async (games) => {
    const gameList = games || allGames;
    try {
      const collection = await fetchVenueCollection(isSuperAdmin ? targetVenueId : undefined);
      if (collection.game_ids && collection.game_ids.length > 0) {
        setSelected(new Set(collection.game_ids));
      } else {
        // No collection yet — select all by default
        setSelected(new Set(gameList.map((g) => g.game_id)));
      }
    } catch {
      setSelected(new Set(gameList.map((g) => g.game_id)));
    }
  }, [allGames, isSuperAdmin, targetVenueId]);

  // Load games + collection on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const games = await fetchGames();
        setAllGames(games);
        await loadCollection(games);
      } catch {
        try {
          const cached = JSON.parse(localStorage.getItem("gmai_games_cache") || "[]");
          setAllGames(cached);
          setSelected(new Set(cached.map((g) => g.game_id)));
        } catch {}
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload collection when venue selector changes
  useEffect(() => {
    if (!isSuperAdmin || !targetVenueId || allGames.length === 0) return;
    loadCollection(allGames);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetVenueId]);

  const toggleGame = (gameId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allGames.map((g) => g.game_id)));
  const deselectAll = () => setSelected(new Set());

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveVenueCollection([...selected], isSuperAdmin ? targetVenueId : undefined);
      const venueName = venues.find((v) => v.venue_id === targetVenueId)?.venue_name;
      setToast(venueName ? `Collection saved for ${venueName}!` : "Collection saved!");
    } catch {
      try {
        localStorage.setItem("gmai_venue_collection", JSON.stringify([...selected]));
      } catch {}
      setToast("Saved locally (API unavailable)");
    }
    setSaving(false);
    setTimeout(() => setToast(""), 3000);
  };

  const filtered = search
    ? allGames.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))
    : allGames;

  const COMPLEXITY_COLORS = {
    party: "#a855f7",
    gateway: "#22c55e",
    midweight: "#3b82f6",
    heavy: "#ef4444",
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 20px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: "64px", borderRadius: "10px", background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "900px", margin: "0 auto" }}>
      <Breadcrumb items={[{ label: "Admin" }, { label: "Game Collection" }]} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <h1 style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: 0 }}>Game Collection</h1>
        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          {selected.size} of {allGames.length} games selected
        </span>
      </div>

      {/* Venue selector — super_admin only */}
      {isSuperAdmin && venues.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
            Editing collection for:
          </label>
          <select
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "var(--bg-primary)",
              color: "var(--text-primary)", fontSize: "1rem",
            }}
          >
            <option value="">— Select venue —</option>
            {venues.map((v) => (
              <option key={v.venue_id} value={v.venue_id}>
                {v.venue_name} {v.role && v.role !== "venue_admin" ? `(${v.role})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ background: "var(--accent)", color: "#fff", padding: "10px 16px", borderRadius: "10px", marginBottom: "16px", textAlign: "center", fontSize: "0.9rem", animation: "fadeIn 0.2s ease-out" }}>
          {toast}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search games"
          style={{
            flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "10px",
            border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "1rem", outline: "none",
          }}
        />
        <button onClick={selectAll} style={{ padding: "8px 16px", borderRadius: "10px", background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "0.85rem", cursor: "pointer" }}>
          Select All
        </button>
        <button onClick={deselectAll} style={{ padding: "8px 16px", borderRadius: "10px", background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontSize: "0.85rem", cursor: "pointer" }}>
          Clear
        </button>
      </div>

      {/* Game grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "24px" }}>
        {filtered.map((game) => {
          const checked = selected.has(game.game_id);
          return (
            <button
              key={game.game_id}
              onClick={() => toggleGame(game.game_id)}
              aria-label={`${checked ? "Remove" : "Add"} ${game.title}`}
              aria-pressed={checked}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: checked ? "var(--bg-card)" : "var(--bg-primary)",
                border: checked ? "2px solid var(--accent)" : "2px solid var(--border)",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.9rem",
                transition: "border-color 0.15s",
                minHeight: "52px",
              }}
            >
              <span style={{
                width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                background: checked ? "var(--accent)" : "transparent",
                border: checked ? "2px solid var(--accent)" : "2px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "0.7rem", fontWeight: 700,
              }}>
                {checked ? "✓" : ""}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.title}</div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                  <span style={{
                    background: COMPLEXITY_COLORS[game.complexity] || "#666",
                    color: "#fff", padding: "0 6px", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                  }}>
                    {game.complexity}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                    {game.player_count?.min}-{game.player_count?.max}p
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving || (isSuperAdmin && !selectedVenueId)}
        style={{
          width: "100%", padding: "14px", borderRadius: "12px",
          background: (saving || (isSuperAdmin && !selectedVenueId)) ? "var(--border)" : "var(--accent)",
          color: "#fff", border: "none", fontSize: "1.05rem", fontWeight: 700,
          cursor: (saving || (isSuperAdmin && !selectedVenueId)) ? "not-allowed" : "pointer",
        }}>
        {saving ? "Saving..." : `Save Collection (${selected.size} games)`}
      </button>
    </div>
  );
}
