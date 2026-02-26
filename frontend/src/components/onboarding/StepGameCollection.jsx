import { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../../services/api";

const COMPLEXITY_COLORS = {
  party: "#2ecc71", gateway: "#3498db", midweight: "#e67e22", heavy: "#e74c3c",
};

export default function StepGameCollection({ savedGames, onSave }) {
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const [owned, setOwned] = useState(new Set(savedGames?.owned_game_ids || []));
  const [priority, setPriority] = useState(new Set(savedGames?.priority_game_ids || []));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gmai_token");
    fetch(`${API_BASE}/api/v1/onboarding/games`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setCatalog(Array.isArray(data) ? data : data.games || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(g => g.title.toLowerCase().includes(q));
  }, [catalog, search]);

  const toggleOwned = (id) => {
    const next = new Set(owned);
    if (next.has(id)) {
      next.delete(id);
      const nextP = new Set(priority);
      nextP.delete(id);
      setPriority(nextP);
    } else {
      next.add(id);
    }
    setOwned(next);
  };

  const togglePriority = (id) => {
    if (!owned.has(id)) return;
    const next = new Set(priority);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 20) return;
      next.add(id);
    }
    setPriority(next);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      owned_game_ids: [...owned],
      priority_game_ids: [...priority],
    });
    setSaving(false);
  };

  if (loading) return <div style={{ color: "#8899aa", textAlign: "center", padding: 40 }}>Loading game catalog...</div>;

  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>Your Game Collection</h2>
      <p style={{ color: "#8899aa", marginBottom: 16, fontSize: 14 }}>
        Check games you own, then mark up to 20 as priority games.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search games..."
          style={{
            flex: 1, minWidth: 200, padding: "10px 12px", background: "#1a2332",
            border: "1px solid #2a3a4a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none",
          }}
        />
        <div style={{ color: "#8899aa", fontSize: 13 }}>
          {owned.size} owned | <span style={{ color: priority.size >= 20 ? "#e94560" : "#3498db" }}>{priority.size} / 20 priority</span>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 10, maxHeight: 500, overflowY: "auto", padding: 4,
        marginBottom: 20,
      }}>
        {filtered.map(game => {
          const isOwned = owned.has(game.id);
          const isPriority = priority.has(game.id);
          return (
            <div
              key={game.id}
              style={{
                background: isOwned ? (isPriority ? "#1a2940" : "#152030") : "#1a2332",
                border: `2px solid ${isPriority ? "#e94560" : isOwned ? "#3498db" : "#2a3a4a"}`,
                borderRadius: 10, padding: 12, cursor: "pointer", position: "relative",
                transition: "border-color 0.2s",
              }}
            >
              <div onClick={() => toggleOwned(game.id)} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <input type="checkbox" checked={isOwned} onChange={() => {}} style={{ accentColor: "#3498db" }} />
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{game.title}</span>
                </div>
                {game.complexity && (
                  <span style={{
                    display: "inline-block", fontSize: 11, padding: "2px 8px",
                    borderRadius: 10, background: COMPLEXITY_COLORS[game.complexity] || "#666",
                    color: "#fff", textTransform: "capitalize",
                  }}>
                    {game.complexity}
                  </span>
                )}
              </div>
              {isOwned && (
                <button
                  onClick={(e) => { e.stopPropagation(); togglePriority(game.id); }}
                  style={{
                    width: "100%", padding: "4px 0", fontSize: 11, fontWeight: 600,
                    border: `1px solid ${isPriority ? "#e94560" : "#444"}`,
                    background: isPriority ? "#e94560" : "transparent",
                    color: isPriority ? "#fff" : "#888",
                    borderRadius: 6, cursor: priority.size >= 20 && !isPriority ? "not-allowed" : "pointer",
                  }}
                >
                  {isPriority ? "Priority" : "Set Priority"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving || owned.size === 0} style={{
        width: "100%", padding: "14px", background: "#e94560",
        color: "#fff", border: "none", borderRadius: 8, fontSize: 16,
        fontWeight: 600, cursor: saving ? "wait" : "pointer",
        opacity: saving || owned.size === 0 ? 0.5 : 1,
      }}>
        {saving ? "Saving..." : `Save ${owned.size} Games & Continue`}
      </button>
    </div>
  );
}
