import { useState } from "react";
import { useNavigate } from "react-router-dom";

function generateQRDataURL(text, size = 256) {
  // Simple QR code placeholder using SVG with encoded URL text
  // In production, use a library like qrcode-generator
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    <rect x="20" y="20" width="60" height="60" fill="black"/>
    <rect x="28" y="28" width="44" height="44" fill="white"/>
    <rect x="36" y="36" width="28" height="28" fill="black"/>
    <rect x="${size-80}" y="20" width="60" height="60" fill="black"/>
    <rect x="${size-72}" y="28" width="44" height="44" fill="white"/>
    <rect x="${size-64}" y="36" width="28" height="28" fill="black"/>
    <rect x="20" y="${size-80}" width="60" height="60" fill="black"/>
    <rect x="28" y="${size-72}" width="44" height="44" fill="white"/>
    <rect x="36" y="${size-64}" width="28" height="28" fill="black"/>
    <text x="${size/2}" y="${size/2+6}" text-anchor="middle" font-size="14" font-family="monospace" fill="black">${text.length > 30 ? "QR Code" : text}</text>
    <text x="${size/2}" y="${size/2+24}" text-anchor="middle" font-size="10" font-family="monospace" fill="#666">Scan to play</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function QRGeneratorPage() {
  const navigate = useNavigate();
  const [numTables, setNumTables] = useState(10);
  const [venueUrl, setVenueUrl] = useState("playgmai.com");

  const tables = Array.from({ length: numTables }, (_, i) => i + 1);

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }} className="no-print">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }} className="no-print">
        <button
          onClick={() => navigate("/app")}
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: "1.5rem", margin: 0, color: "var(--text-primary)" }}>QR Code Generator</h1>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
        className="no-print"
      >
        <div>
          <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Number of Tables
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={numTables}
            onChange={(e) => setNumTables(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "1rem",
              width: "120px",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Venue URL
          </label>
          <input
            type="text"
            value={venueUrl}
            onChange={(e) => setVenueUrl(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "1rem",
              width: "240px",
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 24px",
            borderRadius: "10px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Print QR Codes
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "24px",
        }}
      >
        {tables.map((n) => {
          const url = `https://${venueUrl}/app?table=${n}&kiosk=true`;
          return (
            <div
              key={n}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <img
                src={generateQRDataURL(url)}
                alt={`Table ${n} QR`}
                style={{ width: "180px", height: "180px", marginBottom: "8px" }}
              />
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111" }}>Table {n}</div>
              <div style={{ fontSize: "0.7rem", color: "#666", wordBreak: "break-all" }}>{url}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
