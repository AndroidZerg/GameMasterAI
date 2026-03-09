import { useState } from "react";
import { staffSearch, staffRedeem } from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

export default function StaffPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [drinkName, setDrinkName] = useState("");
  const [redeemingId, setRedeemingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length === 4) setAuthed(true);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setFeedback(null);
    try {
      const data = await staffSearch(query.trim(), pin);
      setResults(data.results || []);
    } catch (err) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleRedeem = async (subscriberId) => {
    setRedeemingId(subscriberId);
    setFeedback(null);
    try {
      await staffRedeem(subscriberId, pin, drinkName);
      setFeedback({ type: "success", msg: "Drink redeemed successfully!" });
      // Refresh results
      const data = await staffSearch(query.trim(), pin);
      setResults(data.results || []);
      setDrinkName("");
    } catch (err) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setRedeemingId(null);
    }
  };

  if (!authed) {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: 360, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ color: THEME.accent, fontSize: 24, margin: "0 0 24px" }}>Staff Access</h1>
          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              maxLength={4}
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={{ ...styles.input, textAlign: "center", fontSize: 24, letterSpacing: 12 }}
              autoFocus
            />
            <button type="submit" disabled={pin.length !== 4}
              style={{ ...styles.btn, width: "100%", opacity: pin.length !== 4 ? 0.5 : 1 }}>
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ color: THEME.accent, fontSize: 24, margin: "0 0 20px" }}>Cha Club - Staff</h1>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          />
          <button type="submit" disabled={searching} style={styles.btn}>
            {searching ? "..." : "Search"}
          </button>
        </form>

        {feedback && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 16,
            background: feedback.type === "success" ? "#27ae6020" : "#e74c3c20",
            color: feedback.type === "success" ? "#27ae60" : "#e74c3c",
            fontWeight: 600, fontSize: 14,
          }}>
            {feedback.msg}
          </div>
        )}

        {results.map((sub) => (
          <div key={sub.id} style={styles.resultCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ color: THEME.text, fontWeight: 700, fontSize: 16 }}>{sub.name}</div>
                <div style={{ color: THEME.textSecondary, fontSize: 13 }}>{sub.phone || sub.email}</div>
              </div>
              <span style={{
                padding: "4px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: sub.status === "active" ? "#27ae6020" : "#e74c3c20",
                color: sub.status === "active" ? "#27ae60" : "#e74c3c",
              }}>
                {sub.status}
              </span>
            </div>

            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 10,
              background: sub.redeemed_this_week ? "#e74c3c15" : "#27ae6015",
            }}>
              <span style={{
                color: sub.redeemed_this_week ? "#e74c3c" : "#27ae60",
                fontWeight: 600, fontSize: 14,
              }}>
                {sub.redeemed_this_week ? "Already redeemed this week" : "Available for redemption"}
              </span>
            </div>

            {!sub.redeemed_this_week && sub.status === "active" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Drink name (optional)"
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  style={{ ...styles.input, flex: 1, marginBottom: 0, fontSize: 13 }}
                />
                <button
                  onClick={() => handleRedeem(sub.id)}
                  disabled={redeemingId === sub.id}
                  style={{ ...styles.btn, background: "#27ae60", whiteSpace: "nowrap" }}
                >
                  {redeemingId === sub.id ? "..." : "Redeem"}
                </button>
              </div>
            )}
          </div>
        ))}

        {results.length === 0 && query && !searching && (
          <p style={{ color: THEME.textSecondary, textAlign: "center", padding: 24 }}>No members found</p>
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
    padding: "12px 16px", borderRadius: 10, border: `1px solid ${THEME.textSecondary}60`,
    background: THEME.card, color: THEME.text, fontSize: 15, boxSizing: "border-box",
    outline: "none", marginBottom: 12, width: "100%",
  },
  btn: {
    padding: "12px 20px", borderRadius: 10, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  resultCard: {
    background: THEME.card, padding: 16, borderRadius: 12, marginBottom: 12,
  },
};
