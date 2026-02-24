import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createLobby, getLobbyState } from "../services/api";

export default function LobbyCreate({ gameId, gameTitle }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("name"); // name | waiting
  const [name, setName] = useState("");
  const [lobby, setLobby] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const pollRef = useRef(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      const data = await createLobby(gameId, trimmed);
      localStorage.setItem("gmai_lobby_id", data.lobby_id);
      localStorage.setItem("gmai_player_id", data.host_id);
      localStorage.setItem("gmai_player_name", trimmed);
      setLobby(data);
      setStep("waiting");
    } catch (err) {
      setError(err.message || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  // Poll for players while waiting
  useEffect(() => {
    if (step !== "waiting" || !lobby) return;
    const poll = async () => {
      try {
        const state = await getLobbyState(lobby.lobby_id);
        setLobby((prev) => ({ ...prev, players: state.players }));
      } catch { /* ignore */ }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [step, lobby?.lobby_id]);

  const startGame = () => {
    navigate(`/lobby/${lobby.lobby_id}`);
  };

  const qrUrl = lobby
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lobby.qr_url)}`
    : "";

  if (step === "name") {
    return (
      <div style={{ padding: "20px 0" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "1.1rem", color: "var(--text-primary)" }}>
          Start a Game Session
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 16px" }}>
          Create a shared score tracker for {gameTitle}. Friends can join by scanning a QR code.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Your name"
            maxLength={20}
            autoFocus
            style={{
              flex: 1, padding: "12px 16px", fontSize: "1rem", borderRadius: "12px",
              border: "2px solid var(--border)", background: "var(--bg-primary)",
              color: "var(--text-primary)", outline: "none",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            style={{
              padding: "12px 24px", borderRadius: "12px", fontWeight: 600,
              background: !name.trim() || creating ? "var(--border)" : "var(--accent)",
              color: "#fff", border: "none", fontSize: "1rem", cursor: "pointer",
            }}
          >
            {creating ? "..." : "Create"}
          </button>
        </div>
        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "8px" }}>{error}</p>
        )}
      </div>
    );
  }

  // Waiting room
  return (
    <div style={{ padding: "20px 0", textAlign: "center" }}>
      {/* Session code */}
      <div style={{
        background: "var(--bg-card)", borderRadius: "16px", padding: "24px",
        border: "1px solid var(--border)", marginBottom: "20px",
      }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 8px" }}>
          Session Code
        </p>
        <div style={{
          fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.2em",
          color: "var(--accent)", fontFamily: "monospace",
        }}>
          {lobby.lobby_code}
        </div>
      </div>

      {/* QR Code */}
      <div style={{ marginBottom: "20px" }}>
        <img
          src={qrUrl}
          alt="QR code to join session"
          style={{ width: "180px", height: "180px", borderRadius: "12px", background: "#fff", padding: "8px" }}
        />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "8px" }}>
          Scan to join on another device
        </p>
      </div>

      {/* Player list */}
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px",
        border: "1px solid var(--border)", marginBottom: "20px", textAlign: "left",
      }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          Players ({lobby.players?.length || 1})
        </p>
        {(lobby.players || []).map((p) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: "1.2rem" }}>{p.is_host ? "\uD83D\uDC51" : "\uD83C\uDFAE"}</span>
            <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: p.is_host ? 600 : 400 }}>
              {p.name}
            </span>
            {p.is_host && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent)", background: "var(--bg-card)", padding: "2px 8px", borderRadius: "999px" }}>
                Host
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Waiting indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
        <div style={{
          width: "12px", height: "12px", borderRadius: "50%",
          background: "var(--accent)", animation: "pulse 1.5s ease-in-out infinite",
        }} />
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Waiting for players...
        </span>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: "14px 40px", borderRadius: "12px", fontWeight: 700,
          background: "var(--accent)", color: "#fff", border: "none",
          fontSize: "1.05rem", cursor: "pointer", width: "100%", maxWidth: "300px",
        }}
      >
        Start Scoring
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
