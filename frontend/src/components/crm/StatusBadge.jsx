const STATUS_COLORS = {
  prospect: { bg: "#6b7280", text: "#fff" },
  trial:    { bg: "#f59e0b", text: "#000" },
  active:   { bg: "#10b981", text: "#fff" },
  churned:  { bg: "#ef4444", text: "#fff" },
  paused:   { bg: "#6b7280", text: "#fff" },
};

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.prospect;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "12px",
      fontSize: "0.75rem",
      fontWeight: 600,
      background: colors.bg,
      color: colors.text,
      textTransform: "capitalize",
    }}>
      {status || "prospect"}
    </span>
  );
}
