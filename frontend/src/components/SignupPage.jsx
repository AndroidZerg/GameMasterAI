import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signupConvention } from "../services/api";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, login } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isTrial = searchParams.get("trial") === "true";

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
      const data = await signupConvention(email, isTrial);
      login(data.token, data.venue_id, data.venue_name, data.role, "convention");
      navigate("/games", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "20px",
      background: "#0f172a",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo & heading */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "16px",
            background: "var(--accent, #e94560)", margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem",
          }}>
            {"\uD83C\uDFB2"}
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
            {isTrial ? "Start Your Free Trial" : "Try GameMaster Guide Free"}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
            {isTrial
              ? "Start your free 30-day trial"
              : "Enter your email to get instant access"}
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
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "#94a3b8" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              aria-label="Email address"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: loading ? "#334155" : "var(--accent, #e94560)",
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
            {loading ? "Getting your access..." : (isTrial ? "Start Free Trial \u2192" : "Play Now \u2192")}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: "24px",
          fontSize: "0.8rem", color: "#64748b",
        }}>
          {isTrial ? (
            <>{"Cancel anytime. No credit card required."}</>
          ) : (
            <>
              {"No password needed. Access expires March 22, 2026."}
              <br />
              {"Already have an account? "}
              <a href="/" style={{ color: "#94a3b8", textDecoration: "underline" }}>
                Sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
