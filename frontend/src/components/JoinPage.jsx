import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../services/api";

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const key = searchParams.get("key");
    if (!key) {
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/join?key=${encodeURIComponent(key)}`);
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || "This session is not currently active.");
          return;
        }
        if (!res.ok) {
          navigate("/?error=invalid_link", { replace: true });
          return;
        }
        const data = await res.json();
        login(data.token, data.venue_id, data.venue_name, data.role, data.status, data.expires_at);
        navigate("/games", { replace: true });
      } catch {
        navigate("/?error=join_failed", { replace: true });
      }
    })();
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: "20px", background: "#0f172a",
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "16px",
            background: "var(--accent)", margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem",
          }}>
            {"\uD83C\uDFB2"}
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
            Not Currently Active
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 24px", lineHeight: 1.5 }}>
            {error}
          </p>
          <a href="/" style={{
            color: "#94a3b8", textDecoration: "underline", fontSize: "0.9rem",
          }}>
            Sign in instead &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "20px", background: "#0f172a",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "16px",
          background: "var(--accent)", margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem",
        }}>
          {"\uD83C\uDFB2"}
        </div>
        <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 12px" }}>
          Joining meetup...
        </p>
        <div style={{
          width: "24px", height: "24px", margin: "0 auto",
          border: "3px solid rgba(255,255,255,0.2)",
          borderTopColor: "#fff", borderRadius: "50%",
          animation: "spinnerRotate 0.6s linear infinite",
        }} />
      </div>
    </div>
  );
}
