import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ExpiredPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Log the user out so they start fresh
  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "20px",
      background: "#0f172a",
    }}>
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          width: "64px", height: "64px", borderRadius: "16px",
          background: "var(--accent, #e94560)", margin: "0 auto 24px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem",
        }}>
          {"\uD83C\uDFB2"}
        </div>

        <h1 style={{
          fontSize: "1.5rem", fontWeight: 800, color: "#fff",
          margin: "0 0 12px",
        }}>
          Your Dice Tower West demo access has ended.
        </h1>

        <p style={{
          color: "#94a3b8", fontSize: "1rem", margin: "0 0 32px",
          lineHeight: 1.5,
        }}>
          Thanks for trying GameMaster Guide at Dice Tower West 2026.
        </p>

        {/* CTA */}
        <a
          href="/signup?trial=true"
          style={{
            display: "inline-block",
            padding: "14px 32px",
            borderRadius: "12px",
            background: "var(--accent, #e94560)",
            color: "#fff",
            fontSize: "1.1rem",
            fontWeight: 700,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Start Your Free 30-Day Trial &rarr;
        </a>

        <p style={{
          color: "#64748b", fontSize: "0.85rem", marginTop: "16px",
        }}>
          No credit card required. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
