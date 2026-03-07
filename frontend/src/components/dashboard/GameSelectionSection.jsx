import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE, fetchGameSelection, activateGame, deactivateGame } from "../../services/api";
import TierManagementCard from "./TierManagementCard";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const card = {
  background: "#1e293b",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #334155",
};

export default function GameSelectionSection() {
  const { venueId, token } = useAuth();

  // Seat / subscription state
  const [seatInfo, setSeatInfo] = useState(null);
  const [activeGames, setActiveGames] = useState([]);

  // Full catalog
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [complexityFilter, setComplexityFilter] = useState("");

  // Action state
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  // Subscription status (for TierManagementCard)
  const [subStatus, setSubStatus] = useState(null);

  const loadSeatInfo = useCallback(async () => {
    if (!venueId || !token) return;
    try {
      const data = await fetchGameSelection(venueId);
      setSeatInfo({ tier: data.tier, seat_limit: data.seat_limit, seats_used: data.seats_used, seats_remaining: data.seats_remaining });
      setActiveGames(data.active_games || []);
    } catch {}
  }, [venueId, token]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/games`, { headers: getAuthHeaders() });
      const data = await res.json();
      setCatalog(Array.isArray(data) ? data : []);
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadSubStatus = useCallback(async () => {
    if (!venueId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/subscription-status`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setSubStatus(await res.json());
    } catch {}
  }, [venueId, token]);

  useEffect(() => { loadSeatInfo(); }, [loadSeatInfo]);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { loadSubStatus(); }, [loadSubStatus]);

  const activeGameIds = new Set(activeGames.map((g) => g.game_id));
  const seatLimit = seatInfo?.seat_limit ?? 10;
  const seatsUsed = seatInfo?.seats_used ?? 0;
  const seatsRemaining = seatLimit === -1 ? Infinity : Math.max(0, seatLimit - seatsUsed);
  const seatPct = seatLimit === -1 ? 0 : (seatsUsed / seatLimit) * 100;
  const barColor = seatPct >= 100 ? "#ef4444" : seatPct >= 80 ? "#f59e0b" : "#22c55e";

  const handleActivate = async (gameId) => {
    setActionLoading(gameId);
    setError("");
    try {
      const result = await activateGame(venueId, gameId);
      // Optimistic: add to active list
      const gameInCatalog = catalog.find((g) => g.game_id === gameId);
      setActiveGames((prev) => [...prev, {
        game_id: gameId,
        title: result.title || gameInCatalog?.title || gameId,
        activated_at: new Date().toISOString(),
        complexity: gameInCatalog?.complexity || "",
      }]);
      setSeatInfo((prev) => prev ? {
        ...prev,
        seats_used: result.seats_used,
        seats_remaining: result.seats_remaining,
      } : prev);
    } catch (err) {
      const msg = err.message || "Failed to activate";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (gameId) => {
    setActionLoading(gameId);
    setError("");
    try {
      const result = await deactivateGame(venueId, gameId);
      setActiveGames((prev) => prev.filter((g) => g.game_id !== gameId));
      setSeatInfo((prev) => prev ? {
        ...prev,
        seats_used: result.seats_used,
        seats_remaining: result.seats_remaining,
      } : prev);
    } catch (err) {
      setError(err.message || "Failed to deactivate");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter catalog
  const complexities = [...new Set(catalog.map((g) => g.complexity).filter(Boolean))].sort();
  const filtered = catalog.filter((g) => {
    if (search && !(g.title || "").toLowerCase().includes(search.toLowerCase()) && !(g.game_id || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (complexityFilter && g.complexity !== complexityFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Tier card */}
      <TierManagementCard
        venueId={venueId}
        tier={seatInfo?.tier || subStatus?.tier || "starter"}
        seatLimit={seatLimit}
        seatsUsed={seatsUsed}
        subscriptionStatus={subStatus?.subscription_status}
      />

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#ef444422", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* LEFT: Game Catalog */}
        <div style={{ flex: "1 1 400px", minWidth: 300 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>Game Catalog</h3>

          {/* Search + filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8,
                border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontSize: 14,
              }}
            />
            <select
              value={complexityFilter}
              onChange={(e) => setComplexityFilter(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, border: "1px solid #334155",
                background: "#0f172a", color: "#e2e8f0", fontSize: 14,
              }}
            >
              <option value="">All Complexity</option>
              {complexities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <p style={{ color: "#94a3b8", margin: "0 0 8px", fontSize: 13 }}>
            {filtered.length} game{filtered.length !== 1 ? "s" : ""} in catalog
          </p>

          {catalogLoading ? (
            <p style={{ color: "#94a3b8", padding: 20 }}>Loading catalog...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
              {filtered.map((g) => {
                const isActive = activeGameIds.has(g.game_id);
                const canActivate = !isActive && seatsRemaining > 0;
                const isLoading = actionLoading === g.game_id;

                return (
                  <div key={g.game_id} style={{ ...card, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.title || g.game_id}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {g.complexity && (
                        <span style={{ fontSize: 11, color: "#94a3b8", background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>
                          {g.complexity}
                        </span>
                      )}
                      {g.player_count && (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {g.player_count.min}-{g.player_count.max}p
                        </span>
                      )}
                    </div>
                    {isActive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", background: "#22c55e18", padding: "3px 8px", borderRadius: 6, textAlign: "center" }}>
                        Active
                      </span>
                    ) : (
                      <button
                        disabled={!canActivate || isLoading}
                        onClick={() => handleActivate(g.game_id)}
                        title={!canActivate && !isActive ? "Seat limit reached \u2014 deactivate a game or upgrade" : ""}
                        style={{
                          padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600,
                          cursor: canActivate && !isLoading ? "pointer" : "not-allowed",
                          background: canActivate ? "#1e40af" : "#334155",
                          color: canActivate ? "#fff" : "#64748b",
                          opacity: isLoading ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {isLoading ? "..." : "Activate"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Active Games */}
        <div style={{ flex: "0 0 320px", minWidth: 280 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>Active Games</h3>

          {/* Seat usage bar */}
          <div style={{ ...card, marginBottom: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                {seatsUsed} / {seatLimit === -1 ? "\u221E" : seatLimit} games active
              </span>
              {seatLimit !== -1 && (
                <span style={{ color: barColor, fontWeight: 600 }}>{Math.round(seatPct)}%</span>
              )}
            </div>
            {seatLimit !== -1 && (
              <div style={{ height: 8, borderRadius: 4, background: "#0f172a", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, seatPct)}%`, background: barColor, borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            )}
            {seatPct >= 80 && seatLimit !== -1 && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f59e0b" }}>
                Running low on seats. Consider upgrading your plan.
              </p>
            )}
          </div>

          {/* Active games list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
            {activeGames.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: 20, fontSize: 13 }}>
                No games activated yet. Browse the catalog to add games.
              </p>
            ) : (
              activeGames.map((g) => (
                <div key={g.game_id} style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.title || g.game_id}
                    </div>
                    {g.complexity && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{g.complexity}</span>
                    )}
                  </div>
                  <button
                    disabled={actionLoading === g.game_id}
                    onClick={() => handleDeactivate(g.game_id)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid #ef444444",
                      background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600,
                      cursor: actionLoading === g.game_id ? "wait" : "pointer",
                      opacity: actionLoading === g.game_id ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {actionLoading === g.game_id ? "..." : "Deactivate"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
