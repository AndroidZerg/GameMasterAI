import { useState } from "react";
import { API_BASE } from "../services/api";

const COLORS = {
  bg: "#1a1a2e",
  bgCard: "#16213e",
  green: "#22c55e",
  greenHover: "#16a34a",
  text: "#e0e0e0",
  textMuted: "#a0a0a0",
  border: "#2a3a5c",
  inputBg: "#0f1729",
};

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');

  .pub-landing * { box-sizing: border-box; margin: 0; padding: 0; }
  .pub-landing { font-family: 'DM Sans', sans-serif; }
  .pub-landing input, .pub-landing textarea {
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s;
  }
  .pub-landing input:focus, .pub-landing textarea:focus {
    border-color: ${COLORS.green} !important;
    outline: none;
  }
  .pub-landing button { font-family: 'DM Sans', sans-serif; }
  .pub-btn:hover { background: ${COLORS.greenHover} !important; }
  .pub-btn:disabled { opacity: 0.6; cursor: not-allowed !important; }
  @keyframes pubFadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: `1px solid ${COLORS.border}`,
  background: COLORS.inputBg,
  color: COLORS.text,
  fontSize: "1rem",
};

export default function PublisherLandingPage() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", company: "", games: "", email: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // "success" | "error"

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/publisher-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pub-landing" style={{
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.text,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 20px 64px",
    }}>
      <style>{PAGE_CSS}</style>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          fontSize: "1.6rem", fontWeight: 700, letterSpacing: "0.04em",
          color: "#fff",
        }}>
          <span style={{ color: COLORS.green }}>GameMaster</span> Guide
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 520,
        background: COLORS.bgCard,
        borderRadius: 16,
        padding: "40px 32px",
        border: `1px solid ${COLORS.border}`,
        animation: "pubFadeIn 0.5s ease-out",
      }}>
        {result === "success" ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>&#10003;</div>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "1.6rem", color: "#fff", marginBottom: 12,
            }}>Thanks! We'll be in touch soon.</h2>
            <p style={{ color: COLORS.textMuted, lineHeight: 1.6 }}>
              We're excited to learn more about your game. A member of our team will reach out shortly.
            </p>
          </div>
        ) : result === "error" ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>&#9888;</div>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "1.4rem", color: "#fff", marginBottom: 12,
            }}>Something went wrong</h2>
            <p style={{ color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
              Please try again or email us directly at{" "}
              <a href="mailto:hello@playgmg.com" style={{ color: COLORS.green }}>hello@playgmg.com</a>
            </p>
            <button
              onClick={() => setResult(null)}
              className="pub-btn"
              style={{
                padding: "12px 28px", borderRadius: 10, border: "none",
                background: COLORS.green, color: "#fff", fontWeight: 600,
                fontSize: "1rem", cursor: "pointer",
              }}
            >Try Again</button>
          </div>
        ) : (
          <>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "1.75rem", color: "#fff", marginBottom: 10, lineHeight: 1.3,
            }}>Add Your Game to GameMaster Guide</h1>
            <p style={{
              color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 28, fontSize: "0.95rem",
            }}>
              We teach board games to players at cafes, restaurants, and venues across the country.
              Partner with us to get your game in front of new players.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name row */}
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  required value={form.first_name} onChange={set("first_name")}
                  placeholder="First Name" style={inputStyle}
                />
                <input
                  required value={form.last_name} onChange={set("last_name")}
                  placeholder="Last Name" style={inputStyle}
                />
              </div>

              <input
                required value={form.company} onChange={set("company")}
                placeholder="Company / Publisher Name" style={inputStyle}
              />

              <input
                required value={form.games} onChange={set("games")}
                placeholder="e.g. Hasty Baker, House Hounds" style={inputStyle}
              />

              <input
                required type="email" value={form.email} onChange={set("email")}
                placeholder="Email" style={inputStyle}
              />

              <textarea
                value={form.message} onChange={set("message")}
                placeholder="Anything else you'd like us to know?"
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />

              <button
                type="submit" disabled={submitting}
                className="pub-btn"
                style={{
                  width: "100%", padding: "14px", borderRadius: 12,
                  background: COLORS.green, color: "#fff", border: "none",
                  fontSize: "1.1rem", fontWeight: 700, cursor: "pointer",
                  marginTop: 4,
                }}
              >{submitting ? "Sending..." : "Get in Touch"}</button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 32, color: COLORS.textMuted, fontSize: "0.8rem",
      }}>
        &copy; {new Date().getFullYear()} GameMaster Guide &middot; playgmg.com
      </p>
    </div>
  );
}
