import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginVenue } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isLoggedIn, login, getSessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/games", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (getSessionExpired()) {
      setError("Session expired — please sign in again");
    }
  }, [getSessionExpired]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginVenue(email, password);
      login(data.token, data.venue_id, data.venue_name, data.role, data.status, data.expires_at);
      navigate("/games", { replace: true });
    } catch (err) {
      const msg = err.message || "";
      if (msg === "expired") {
        // Convention account expired — redirect to /expired
        navigate("/expired", { replace: true });
      } else if (msg.includes("not currently active")) {
        setError(msg);
      } else {
        setError("Invalid email or password");
      }
      setPassword("");
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
            background: "var(--accent)", margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem",
          }}>
            {"\uD83C\uDFB2"}
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
            Welcome to GameMaster Guide
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
            Sign in to your venue account
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="venue@example.com"
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

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "#94a3b8" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter password"
              aria-label="Password"
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
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        {/* Signup link */}
        <p style={{
          textAlign: "center", marginTop: "20px",
          fontSize: "0.85rem", color: "#64748b",
        }}>
          New to GameMaster Guide?{" "}
          <a href="/signup" style={{ color: "#94a3b8", textDecoration: "underline" }}>
            Try it free &rarr;
          </a>
        </p>

        {/* Contact link */}
        <p style={{
          textAlign: "center", marginTop: "8px",
          fontSize: "0.8rem", color: "#64748b",
        }}>
          Questions? Contact{" "}
          <a href="mailto:tim.minh.pham@gmail.com" style={{ color: "#94a3b8", textDecoration: "underline" }}>
            tim.minh.pham@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
