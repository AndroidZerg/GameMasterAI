import { useState } from "react";
import { API_BASE } from "../services/api";

/**
 * SummaryStep — renders a single summary step with
 * step number, title, bullet list, and optional image.
 */
export default function SummaryStep({ step, gameId }) {
  const [imgError, setImgError] = useState(false);

  if (!step) {
    return (
      <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
        No summary content available.
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
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "var(--accent, #e94560)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.8rem",
            flexShrink: 0,
          }}
        >
          {step.step}
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {step.title}
        </h3>
      </div>

      {/* Optional image (smaller in summary mode) */}
      {step.image && !imgError && (
        <div style={{ marginBottom: "10px" }}>
          <img
            src={`${API_BASE}/api/images/${gameId}/${step.image}`}
            alt={step.title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              maxWidth: "300px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Bullet list */}
      {step.bullets && step.bullets.length > 0 && (
        <ul
          style={{
            margin: "0 0 0 4px",
            paddingLeft: "20px",
            listStyleType: "disc",
          }}
        >
          {step.bullets.map((bullet, i) => (
            <li
              key={i}
              style={{
                marginBottom: "5px",
                lineHeight: 1.55,
                fontSize: "0.95rem",
                color: "var(--text-primary)",
              }}
            >
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
