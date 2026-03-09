import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { THEME, FONTS_LINK, styles } from "./swpTheme";
import { fetchRentalCheckoutSession, updateRentalProfile } from "../../services/api";

export default function SWPRentalWelcome() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Welcome to Game Rentals!";
    if (!document.querySelector('link[href*="Fraunces"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS_LINK;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found. Please use the link from your checkout confirmation.");
      setLoading(false);
      return;
    }
    fetchRentalCheckoutSession(sessionId)
      .then((data) => {
        setSessionData(data);
        if (data.name) setName(data.name);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load session. Please try again.");
        setLoading(false);
      });
  }, [sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sessionData?.stripe_customer_id) return;
    setSaving(true);
    setError(null);
    try {
      await updateRentalProfile({
        stripe_customer_id: sessionData.stripe_customer_id,
        name: name.trim(),
        phone: phone.trim() || null,
      });
      localStorage.setItem("swp_rental_customer", sessionData.stripe_customer_id);
      navigate("/swp/rentals/browse");
    } catch (err) {
      setError(err.message || "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>&#9203;</div>
          <p style={{ color: THEME.textSecondary, fontSize: 16 }}>Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>&#127881;</div>
        <h1 style={{
          fontFamily: THEME.fontHeading, fontSize: 32, fontWeight: 700,
          color: THEME.text, margin: "0 0 8px",
        }}>
          Welcome to Game Rentals!
        </h1>
        <p style={{ color: THEME.textSecondary, fontSize: 16, margin: "0 0 32px" }}>
          Your subscription is active. Let's get you set up so you can start browsing.
        </p>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
            padding: "12px 16px", marginBottom: 20, color: "#b91c1c", fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {sessionData && (
          <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                style={styles.input}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                Phone Number <span style={{ fontWeight: 400, color: THEME.textSecondary }}>(optional, for pickup coordination)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="702-555-1234"
                style={styles.input}
              />
            </div>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                ...styles.tealBtn, width: "100%", fontSize: 17, padding: "16px",
                opacity: saving || !name.trim() ? 0.6 : 1,
              }}
            >
              {saving ? "Setting up..." : "Start Browsing"}
            </button>
          </form>
        )}

        {!sessionData && !error && (
          <p style={{ color: THEME.textSecondary }}>
            Something went wrong loading your session.
          </p>
        )}
      </div>
    </div>
  );
}
