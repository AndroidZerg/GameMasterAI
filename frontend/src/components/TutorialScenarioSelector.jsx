/**
 * TutorialScenarioSelector — row of buttons to choose tutorial scenario.
 */
export default function TutorialScenarioSelector({ scenarios, activeIndex, onSelect }) {
  if (!scenarios || scenarios.length === 0) return null;

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          marginBottom: "6px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Choose a tutorial
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {scenarios.map((s, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(i)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: isActive ? "2px solid var(--accent)" : "2px solid var(--border)",
                background: isActive ? "var(--accent)" : "var(--bg-primary)",
                color: "#fff",
                fontWeight: isActive ? 700 : 400,
                fontSize: "0.85rem",
                cursor: "pointer",
                textAlign: "left",
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontWeight: 700 }}>{s.id}:</span>{" "}
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>
      {/* Active scenario description */}
      {scenarios[activeIndex]?.description && (
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            marginTop: "6px",
            fontStyle: "italic",
          }}
        >
          {scenarios[activeIndex].description}
          {scenarios[activeIndex].player_count && (
            <span> ({scenarios[activeIndex].player_count} players)</span>
          )}
        </div>
      )}
    </div>
  );
}
