import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE, staffRedeem } from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

export default function StaffRedeem() {
  const [params] = useSearchParams();
  const code = params.get("code");
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pin, setPin] = useState("");
  const [drinkName, setDrinkName] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redeemError, setRedeemError] = useState(null);

  useEffect(() => {
    if (!code) {
      setError("No QR code provided");
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/thaihouse/staff/redeem?code=${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Member not found");
        return r.json();
      })
      .then((data) => {
        setMember(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [code]);

  const handleRedeem = async () => {
    if (!pin || pin.length !== 4 || !member) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      await staffRedeem(member.id, pin, drinkName);
      setSuccess(true);
    } catch (err) {
      setRedeemError(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <h1 style={{ color: THEME.accent, fontSize: 24, margin: "0 0 24px" }}>Drink Club Redemption</h1>

        {loading && <p style={{ color: THEME.textSecondary }}>Loading member info...</p>}
        {error && <p style={{ color: "#e74c3c" }}>{error}</p>}

        {success && (
          <div style={{ ...styles.card, border: `2px solid #27ae60` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
            <h2 style={{ color: "#27ae60", margin: "0 0 8px" }}>Drink Redeemed!</h2>
            <p style={{ color: THEME.textSecondary }}>
              {member?.name} - {drinkName || "Specialty drink"}
            </p>
          </div>
        )}

        {member && !success && (
          <div style={styles.card}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text }}>{member.name}</div>
              <div style={{ color: THEME.textSecondary, fontSize: 14 }}>{member.email}</div>
            </div>

            <div style={{
              padding: "10px 16px", borderRadius: 8, marginBottom: 16,
              background: member.redeemed_this_week ? "#e74c3c15" : "#27ae6015",
              color: member.redeemed_this_week ? "#e74c3c" : "#27ae60",
              fontWeight: 600,
            }}>
              {member.redeemed_this_week ? "Already redeemed this week" : "Available for redemption"}
            </div>

            {!member.redeemed_this_week && member.status === "active" && (
              <>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Staff PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={{ ...styles.input, textAlign: "center", fontSize: 20, letterSpacing: 8 }}
                />
                <input
                  type="text"
                  placeholder="Drink name (optional)"
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={handleRedeem}
                  disabled={pin.length !== 4 || redeeming}
                  style={{ ...styles.btn, width: "100%", opacity: pin.length !== 4 || redeeming ? 0.5 : 1 }}
                >
                  {redeeming ? "Redeeming..." : "Confirm Redemption"}
                </button>
                {redeemError && <p style={{ color: "#e74c3c", marginTop: 12, fontSize: 14 }}>{redeemError}</p>}
              </>
            )}
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
  card: {
    background: THEME.card, padding: 24, borderRadius: 16,
  },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: `1px solid ${THEME.textSecondary}60`, background: THEME.bg,
    color: THEME.text, fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none",
  },
  btn: {
    padding: "14px 28px", borderRadius: 12, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 16, cursor: "pointer",
  },
};
