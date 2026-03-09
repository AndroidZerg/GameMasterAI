import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { saveDrinkClubPhone } from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

export default function DrinkClubWelcome() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const subscriberId = params.get("sub_id");
  const [phone, setPhone] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Welcome to Cha Club!";
  }, []);

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    if (!subscriberId && !sessionId) {
      setError("Missing session info. Please use the link from your checkout confirmation email.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveDrinkClubPhone({
        subscriberId: subscriberId ? parseInt(subscriberId, 10) : null,
        sessionId: sessionId || null,
        phone: phone.trim(),
      });
      localStorage.setItem("thaihouse_dc_phone", phone.trim());
      setPhoneSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save phone number. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>&#127881;</div>
        <h1 style={{ color: THEME.accent, fontSize: 28, margin: "0 0 8px" }}>
          Welcome to Cha Club!
        </h1>
        <p style={{ color: THEME.text, fontSize: 16, margin: "0 0 32px" }}>
          Your subscription is active. You can redeem one specialty drink per week at Thai House.
        </p>

        {!phoneSaved ? (
          <div style={styles.phoneCard}>
            <div style={{ color: THEME.accent, fontWeight: 700, marginBottom: 8, fontSize: 16 }}>
              Save Your Phone Number
            </div>
            <p style={{ color: THEME.textSecondary, fontSize: 13, marginBottom: 16 }}>
              We'll use your phone number to look up your membership when you order.
            </p>
            <form onSubmit={handleSavePhone}>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
              />
              {error && (
                <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12 }}>{error}</p>
              )}
              <button type="submit" disabled={saving || !phone.trim()} style={{
                ...styles.btn, width: "100%",
                opacity: saving || !phone.trim() ? 0.5 : 1,
              }}>
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </form>
          </div>
        ) : (
          <div style={styles.phoneCard}>
            <div style={{ color: "#27ae60", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Phone Saved!
            </div>
            <p style={{ color: THEME.text, fontSize: 14 }}>
              You're all set. When you visit Thai House, your free drink will appear automatically on the menu.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
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
  phoneCard: {
    background: THEME.card, padding: 24, borderRadius: 16,
    border: `1.5px solid ${THEME.accent}`, marginBottom: 24,
  },
  input: {
    width: "100%", padding: "14px 16px", borderRadius: 10,
    border: `1px solid ${THEME.textSecondary}60`, background: THEME.bg,
    color: THEME.text, fontSize: 16, marginBottom: 12, boxSizing: "border-box",
    outline: "none",
  },
  btn: {
    display: "block", padding: "14px 28px", borderRadius: 12, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 16,
    cursor: "pointer", textAlign: "center",
  },
};
