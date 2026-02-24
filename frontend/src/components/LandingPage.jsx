import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE } from "../services/api";

function DemoModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", venue_name: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // "success" | "error"

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
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

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", borderRadius: "16px", padding: "32px",
          border: "1px solid var(--border)", maxWidth: "460px", width: "100%",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "12px", right: "12px", background: "none",
            border: "none", color: "var(--text-secondary)", fontSize: "1.2rem",
            cursor: "pointer", padding: "4px 8px",
          }}
        >
          ✕
        </button>

        {result === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>&#10003;</div>
            <h3 style={{ color: "var(--accent)", marginBottom: "8px" }}>Thanks!</h3>
            <p style={{ color: "var(--text-secondary)" }}>We'll be in touch within 24 hours.</p>
            <button
              onClick={onClose}
              style={{
                marginTop: "20px", padding: "12px 32px", borderRadius: "10px",
                background: "var(--accent)", color: "#fff", border: "none",
                fontWeight: 600, cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        ) : result === "error" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <h3 style={{ color: "#ef4444", marginBottom: "8px" }}>Something went wrong</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Email us directly at{" "}
              <a href="mailto:tim.minh.pham@gmail.com" style={{ color: "var(--accent)" }}>
                tim.minh.pham@gmail.com
              </a>
            </p>
            <button
              onClick={() => setResult(null)}
              style={{
                marginTop: "20px", padding: "12px 32px", borderRadius: "10px",
                background: "var(--bg-primary)", color: "var(--text-primary)",
                border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "4px", color: "var(--text-primary)" }}>
              Book a Demo
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "24px" }}>
              Tell us about your venue and we'll set up a personalized walkthrough.
            </p>
            <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Venue / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.venue_name}
                  onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Message
                </label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your venue"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%", padding: "14px", fontSize: "1.05rem", borderRadius: "12px",
                  background: submitting ? "var(--border)" : "var(--accent)",
                  color: "#fff", border: "none", fontWeight: 700, cursor: "pointer",
                }}
              >
                {submitting ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  const sectionStyle = {
    padding: "60px 20px",
    maxWidth: "1100px",
    margin: "0 auto",
  };

  return (
    <div style={{ background: "#0f0f1a", color: "var(--text-primary)" }}>
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      {/* Hero */}
      <section style={{ ...sectionStyle, textAlign: "center", padding: "80px 20px 60px" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, marginBottom: "16px", lineHeight: 1.2 }}>
          GameMaster AI
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)", color: "var(--text-secondary)", marginBottom: "8px" }}>
          Your Board Game Expert, On Every Table
        </p>
        <p style={{ fontSize: "clamp(0.9rem, 2vw, 1.15rem)", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 8px" }}>
          AI-powered game teaching for cafes, bars, and game venues.
        </p>
        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.3rem)", color: "var(--text-primary)", maxWidth: "600px", margin: "0 auto 32px", fontWeight: 700 }}>
          Cut teaching time by 70%.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/games")}
            style={{
              padding: "14px 32px", fontSize: "1.1rem", borderRadius: "12px",
              background: "var(--accent)", color: "#fff", border: "none",
              fontWeight: 700, cursor: "pointer",
            }}
          >
            See It In Action
          </button>
        </div>
      </section>

      {/* Value Props */}
      <section style={{ ...sectionStyle }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {[
            {
              title: "200+ Games, Taught Instantly",
              desc: "Setup, rules, strategy, and live Q&A for your entire game library. No training needed.",
              icon: "\uD83C\uDFB2",
            },
            {
              title: "Save $2,400\u2013$4,800/month",
              desc: "Replace dedicated game teachers. Every table gets expert-level guidance automatically.",
              icon: "\uD83D\uDCB0",
            },
            {
              title: "Your Brand, Your Tables",
              desc: "Custom branding, pricing, and sales prompts. Drive game sales from every session.",
              icon: "\uD83C\uDFEA",
            },
          ].map((prop) => (
            <div
              key={prop.title}
              style={{
                background: "var(--bg-card)", borderRadius: "16px", padding: "32px 24px",
                border: "1px solid var(--border)", textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{prop.icon}</div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", color: "var(--text-primary)" }}>{prop.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{prop.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ ...sectionStyle, textAlign: "center" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "32px", fontWeight: 700 }}>How It Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
          {[
            { step: "1", title: "Pick a Game", desc: "Browse the library on any device and tap the game your table chose." },
            { step: "2", title: "Follow the Guide", desc: "Step-by-step Setup, Rules, and Strategy guides tailored to player count." },
            { step: "3", title: "Ask Anything", desc: "Mid-game question? Just ask the AI \u2014 it knows every edge case." },
          ].map((s) => (
            <div key={s.step} style={{ padding: "24px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%", background: "var(--accent)",
                color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", fontWeight: 700, marginBottom: "12px",
              }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: "1.15rem", marginBottom: "8px" }}>{s.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ ...sectionStyle, textAlign: "center" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "32px", fontWeight: 700 }}>Pricing</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {[
            {
              name: "Starter",
              price: "$149",
              features: [
                "50 games", "1 house device", "Voice AI game teaching",
                "Score tracking", "Basic support",
              ],
            },
            {
              name: "Standard",
              price: "$299",
              features: [
                "200 games", "Up to 4 devices", "Custom branding",
                "Staff picks & Game of the Day", "F&B menu integration",
                "Game sales prompts",
              ],
              highlight: true,
            },
            {
              name: "Premium",
              price: "$499",
              features: [
                "200+ games (growing monthly)",
                "Unlimited devices + QR scan access",
                "Lobby sync \u2014 customers play together on their phones",
                "Advanced analytics dashboard",
                "Priority support", "API access", "Custom score tracking",
              ],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? "var(--bg-card)" : "var(--bg-secondary)",
                borderRadius: "16px", padding: "32px 24px",
                border: plan.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
                position: "relative",
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                  background: "var(--accent)", color: "#fff", padding: "4px 16px",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase",
                }}>
                  Most Popular
                </div>
              )}
              <h3 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>{plan.name}</h3>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent)", marginBottom: "4px" }}>
                {plan.price}
              </div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "4px", fontSize: "0.9rem" }}>per month</p>
              <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "0.78rem", opacity: 0.7 }}>
                per location &bull; month-to-month &bull; cancel anytime
              </p>
              <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{
                    padding: "8px 0", borderBottom: "1px solid var(--border)",
                    color: "var(--text-secondary)", fontSize: "0.95rem",
                  }}>
                    &#10003; {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Single CTA */}
        <div style={{ marginTop: "36px" }}>
          <button
            onClick={() => setShowDemo(true)}
            style={{
              padding: "16px 48px", borderRadius: "12px", background: "var(--accent)",
              color: "#fff", fontWeight: 700, fontSize: "1.15rem", border: "none",
              cursor: "pointer",
            }}
          >
            Book a Demo
          </button>
        </div>

        {/* Founding Partner banner */}
        <div style={{
          marginTop: "32px", padding: "24px 32px", borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(233,69,96,0.12) 0%, rgba(74,144,217,0.10) 100%)",
          border: "1px solid rgba(233,69,96,0.3)", maxWidth: "700px", margin: "32px auto 0",
        }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
            {"\uD83D\uDE80"} Founding Partner Program
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.95rem", margin: 0 }}>
            First 3 venues get a free 30-day pilot.{" "}
            <button
              onClick={() => setShowDemo(true)}
              style={{
                background: "none", border: "none", color: "var(--accent)",
                fontWeight: 600, textDecoration: "underline", cursor: "pointer",
                fontSize: "0.95rem", padding: 0,
              }}
            >
              Book a demo
            </button>{" "}
            to claim your spot.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section style={{ ...sectionStyle, textAlign: "center" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "16px", fontWeight: 700 }}>Get In Touch</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          Questions? Ready to get started? We'd love to hear from you.
        </p>
        <button
          onClick={() => setShowDemo(true)}
          style={{
            padding: "14px 40px", fontSize: "1.05rem", borderRadius: "12px",
            background: "var(--accent)", color: "#fff", border: "none",
            fontWeight: 700, cursor: "pointer",
          }}
        >
          Book a Demo
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: "center", padding: "32px 20px", color: "var(--text-secondary)",
        fontSize: "0.85rem", borderTop: "1px solid var(--border)",
      }}>
        GameMaster AI — Board game teaching, automated.
      </footer>
    </div>
  );
}
