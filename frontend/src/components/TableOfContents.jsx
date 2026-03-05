/**
 * TableOfContents — scrollable numbered list of step titles.
 * Shown as "step -1" when first entering a teaching tab.
 *
 * @param {{ tabName: string, steps: Array<{title: string}>, onStepSelect: (index: number) => void }} props
 */
export default function TableOfContents({ tabName, steps, onStepSelect }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div style={{ animation: "fadeIn 0.25s ease-out", padding: "4px 0" }}>
      {/* Header */}
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: "1.15rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          textAlign: "center",
        }}
      >
        {tabName}
      </h3>

      {/* Step list */}
      <div
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => onStepSelect(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "14px 16px",
              border: "none",
              borderBottom: i < steps.length - 1 ? "1px solid var(--border)" : "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                minWidth: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1 }}>{step.title}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={() => onStepSelect(0)}
        style={{
          display: "block",
          width: "100%",
          marginTop: "16px",
          padding: "14px 20px",
          borderRadius: "12px",
          border: "none",
          background: "var(--accent, #e94560)",
          color: "#fff",
          fontSize: "1rem",
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        Start from beginning
      </button>
    </div>
  );
}
