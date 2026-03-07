import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLGSTransactions } from "../../services/api";

const card = {
  background: "#1e293b", borderRadius: 12, padding: 20,
  border: "1px solid #334155",
};

const typeColors = {
  subscription_split: { bg: "#8b5cf622", color: "#a78bfa", label: "Subscription" },
  game_sale_payout: { bg: "#22c55e22", color: "#22c55e", label: "Game Sale" },
};

const statusColors = {
  completed: "#22c55e",
  pending: "#f59e0b",
  failed: "#ef4444",
};

export default function LGSTransactions() {
  const { lgsId } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [totals, setTotals] = useState({ total_cents: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  // Default to current month
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(() => {
    if (!lgsId) return;
    setLoading(true);
    fetchLGSTransactions(lgsId, period, typeFilter)
      .then((d) => {
        setTransfers(d.transfers || []);
        setTotals(d.totals || { total_cents: 0, count: 0 });
      })
      .catch(() => { setTransfers([]); setTotals({ total_cents: 0, count: 0 }); })
      .finally(() => setLoading(false));
  }, [lgsId, period, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Transactions</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #334155",
            background: "#0f172a", color: "#e2e8f0", fontSize: 13,
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #334155",
            background: "#0f172a", color: "#e2e8f0", fontSize: 13,
          }}
        >
          <option value="all">All Types</option>
          <option value="subscription_split">Subscription</option>
          <option value="game_sale_payout">Game Sales</option>
        </select>
      </div>

      {/* Totals */}
      <div style={{ ...card, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Period Total</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>
            ${(totals.total_cents / 100).toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Transactions</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>{totals.count}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "auto" }}>
        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading transactions...</p>
        ) : transfers.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No transactions for this period.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8" }}>Date</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8" }}>Type</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8" }}>Description</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>Amount</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const tc = typeColors[t.type] || { bg: "#33415522", color: "#94a3b8", label: t.type };
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: tc.bg, color: tc.color,
                      }}>
                        {tc.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#e2e8f0" }}>{t.source_description}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#22c55e", fontWeight: 600 }}>
                      ${(t.amount_cents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                        color: statusColors[t.status] || "#94a3b8",
                      }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
