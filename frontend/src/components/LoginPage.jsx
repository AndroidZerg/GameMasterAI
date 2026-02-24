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
      login(data.token, data.venue_id, data.venue_name);
      navigate("/games", { replace: true });
    } catch (err) {
      setError("Invalid email or password");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", marginBottom: "4px" }}>GameMaster AI</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Venue Admin Login</p>
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
          background: "var(--bg-card)",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid var(--border)",
        }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="venue@example.com"
              aria-label="Venue email"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
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
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "1rem",
                outline: "none",
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
              background: loading ? "var(--border)" : "var(--accent)",
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

      </div>
    </div>
  );
}
