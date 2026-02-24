import { useState } from "react";

import { API_BASE } from "../services/api";

const REACTIONS = [
  { emoji: "😐", label: "Meh" },
  { emoji: "🙂", label: "Okay" },
  { emoji: "😊", label: "Fun" },
  { emoji: "😍", label: "Loved it" },
  { emoji: "🤯", label: "Mind-blown" },
];

export default function GameRating({ gameId, gameTitle }) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reaction, setReaction] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [comment, setComment] = useState("");

  const storageKey = `gmai_rating_${gameId}`;

  // Check if already rated this session
  const alreadyRated = (() => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  })();

  const handleSubmit = async () => {
    if (rating === 0) return;
    const payload = {
      game_id: gameId,
      game_title: gameTitle,
      rating,
      reaction: reaction ? REACTIONS[reaction - 1]?.label : null,
      comment: comment.trim() || null,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}

    try { localStorage.setItem(storageKey, String(rating)); } catch {}
    setSubmitted(true);
  };

  if (alreadyRated && !submitted) {
    return (
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px",
        padding: "16px", border: "1px solid var(--border)",
        textAlign: "center", marginTop: "16px",
      }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          You rated this game {"⭐".repeat(parseInt(alreadyRated))} — thanks!
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        background: "#0f2a0f", borderRadius: "12px",
        padding: "20px", border: "2px solid #22c55e",
        textAlign: "center", marginTop: "16px",
        animation: "fadeIn 0.3s ease-out",
      }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>🎉</div>
        <p style={{ color: "#22c55e", fontWeight: 700 }}>Thanks for rating {gameTitle}!</p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Your feedback helps other players.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-secondary)", borderRadius: "12px",
      padding: "20px", border: "1px solid var(--border)",
      marginTop: "16px",
    }}>
      <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "12px", textAlign: "center" }}>
        How was {gameTitle}?
      </h3>

      {/* Star rating */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "2rem", padding: "4px",
              transform: (hoveredStar >= star || rating >= star) ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.15s",
              filter: (hoveredStar >= star || rating >= star)
                ? "none" : "grayscale(1) opacity(0.4)",
            }}
          >
            ⭐
          </button>
        ))}
      </div>

      {/* Star label */}
      {rating > 0 && (
        <p style={{ textAlign: "center", color: "var(--accent)", fontSize: "0.9rem", fontWeight: 600, marginBottom: "12px" }}>
          {rating === 1 && "Not for me"}
          {rating === 2 && "It was okay"}
          {rating === 3 && "Pretty good"}
          {rating === 4 && "Really fun!"}
          {rating === 5 && "Absolutely loved it!"}
        </p>
      )}

      {/* Reaction buttons */}
      {rating > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {REACTIONS.map((r, i) => (
            <button
              key={i}
              onClick={() => setReaction(reaction === i + 1 ? null : i + 1)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 12px", borderRadius: "10px",
                background: reaction === i + 1 ? "var(--accent)" : "var(--bg-card)",
                color: reaction === i + 1 ? "#fff" : "var(--text-secondary)",
                border: reaction === i + 1 ? "2px solid var(--accent)" : "1px solid var(--border)",
                cursor: "pointer", fontSize: "1.3rem", gap: "2px",
                transition: "all 0.15s",
              }}
            >
              <span>{r.emoji}</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>{r.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Optional comment */}
      {rating > 0 && (
        <textarea
          placeholder="Any thoughts? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={200}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: "10px",
            border: "1px solid var(--border)", background: "var(--bg-primary)",
            color: "var(--text-primary)", fontSize: "0.9rem", outline: "none",
            resize: "vertical", minHeight: "60px", marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Submit */}
      {rating > 0 && (
        <button
          onClick={handleSubmit}
          style={{
            display: "block", width: "100%", padding: "12px",
            borderRadius: "12px", background: "var(--accent)",
            color: "#fff", border: "none", fontWeight: 700,
            fontSize: "1rem", cursor: "pointer",
          }}
        >
          Submit Rating
        </button>
      )}
    </div>
  );
}
