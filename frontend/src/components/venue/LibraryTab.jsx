import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../../services/api";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const card = {
  background: "var(--bg-card, #1e2a45)",
  borderRadius: "12px",
  padding: "16px",
  border: "1px solid var(--border, #2a3a5c)",
};

function Toggle({ label, active, color, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        border: "none",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? (color || "var(--accent, #e94560)") : "var(--bg-secondary, #16213e)",
        color: active ? "#fff" : "var(--text-secondary, #a0a0a0)",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function LibraryTab() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [complexityFilter, setComplexityFilter] = useState("");

  const loadGames = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/venue/library`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setGames(Array.isArray(d) ? d : []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  const toggleFlag = async (gameId, flag, currentValue) => {
    try {
      await fetch(`${API_BASE}/api/v1/venue/library/${encodeURIComponent(gameId)}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: !currentValue }),
      });
      setGames((prev) =>
        prev.map((g) => (g.game_id === gameId ? { ...g, [flag]: !currentValue } : g))
      );
    } catch {}
  };

  const filtered = games.filter((g) => {
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) && !g.game_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (complexityFilter && g.complexity !== complexityFilter) return false;
    return true;
  });

  const complexities = [...new Set(games.map((g) => g.complexity).filter(Boolean))].sort();

  if (loading) return <p style={{ color: "#a0a0a0", padding: 20 }}>Loading library...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #2a3a5c)",
            background: "var(--bg-card, #1e2a45)",
            color: "var(--text-primary, #e0e0e0)",
            fontSize: 14,
          }}
        />
        <select
          value={complexityFilter}
          onChange={(e) => setComplexityFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #2a3a5c)",
            background: "var(--bg-card, #1e2a45)",
            color: "var(--text-primary, #e0e0e0)",
            fontSize: 14,
          }}
        >
          <option value="">All Complexity</option>
          {complexities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p style={{ color: "var(--text-secondary, #a0a0a0)", margin: 0, fontSize: 13 }}>
        {filtered.length} game{filtered.length !== 1 ? "s" : ""} in library
      </p>

      {/* Game grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {filtered.map((g) => (
          <div key={g.game_id} style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary, #e0e0e0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {g.title}
            </div>
            {g.complexity && (
              <span style={{ fontSize: 11, color: "var(--text-secondary, #a0a0a0)" }}>
                {g.complexity}
              </span>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Toggle label="Active" active={g.is_active} color="#2ecc71" onToggle={() => toggleFlag(g.game_id, "is_active", g.is_active)} />
              <Toggle label="Featured" active={g.is_featured} color="#3498db" onToggle={() => toggleFlag(g.game_id, "is_featured", g.is_featured)} />
              <Toggle label="Priority" active={g.is_priority} color="#e94560" onToggle={() => toggleFlag(g.game_id, "is_priority", g.is_priority)} />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--text-secondary, #a0a0a0)", textAlign: "center", padding: 40 }}>
          {search || complexityFilter ? "No games match your filter." : "No games in your library yet."}
        </p>
      )}
    </div>
  );
}
