import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLGSPricing, updateLGSPricing, fetchGames } from "../../services/api";

const card = {
  background: "#1e293b", borderRadius: 12, padding: 20,
  border: "1px solid #334155",
};

function InlinePriceEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value != null ? (value / 100).toFixed(2) : "");

  if (!editing) {
    return (
      <span
        onClick={() => { setVal(value != null ? (value / 100).toFixed(2) : ""); setEditing(true); }}
        style={{ cursor: "pointer", padding: "2px 8px", borderRadius: 4, background: "#0f172a", minWidth: 60, display: "inline-block", textAlign: "center" }}
        title="Click to edit"
      >
        {value != null ? `$${(value / 100).toFixed(2)}` : "Set price"}
      </span>
    );
  }

  const save = () => {
    const cents = Math.max(0, Math.round(parseFloat(val) * 100) || 0);
    onSave(cents);
    setEditing(false);
  };

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
      style={{
        width: 80, padding: "2px 6px", borderRadius: 4,
        border: "1px solid #3b82f6", background: "#0f172a", color: "#e2e8f0",
        fontSize: 13, textAlign: "center",
      }}
    />
  );
}

export default function LGSPricing() {
  const { lgsId } = useAuth();
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [addingGame, setAddingGame] = useState(null);

  const load = useCallback(() => {
    if (!lgsId) return;
    setLoading(true);
    fetchLGSPricing(lgsId)
      .then((d) => setPricing(d.pricing || []))
      .catch(() => setPricing([]))
      .finally(() => setLoading(false));
  }, [lgsId]);

  useEffect(() => { load(); }, [load]);

  const handlePriceUpdate = async (gameId, newPriceCents) => {
    const item = pricing.find((p) => p.game_id === gameId);
    try {
      await updateLGSPricing(lgsId, gameId, newPriceCents, item ? item.is_available : true);
      setPricing((prev) => prev.map((p) =>
        p.game_id === gameId ? { ...p, retail_price_cents: newPriceCents } : p
      ));
    } catch {}
  };

  const handleAvailableToggle = async (gameId) => {
    const item = pricing.find((p) => p.game_id === gameId);
    if (!item) return;
    try {
      await updateLGSPricing(lgsId, gameId, item.retail_price_cents, !item.is_available);
      setPricing((prev) => prev.map((p) =>
        p.game_id === gameId ? { ...p, is_available: !p.is_available } : p
      ));
    } catch {}
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setCatalogSearch("");
    try {
      const games = await fetchGames();
      setCatalog(Array.isArray(games) ? games : []);
    } catch {
      setCatalog([]);
    }
  };

  const handleAddGame = async (game) => {
    setAddingGame(game.game_id);
    try {
      await updateLGSPricing(lgsId, game.game_id, 0, true);
      setPricing((prev) => [...prev, {
        game_id: game.game_id,
        title: game.title || game.game_id,
        complexity: game.complexity || "",
        retail_price_cents: 0,
        is_available: true,
        updated_at: new Date().toISOString(),
      }]);
      setShowAddModal(false);
    } catch {} finally {
      setAddingGame(null);
    }
  };

  const pricedGameIds = new Set(pricing.map((p) => p.game_id));
  const filteredCatalog = catalog.filter((g) =>
    !pricedGameIds.has(g.game_id) &&
    (!catalogSearch || (g.title || "").toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  if (loading) return <p style={{ color: "#94a3b8", padding: 20 }}>Loading pricing...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Game Pricing</h2>
        <button
          onClick={openAddModal}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#1e40af", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Game Price
        </button>
      </div>

      <div style={{ ...card, overflow: "auto" }}>
        {pricing.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No prices set yet. Click "Add Game Price" to get started.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8" }}>Game</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8" }}>Complexity</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Retail Price</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Available</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map((p) => (
                <tr key={p.game_id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 12px", color: "#e2e8f0", fontWeight: 600 }}>{p.title}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{p.complexity || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <InlinePriceEditor value={p.retail_price_cents} onSave={(v) => handlePriceUpdate(p.game_id, v)} />
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleAvailableToggle(p.game_id)}
                      style={{
                        padding: "3px 10px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700,
                        cursor: "pointer",
                        background: p.is_available ? "#22c55e22" : "#ef444422",
                        color: p.is_available ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {p.is_available ? "Available" : "Unavailable"}
                    </button>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontSize: 12 }}>
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add game modal */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 5000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            ...card, width: "100%", maxWidth: 500, maxHeight: "70vh",
            display: "flex", flexDirection: "column",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>Add Game Price</h3>
            <input
              type="text"
              placeholder="Search games..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              autoFocus
              style={{
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
                fontSize: 14, marginBottom: 12,
              }}
            />
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredCatalog.slice(0, 50).map((g) => (
                <div
                  key={g.game_id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderBottom: "1px solid #1e293b",
                  }}
                >
                  <div>
                    <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{g.title || g.game_id}</span>
                    {g.complexity && <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{g.complexity}</span>}
                  </div>
                  <button
                    disabled={addingGame === g.game_id}
                    onClick={() => handleAddGame(g)}
                    style={{
                      padding: "4px 12px", borderRadius: 6, border: "none",
                      background: "#1e40af", color: "#fff", fontSize: 12, cursor: "pointer",
                      opacity: addingGame === g.game_id ? 0.5 : 1,
                    }}
                  >
                    {addingGame === g.game_id ? "..." : "Add"}
                  </button>
                </div>
              ))}
              {filteredCatalog.length === 0 && (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: 20, fontSize: 13 }}>
                  {catalogSearch ? "No matching games." : "All games already priced."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
