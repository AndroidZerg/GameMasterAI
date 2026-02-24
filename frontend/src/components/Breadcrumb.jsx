export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: "12px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: "0 6px" }}>&gt;</span>}
          <span style={{ color: i === items.length - 1 ? "var(--text-primary)" : "var(--text-secondary)" }}>
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
