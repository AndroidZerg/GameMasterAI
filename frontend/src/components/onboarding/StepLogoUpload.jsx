import { useState, useRef } from "react";
import { API_BASE } from "../../services/api";

export default function StepLogoUpload({ venueId, onSave, onSkip }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError("");
    if (f.size > 2 * 1024 * 1024) {
      setError("File too large. Maximum 2MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setError("Invalid file type. Use PNG, JPG, or WEBP.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("gmai_token");
      const res = await fetch(`${API_BASE}/api/v1/onboarding/step/2/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>Upload Your Logo</h2>
      <p style={{ color: "#8899aa", marginBottom: 24, fontSize: 14 }}>
        PNG, JPG, or WEBP — max 2MB. This will appear on your venue's page.
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed #2a3a4a", borderRadius: 12, padding: 40,
          textAlign: "center", cursor: "pointer", marginBottom: 20,
          background: preview ? "transparent" : "#1a2332",
        }}
      >
        {preview ? (
          <img src={preview} alt="Logo preview" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }} />
        ) : (
          <div>
            <div style={{ fontSize: 48, marginBottom: 8 }}>+</div>
            <div style={{ color: "#8899aa" }}>Click to select an image</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} style={{ display: "none" }} />

      {error && <div style={{ color: "#ff4444", marginBottom: 12, fontSize: 14 }}>{error}</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onSkip} style={{
          flex: 1, padding: "14px", background: "transparent",
          color: "#8899aa", border: "1px solid #2a3a4a", borderRadius: 8,
          fontSize: 16, cursor: "pointer",
        }}>
          Skip for Now
        </button>
        <button onClick={handleUpload} disabled={!file || uploading} style={{
          flex: 1, padding: "14px", background: "#e94560",
          color: "#fff", border: "none", borderRadius: 8, fontSize: 16,
          fontWeight: 600, cursor: uploading ? "wait" : "pointer",
          opacity: !file || uploading ? 0.5 : 1,
        }}>
          {uploading ? "Uploading..." : "Upload & Continue"}
        </button>
      </div>
    </div>
  );
}
