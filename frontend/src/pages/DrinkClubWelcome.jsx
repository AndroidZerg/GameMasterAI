import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE } from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

export default function DrinkClubWelcome() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Welcome to Drink Club!";
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }
    // Look up session via backend (the checkout webhook should have created the subscriber)
    // For now, show a generic welcome since we don't have a session lookup endpoint
    setLoading(false);
  }, [sessionId]);

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>&#127881;</div>
        <h1 style={{ color: THEME.accent, fontSize: 28, margin: "0 0 8px" }}>
          Welcome to Drink Club!
        </h1>
        <p style={{ color: THEME.text, fontSize: 16, margin: "0 0 32px" }}>
          Your subscription is active. You can redeem one specialty drink per week at Thai House.
        </p>

        {member?.qr_code && (
          <div style={styles.qrCard}>
            <div style={{ color: THEME.accent, fontWeight: 700, marginBottom: 12 }}>Your Member Code</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, color: THEME.text, letterSpacing: 2,
                          background: THEME.bg, padding: "12px 20px", borderRadius: 8, wordBreak: "break-all" }}>
              {member.qr_code}
            </div>
            <p style={{ color: THEME.textSecondary, fontSize: 12, marginTop: 8 }}>
              Show this code to staff when redeeming
            </p>
          </div>
        )}

        <p style={{ color: THEME.textSecondary, fontSize: 14, margin: "24px 0" }}>
          Save this page or bookmark it for easy access!
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link to="/thaihouse/drinks/member" style={{ ...styles.btn, textDecoration: "none" }}>
            Go to Member Portal
          </Link>
          <Link to="/thaihouse" style={{ color: THEME.accent, fontSize: 14 }}>
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: THEME.bg, minHeight: "100vh", color: THEME.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  qrCard: {
    background: THEME.card, padding: 24, borderRadius: 16,
    border: `1.5px solid ${THEME.accent}`, marginBottom: 24,
  },
  btn: {
    display: "block", padding: "14px 28px", borderRadius: 12, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 16,
    cursor: "pointer", textAlign: "center",
  },
};
