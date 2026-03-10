import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signupStonemaier } from "../services/api";

export default function SignupPage() {
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/games", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await signupStonemaier(firstName, email);
      login(data.token, data.venue_id, data.venue_name, data.role, "active");
      setToast(`Welcome, ${data.first_name || firstName}! You're in. \uD83C\uDFAE`);
      setTimeout(() => navigate("/games", { replace: true }), 1200);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "20px",
      background: "#0f172a",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
            background: "#166534", color: "#fff", padding: "12px 24px",
            borderRadius: "12px", fontSize: "1rem", fontWeight: 600,
            zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}>
            {toast}
          </div>
        )}

        {/* Logo & heading */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/images/gmg-logo.png" alt="GameMaster Guide" style={{ height: "64px", width: "auto", marginBottom: "24px" }} />
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
            Try it free at Dice Tower
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
            Get instant access to the Stonemaier Games collection.
            <br />
            No credit card. No commitment.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#4a1a1a",
            border: "1px solid #7a2a2a",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "16px",
            color: "#ff8888",
            fontSize: "0.9rem",
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: "#1e293b",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid #334155",
        }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "#94a3b8" }}>
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              placeholder="Your first name"
              aria-label="First name"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "#94a3b8" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              aria-label="Email address"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: loading ? "#334155" : "#e94560",
              color: "#fff",
              border: "none",
              fontSize: "1.05rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading && <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spinnerRotate 0.6s linear infinite" }} />}
            {loading ? "Getting your access..." : "Get Instant Access \u2192"}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: "20px",
          fontSize: "0.75rem", color: "#64748b", lineHeight: 1.5,
        }}>
          By signing up you agree to receive product updates from GameMaster Guide.
        </p>

        <p style={{
          textAlign: "center", marginTop: "8px",
          fontSize: "0.8rem", color: "#64748b",
        }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#94a3b8", textDecoration: "underline" }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
