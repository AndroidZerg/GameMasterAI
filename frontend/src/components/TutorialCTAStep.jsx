/**
 * TutorialCTAStep — celebratory final step with navigation CTAs.
 * Rendered instead of WalkthroughStep/SummaryStep when step has `cta: true`.
 */
export default function TutorialCTAStep({ step, onNavigateTab, mode }) {
  if (!step) return null;

  const isSummary = mode === "summary";

  return (
    <div style={{ animation: "fadeIn 0.25s ease-out", padding: "4px 0" }}>
      {/* Congrats header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          padding: "20px 16px",
          background: "linear-gradient(135deg, rgba(233,69,96,0.12) 0%, rgba(165,180,252,0.12) 100%)",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
          {"\uD83C\uDF89"}
        </div>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {step.title}
        </h3>
        {isSummary && step.bullets ? (
          <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", listStyleType: "disc", textAlign: "left" }}>
            {step.bullets.map((b, i) => (
              <li key={i} style={{ marginBottom: "4px", lineHeight: 1.5, fontSize: "0.95rem", color: "var(--text-primary)" }}>{b}</li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--text-primary)",
            }}
          >
            {step.text}
          </p>
        )}
      </div>

      {/* CTA Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Strategy */}
        <button
          onClick={() => onNavigateTab("general_tips")}
          style={{
            ...ctaBase,
            background: "rgba(165,180,252,0.08)",
            border: "1px solid rgba(165,180,252,0.2)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>{"\uD83C\uDFAF"}</span>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Check Out General Tips
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Strategy basics for beginners
            </div>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{"\u203A"}</span>
        </button>

        {/* Appendix */}
        <button
          onClick={() => onNavigateTab("appendix")}
          style={{
            ...ctaBase,
            background: "rgba(165,180,252,0.08)",
            border: "1px solid rgba(165,180,252,0.2)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>{"\uD83D\uDCD6"}</span>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Reference the Appendix
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Quick-reference for powers and terms
            </div>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{"\u203A"}</span>
        </button>

        {/* Q&A — primary CTA, visually emphasized */}
        <button
          onClick={() => onNavigateTab("qa")}
          style={{
            ...ctaBase,
            background: "var(--accent, #e94560)",
            border: "2px solid var(--accent, #e94560)",
            padding: "16px",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>{"\uD83E\uDDD9\u200D\u2642\uFE0F"}</span>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#fff" }}>
              Ask Your Personal GM Guide
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>
              Tap Q&A for instant answers during play
            </div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "1rem" }}>{"\u203A"}</span>
        </button>
      </div>
    </div>
  );
}

const ctaBase = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "1rem",
};
