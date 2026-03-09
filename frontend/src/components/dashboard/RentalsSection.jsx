import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE, fetchGameFlags, updateGameFlag, importGameFlagsCSV } from "../../services/api";
import { MetricCard, HorizontalBars, sectionCard } from "./OverviewSection";

function useFetch(path, { venueId, token, refreshKey }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    fetch(`${API_BASE}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [path, venueId, token, refreshKey]);
  return data;
}

// ── Toggle switch component ──
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none",
        background: value ? "#22c55e" : "#334155",
        cursor: disabled ? "default" : "pointer",
        position: "relative", transition: "background 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 2,
        left: value ? 18 : 2,
        transition: "left 0.15s",
      }} />
    </button>
  );
}

// ── Game Flags Panel ──
function GameFlagsPanel({ venueId, token }) {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [updating, setUpdating] = useState(new Set());
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchGameFlags(venueId, search);
      setGames(data.games || []);
    } catch { setGames([]); }
    setLoading(false);
  }, [venueId, token, search]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (gameId, field, currentValue) => {
    const newVal = currentValue ? 0 : 1;
    setUpdating((prev) => new Set(prev).add(`${gameId}-${field}`));
    // Optimistic update
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, [field]: !currentValue } : g));
    try {
      await updateGameFlag(gameId, { [field]: newVal });
    } catch {
      // Rollback
      setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, [field]: currentValue } : g));
      setMsg("Failed to update flag");
      setTimeout(() => setMsg(""), 3000);
    }
    setUpdating((prev) => { const s = new Set(prev); s.delete(`${gameId}-${field}`); return s; });
  };

  const handleExport = () => {
    const params = new URLSearchParams({ venue_id: venueId || "shallweplay" });
    window.open(`${API_BASE}/api/v1/rentals/admin/game-flags/export?${params}`, "_blank");
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importGameFlagsCSV(file);
      setMsg(`Updated ${result.updated}, ${result.not_found} not found, ${result.skipped} skipped`);
      load();
    } catch (err) {
      setMsg("Import failed: " + (err.message || "unknown error"));
    }
    setTimeout(() => setMsg(""), 5000);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px", padding: "8px 12px", borderRadius: 8,
            border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
            fontSize: "0.85rem",
          }}
        />
        <button onClick={handleExport} style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid #334155",
          background: "#1e293b", color: "#94a3b8", fontSize: "0.8rem",
          fontWeight: 600, cursor: "pointer",
        }}>
          Export CSV
        </button>
        <label style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid #334155",
          background: "#1e293b", color: "#94a3b8", fontSize: "0.8rem",
          fontWeight: 600, cursor: "pointer",
        }}>
          Import CSV
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: "none" }} />
        </label>
      </div>

      {msg && (
        <div style={{
          padding: "8px 16px", borderRadius: 8, marginBottom: 12, fontSize: "0.85rem",
          background: msg.includes("Failed") || msg.includes("failed") ? "#7f1d1d" : "#14532d",
          color: msg.includes("Failed") || msg.includes("failed") ? "#fca5a5" : "#86efac",
        }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#475569" }}>Loading game flags...</div>
      ) : (
        <div style={{ ...sectionCard, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Game", "In-Store", "Take-Home", "For Sale", "Shopify Stock", "Wishlist"].map((h) => (
                  <th key={h} style={{ padding: "8px", textAlign: "left", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No games found</td></tr>
              )}
              {games.map((g) => (
                <tr key={g.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px", color: "#e2e8f0", fontWeight: 600, maxWidth: 250 }}>
                    <div>{g.game_title}</div>
                    {g.shopify_title && g.shopify_title !== g.game_title && (
                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>Shopify: {g.shopify_title}</div>
                    )}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <Toggle
                      value={g.rentable_instore}
                      onChange={() => handleToggle(g.id, "rentable_instore", g.rentable_instore)}
                      disabled={updating.has(`${g.id}-rentable_instore`)}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <Toggle
                      value={g.rentable_takehome}
                      onChange={() => handleToggle(g.id, "rentable_takehome", g.rentable_takehome)}
                      disabled={updating.has(`${g.id}-rentable_takehome`)}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <Toggle
                      value={g.for_sale}
                      onChange={() => handleToggle(g.id, "for_sale", g.for_sale)}
                      disabled={updating.has(`${g.id}-for_sale`)}
                    />
                  </td>
                  <td style={{ padding: "8px", color: g.shopify_available > 0 ? "#22c55e" : "#475569" }}>
                    {g.shopify_available || 0}
                  </td>
                  <td style={{ padding: "8px", color: g.wishlist_count > 0 ? "#ec4899" : "#475569" }}>
                    {g.wishlist_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px", color: "#64748b", fontSize: "0.75rem", borderTop: "1px solid #334155", marginTop: 4 }}>
            {games.length} games total
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Section ──
export default function RentalsSection({ venueId, startDate, endDate, token, refreshKey }) {
  const [subTab, setSubTab] = useState("subscribers");
  const fp = { venueId, token, refreshKey };
  const mrr = useFetch("/api/v1/crm/mrr", fp);

  const activeCount = mrr?.active_count || 0;
  const totalMrr = mrr?.total_mrr_dollars || 0;
  const gamesOut = mrr?.games_out || 0;
  const subscribers = mrr?.subscribers || [];
  const mostRented = mrr?.most_rented || [];

  const tabStyle = (active) => ({
    padding: "8px 20px", borderRadius: 8, border: "none",
    background: active ? "#22c55e" : "#1e293b",
    color: active ? "#fff" : "#94a3b8",
    fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
  });

  return (
    <div>
      {/* Sub-tab selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setSubTab("subscribers")} style={tabStyle(subTab === "subscribers")}>
          Subscribers
        </button>
        <button onClick={() => setSubTab("flags")} style={tabStyle(subTab === "flags")}>
          Game Catalog
        </button>
      </div>

      {subTab === "flags" ? (
        <GameFlagsPanel venueId={venueId} token={token} />
      ) : (
        <>
          {/* Revenue metrics */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <MetricCard label="Active Subscribers" value={activeCount} />
            <MetricCard label="Monthly Recurring Revenue" value={`$${totalMrr.toFixed(0)}`} />
            <MetricCard label="Games Currently Out" value={gamesOut} />
            <MetricCard label="Total Subscribers" value={subscribers.length} />
          </div>

          {/* Subscriber table + Most rented */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            {/* Subscriber table */}
            <div style={{ ...sectionCard, flex: "2 1 500px", minWidth: 350, overflowX: "auto" }}>
              <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Subscribers</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    {["Customer", "Contact", "Venue", "Current Game", "Since", "Status", "MRR"].map((h) => (
                      <th key={h} style={{ padding: "8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No subscribers yet</td></tr>
                  )}
                  {subscribers.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px", color: "#e2e8f0", fontWeight: 600 }}>{s.customer_name}</td>
                      <td style={{ padding: "8px", color: "#94a3b8", fontSize: "0.75rem" }}>{s.customer_contact}</td>
                      <td style={{ padding: "8px", color: "#94a3b8" }}>{s.venue_id}</td>
                      <td style={{ padding: "8px", color: s.current_game_id ? "#22c55e" : "#475569" }}>
                        {s.current_game_id || "\u2014"}
                      </td>
                      <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {s.created_at ? new Date(s.created_at + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600,
                          background: s.status === "active" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                          color: s.status === "active" ? "#22c55e" : "#ef4444",
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px", color: "#22c55e", fontWeight: 700 }}>
                        {s.status === "active" ? `$${(s.mrr_cents / 100).toFixed(0)}` : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeCount > 0 && (
                <div style={{
                  display: "flex", justifyContent: "flex-end", padding: "12px 8px 0",
                  borderTop: "1px solid #334155", marginTop: 8,
                }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#22c55e" }}>
                    Total MRR: ${totalMrr.toFixed(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Most rented games */}
            <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
              <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Most Rented Games</h3>
              <HorizontalBars
                items={mostRented.map((g) => ({ label: g.game_title, count: g.rental_count }))}
                color="#22c55e"
              />
              {mostRented.length === 0 && (
                <div style={{ fontSize: "0.85rem", color: "#475569", textAlign: "center", padding: 16 }}>
                  No rental history yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
