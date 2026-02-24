export default function IdlePrompt({ onDismiss }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: "var(--bg-card, #1e2a45)",
          border: "2px solid var(--accent, #e94560)",
          borderRadius: "16px",
          padding: "40px",
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "12px", color: "var(--text-primary, #e0e0e0)" }}>
          Still playing?
        </h2>
        <p style={{ color: "var(--text-secondary, #a0a0a0)", marginBottom: "20px" }}>
          Tap anywhere to continue, or you'll be returned to the game selector.
        </p>
        <button
          onClick={onDismiss}
          style={{
            padding: "12px 32px",
            fontSize: "1.1rem",
            borderRadius: "12px",
            background: "var(--accent, #e94560)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          I'm still here!
        </button>
      </div>
    </div>
  );
}
