import { useState } from "react";
import { subscribeVenue } from "../../services/api";

const TIERS = [
  { key: "starter", label: "Starter", seats: 10, price: "$149/mo" },
  { key: "standard", label: "Standard", seats: 25, price: "$299/mo" },
  { key: "premium", label: "Premium", seats: "Unlimited", price: "$499/mo" },
];

const tierColors = { starter: "#3b82f6", standard: "#8b5cf6", premium: "#f59e0b" };

export default function TierManagementCard({ venueId, tier, seatLimit, seatsUsed, subscriptionStatus }) {
  const [changingTier, setChangingTier] = useState(null);
  const [error, setError] = useState("");

  const currentTier = TIERS.find((t) => t.key === tier) || TIERS[0];
  const seatsRemaining = seatLimit === -1 ? "Unlimited" : Math.max(0, seatLimit - seatsUsed);

  const handleChangeTier = async (newTier) => {
    if (newTier === tier) return;
    setChangingTier(newTier);
    setError("");
    try {
      const result = await subscribeVenue(venueId, newTier);
      if (result.checkout_url) {
        window.open(result.checkout_url, "_blank");
      } else if (result.upgraded) {
        window.location.reload();
      }
    } catch (err) {
      const detail = err.message || "Failed to change tier";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setChangingTier(null);
    }
  };

  return (
    <div style={{
      background: "#1e293b", borderRadius: 12, padding: 20,
      border: "1px solid #334155", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Subscription</h3>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: tierColors[tier] || "#3b82f6", color: "#fff",
        }}>
          {currentTier.label}
        </span>
        {subscriptionStatus && (
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            background: subscriptionStatus === "active" ? "#16a34a22" : "#f59e0b22",
            color: subscriptionStatus === "active" ? "#22c55e" : "#f59e0b",
            border: `1px solid ${subscriptionStatus === "active" ? "#22c55e33" : "#f59e0b33"}`,
          }}>
            {subscriptionStatus}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Games Active</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{seatsUsed} / {seatLimit === -1 ? "\u221E" : seatLimit}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Remaining</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: seatsRemaining === 0 ? "#ef4444" : "#22c55e" }}>
            {seatsRemaining === "Unlimited" ? "\u221E" : seatsRemaining}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Monthly</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{currentTier.price}</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "#ef444422", color: "#fca5a5", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TIERS.map((t) => (
          <button
            key={t.key}
            disabled={t.key === tier || changingTier !== null}
            onClick={() => handleChangeTier(t.key)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #334155",
              background: t.key === tier ? tierColors[t.key] : "#0f172a",
              color: t.key === tier ? "#fff" : "#94a3b8",
              cursor: t.key === tier || changingTier ? "default" : "pointer",
              fontSize: 13, fontWeight: 600, opacity: changingTier && changingTier !== t.key ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {changingTier === t.key ? "Processing..." : `${t.label} (${t.seats === "Unlimited" ? "\u221E" : t.seats} games) \u2014 ${t.price}`}
          </button>
        ))}
      </div>
    </div>
  );
}
