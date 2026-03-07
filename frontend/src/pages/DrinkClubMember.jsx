import { useState } from "react";
import { Link } from "react-router-dom";
import { lookupDrinkMember } from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

export default function DrinkClubMember() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lookupDrinkMember(email.trim());
      setMember(data);
    } catch (err) {
      setError(err.message);
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "32px 24px" }}>
        <Link to="/thaihouse/drinks" style={{ color: THEME.textSecondary, textDecoration: "none", fontSize: 14 }}>
          &larr; Back to Drink Club
        </Link>

        <h1 style={{ color: THEME.accent, fontSize: 24, margin: "16px 0" }}>Member Portal</h1>

        {!member && (
          <form onSubmit={handleLookup}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={{ ...styles.btn, width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Looking up..." : "Look Up Membership"}
            </button>
            {error && <p style={{ color: "#e74c3c", marginTop: 12, fontSize: 14 }}>{error}</p>}
          </form>
        )}

        {member && (
          <div>
            {/* Status Card */}
            <div style={styles.statusCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: THEME.text, fontWeight: 700, fontSize: 18 }}>{member.name}</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: member.status === "active" ? "#27ae6020" : "#e74c3c20",
                  color: member.status === "active" ? "#27ae60" : "#e74c3c",
                }}>
                  {member.status}
                </span>
              </div>

              {/* This week */}
              <div style={{
                padding: "16px", borderRadius: 10, marginBottom: 12,
                background: member.redeemed_this_week ? THEME.bg : `${THEME.accent}15`,
                border: member.redeemed_this_week ? "none" : `1px solid ${THEME.accent}40`,
              }}>
                <div style={{ fontWeight: 700, color: THEME.text, marginBottom: 4 }}>
                  This Week
                </div>
                <div style={{ color: member.redeemed_this_week ? THEME.textSecondary : THEME.accent, fontSize: 14 }}>
                  {member.redeemed_this_week
                    ? `Redeemed: ${member.redemption?.drink_name || "Specialty drink"}`
                    : "Available! Visit Thai House to redeem your drink."}
                </div>
              </div>

              {/* QR Code */}
              {member.qr_code && (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ color: THEME.textSecondary, fontSize: 12, marginBottom: 8 }}>Your Member Code</div>
                  <div style={{
                    fontFamily: "monospace", fontSize: 18, color: THEME.accent,
                    background: THEME.bg, padding: "10px 16px", borderRadius: 8,
                    letterSpacing: 2, wordBreak: "break-all",
                  }}>
                    {member.qr_code}
                  </div>
                </div>
              )}
            </div>

            {/* Redemption History */}
            {member.history && member.history.length > 0 && (
              <div>
                <h3 style={{ color: THEME.accent, fontSize: 16, marginBottom: 12 }}>Recent Redemptions</h3>
                {member.history.map((r, i) => (
                  <div key={i} style={styles.historyRow}>
                    <div style={{ color: THEME.text, fontSize: 14 }}>
                      {r.drink_name || "Specialty drink"}
                    </div>
                    <div style={{ color: THEME.textSecondary, fontSize: 12 }}>
                      Week of {r.week_start}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setMember(null); setEmail(""); }}
              style={{ ...styles.btn, width: "100%", marginTop: 24, background: "transparent",
                       border: `1px solid ${THEME.accent}`, color: THEME.accent }}>
              Look Up Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: THEME.bg, minHeight: "100vh", color: THEME.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  input: {
    width: "100%", padding: "14px 16px", borderRadius: 10,
    border: `1px solid ${THEME.textSecondary}60`, background: THEME.card,
    color: THEME.text, fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none",
  },
  btn: {
    padding: "14px 28px", borderRadius: 12, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 16, cursor: "pointer",
  },
  statusCard: {
    background: THEME.card, padding: 20, borderRadius: 16, marginBottom: 24,
  },
  historyRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: `1px solid ${THEME.textSecondary}20`,
  },
};
