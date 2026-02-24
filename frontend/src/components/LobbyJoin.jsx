import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinLobby } from "../services/api";

export default function LobbyJoin() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(urlCode || "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) return;

    setJoining(true);
    setError("");
    try {
      const data = await joinLobby(trimmedCode, trimmedName);
      localStorage.setItem("gmai_lobby_id", data.lobby_id);
      localStorage.setItem("gmai_player_id", data.player_id);
      localStorage.setItem("gmai_player_name", trimmedName);
      navigate(`/lobby/${data.lobby_id}`);
    } catch (err) {
      setError(err.message || "Session not found");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "20px",
      maxWidth: "400px", margin: "0 auto",
    }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: "8px", color: "var(--text-primary)" }}>
        Join Game Session
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "32px", textAlign: "center" }}>
        Enter the 4-digit session code and your name to join the shared score tracker.
      </p>

      {/* Code input */}
      <label style={{ width: "100%", marginBottom: "16px" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
          Session Code
        </span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="0000"
          maxLength={4}
          inputMode="numeric"
          autoFocus={!urlCode}
          style={{
            width: "100%", padding: "14px 16px", fontSize: "1.8rem",
            textAlign: "center", letterSpacing: "0.3em", fontFamily: "monospace",
            fontWeight: 700, borderRadius: "12px", border: "2px solid var(--border)",
            background: "var(--bg-primary)", color: "var(--text-primary)",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </label>

      {/* Name input */}
      <label style={{ width: "100%", marginBottom: "24px" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
          Your Name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="Enter your name"
          maxLength={20}
          autoFocus={!!urlCode}
          style={{
            width: "100%", padding: "14px 16px", fontSize: "1rem",
            borderRadius: "12px", border: "2px solid var(--border)",
            background: "var(--bg-primary)", color: "var(--text-primary)",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </label>

      {error && (
        <div style={{
          width: "100%", padding: "12px 16px", marginBottom: "16px",
          borderRadius: "10px", background: "#4a1a1a", border: "1px solid #ef4444",
          color: "#ef4444", fontSize: "0.9rem", textAlign: "center",
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={code.length < 4 || !name.trim() || joining}
        style={{
          width: "100%", padding: "16px", borderRadius: "12px", fontWeight: 700,
          background: code.length < 4 || !name.trim() || joining ? "var(--border)" : "var(--accent)",
          color: "#fff", border: "none", fontSize: "1.1rem", cursor: "pointer",
        }}
      >
        {joining ? "Joining..." : "Join Session"}
      </button>

      <button
        onClick={() => navigate("/games")}
        style={{
          marginTop: "16px", background: "none", border: "none",
          color: "var(--text-secondary)", fontSize: "0.9rem", cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Back to Games
      </button>
    </div>
  );
}
