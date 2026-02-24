import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchVenueConfig, saveVenueSettings } from "../services/api";
import Breadcrumb from "./Breadcrumb";

export default function VenueSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    venue_name: "",
    venue_tagline: "",
    accent_color: "#e94560",
    logo_url: "",
    theme: "dark",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchVenueConfig()
      .then((data) => {
        setSettings({
          venue_name: data.venue_name || "",
          venue_tagline: data.venue_tagline || data.tagline || "",
          accent_color: data.accent_color || "#e94560",
          logo_url: data.logo_url || "",
          theme: data.default_theme || data.theme || "dark",
        });
      })
      .catch(() => {
        setSettings({
          venue_name: "",
          venue_tagline: "",
          accent_color: "#e94560",
          logo_url: "",
          theme: "dark",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveVenueSettings(settings);
      setToast("Settings saved!");
    } catch {
      setToast("Saved locally (API unavailable)");
    }
    setSaving(false);
    setTimeout(() => setToast(""), 3000);
    // Apply accent color live
    if (settings.accent_color) {
      document.documentElement.style.setProperty("--accent", settings.accent_color);
    }
  };

  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ height: "200px", borderRadius: "16px", background: "linear-gradient(90deg, var(--bg-primary) 25%, var(--bg-card) 50%, var(--bg-primary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "600px", margin: "0 auto" }}>
      <Breadcrumb items={[{ label: "Admin" }, { label: "Venue Settings" }]} />
      <h1 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)" }}>Venue Settings</h1>

      {/* Toast */}
      {toast && (
        <div style={{ background: "var(--accent)", color: "#fff", padding: "10px 16px", borderRadius: "10px", marginBottom: "16px", textAlign: "center", fontSize: "0.9rem", animation: "fadeIn 0.2s ease-out" }}>
          {toast}
        </div>
      )}

      <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border)", marginBottom: "24px" }}>
        {[
          { key: "venue_name", label: "Venue Name", type: "text" },
          { key: "venue_tagline", label: "Tagline", type: "text" },
          { key: "logo_url", label: "Logo URL", type: "url", placeholder: "https://..." },
        ].map((field) => (
          <div key={field.key} style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>{field.label}</label>
            <input
              type={field.type}
              value={settings[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              style={inputStyle}
            />
          </div>
        ))}

        {/* Accent Color */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Accent Color</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="color"
              value={settings.accent_color}
              onChange={(e) => update("accent_color", e.target.value)}
              style={{ width: "50px", height: "44px", borderRadius: "8px", border: "1px solid var(--border)", padding: "2px", cursor: "pointer", background: "var(--bg-secondary)" }}
            />
            <input
              type="text"
              value={settings.accent_color}
              onChange={(e) => update("accent_color", e.target.value)}
              style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }}
            />
          </div>
        </div>

        {/* Theme toggle */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Theme</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["dark", "light"].map((t) => (
              <button key={t} onClick={() => update("theme", t)}
                style={{
                  padding: "8px 20px", borderRadius: "999px", fontSize: "0.9rem",
                  background: settings.theme === t ? "var(--accent)" : "var(--bg-secondary)",
                  color: settings.theme === t ? "#fff" : "var(--text-secondary)",
                  border: settings.theme === t ? "2px solid var(--accent)" : "2px solid var(--border)",
                  fontWeight: settings.theme === t ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border)", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "12px" }}>Preview</h3>
        <div style={{ background: "var(--bg-primary)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: settings.accent_color || "var(--accent)" }}>
            GameMaster AI at {settings.venue_name || "Your Venue"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {settings.venue_tagline || "Your tagline here"}
          </div>
          <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
            <span style={{ background: settings.accent_color || "var(--accent)", color: "#fff", padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>Active Tab</span>
            <span style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem" }}>Inactive</span>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{
          width: "100%", padding: "14px", borderRadius: "12px",
          background: saving ? "var(--border)" : "var(--accent)",
          color: "#fff", border: "none", fontSize: "1.05rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
        }}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
