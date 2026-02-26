export default function TrialAlertBanner({ venues }) {
  const expiring = (venues || []).filter(
    v => v.trial_days_remaining !== null && v.trial_days_remaining <= 7
  );

  if (expiring.length === 0) return null;

  const critical = expiring.some(v => v.trial_days_remaining <= 2);
  const bgColor = critical ? "#dc2626" : "#d97706";

  return (
    <div style={{
      background: bgColor, color: "#fff", padding: "10px 16px",
      borderRadius: "8px", marginBottom: "16px", fontSize: "0.9rem",
    }}>
      <strong>Trial Expiring:</strong>{" "}
      {expiring.map((v, i) => (
        <span key={v.venue_id}>
          {i > 0 && ", "}
          {v.venue_name} ({v.trial_days_remaining} day{v.trial_days_remaining !== 1 ? "s" : ""})
        </span>
      ))}
    </div>
  );
}
