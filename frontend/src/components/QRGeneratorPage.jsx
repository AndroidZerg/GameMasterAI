import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

function QRCard({ url, tableNum }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      }).catch(() => {});
    }
  }, [url]);

  return (
    <div
      className="qr-card"
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        textAlign: "center",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto 8px" }} />
      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111" }}>Table {tableNum}</div>
      <div style={{ fontSize: "0.7rem", color: "#666", wordBreak: "break-all" }}>{url}</div>
    </div>
  );
}

export default function QRGeneratorPage() {
  const [numTables, setNumTables] = useState(10);
  const [venueUrl, setVenueUrl] = useState("playgmai.com");

  const tables = Array.from({ length: numTables }, (_, i) => i + 1);

  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "1000px", margin: "0 auto" }}>
      <div className="no-print">
        <h1 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)" }}>QR Code Generator</h1>

        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
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
          return <QRCard key={n} url={url} tableNum={n} />;
        })}
      </div>
    </div>
  );
}
