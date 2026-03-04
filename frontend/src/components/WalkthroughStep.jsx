import { useState } from "react";
import { API_BASE } from "../services/api";

/**
 * WalkthroughStep — renders a single walkthrough step with
 * step number, title, narrative text, and optional photo.
 */
export default function WalkthroughStep({ step, gameId }) {
  const [imgError, setImgError] = useState(false);

  if (!step) {
    return (
      <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
        No walkthrough content available.
      </div>
    );
  }

  return (
    <div
      style={{
        animation: "fadeIn 0.2s ease-out",
        padding: "4px 0",
      }}
    >
      {/* Step badge + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--accent, #e94560)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            flexShrink: 0,
          }}
        >
          {step.step}
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {step.title}
        </h3>
      </div>

      {/* Step image */}
      {step.image && !imgError && (
        <div style={{ marginBottom: "12px" }}>
          <img
            src={`${API_BASE}/api/images/${gameId}/${step.image}`}
            alt={step.image_caption || step.title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              maxWidth: "500px",
              borderRadius: "10px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              display: "block",
            }}
          />
          {step.image_caption && (
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginTop: "6px",
                fontStyle: "italic",
              }}
            >
              {step.image_caption}
            </p>
          )}
        </div>
      )}

      {/* Step text — conversational tone */}
      <p
        style={{
          fontSize: "1.1rem",
          lineHeight: 1.7,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {step.text}
      </p>
    </div>
  );
}
