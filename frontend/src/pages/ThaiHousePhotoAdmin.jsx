import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE, listMenuItems, uploadMenuPhoto, deleteMenuPhoto } from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

export default function ThaiHousePhotoAdmin() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const [uploading, setUploading] = useState(null); // slug being uploaded
  const [confirmDelete, setConfirmDelete] = useState(null); // slug to confirm delete
  const fileInputRef = useRef(null);
  const [uploadSlug, setUploadSlug] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await listMenuItems(pin);
      setCategories(data.categories);
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshItems = async () => {
    try {
      const data = await listMenuItems(pin);
      setCategories(data.categories);
    } catch {}
  };

  const handleUploadClick = (slug) => {
    setUploadSlug(slug);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadSlug) return;
    setUploading(uploadSlug);
    try {
      await uploadMenuPhoto(uploadSlug, file, pin);
      await refreshItems();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(null);
      setUploadSlug(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (slug) => {
    try {
      await deleteMenuPhoto(slug, pin);
      setConfirmDelete(null);
      await refreshItems();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  if (!authed) {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: 380, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ color: THEME.accent, fontSize: 24, marginBottom: 24 }}>Photo Admin</h1>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              placeholder="Enter staff PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <button type="submit" disabled={loading} style={{ ...styles.btn, width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Verifying..." : "Enter"}
            </button>
            {error && <p style={{ color: "#e74c3c", marginTop: 12, fontSize: 14 }}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ color: THEME.accent, fontSize: 22, margin: 0 }}>Menu Photos</h1>
          <Link to="/thaihouse" style={{ color: THEME.textSecondary, fontSize: 13, textDecoration: "none" }}>
            &larr; Back to Menu
          </Link>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {categories.map((cat) => (
          <div key={cat.name} style={{ marginBottom: 12 }}>
            <button
              onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
              style={styles.categoryHeader}
            >
              <span>{cat.icon} {cat.name}</span>
              <span style={{ color: THEME.textSecondary, fontSize: 13 }}>
                {cat.items.filter((i) => i.has_photo).length}/{cat.items.length} photos
              </span>
            </button>

            {expandedCat === cat.name && (
              <div style={{ padding: "8px 0" }}>
                {cat.items.map((item) => (
                  <div key={item.slug} style={styles.itemRow}>
                    {/* Thumbnail */}
                    <div style={styles.thumbContainer}>
                      {item.has_photo ? (
                        <img
                          src={`${API_BASE}/api/images/menu/${item.slug}-thumb.jpg?t=${Date.now()}`}
                          alt={item.name}
                          style={styles.thumb}
                        />
                      ) : (
                        <div style={styles.noThumb}>No Photo</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: THEME.text, fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div style={{ color: THEME.textSecondary, fontSize: 12 }}>${item.price.toFixed(2)}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleUploadClick(item.slug)}
                        disabled={uploading === item.slug}
                        style={styles.actionBtn}
                      >
                        {uploading === item.slug ? "..." : item.has_photo ? "Replace" : "Upload"}
                      </button>
                      {item.has_photo && (
                        confirmDelete === item.slug ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => handleDelete(item.slug)} style={{ ...styles.actionBtn, color: "#e74c3c", borderColor: "#e74c3c" }}>
                              Yes
                            </button>
                            <button onClick={() => setConfirmDelete(null)} style={styles.actionBtn}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(item.slug)} style={{ ...styles.actionBtn, color: "#e74c3c", borderColor: "#e74c3c40" }}>
                            Delete
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: THEME.bg, minHeight: "100vh", color: THEME.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  input: {
    width: "100%", padding: "14px 16px", borderRadius: 10,
    border: `1px solid ${THEME.textSecondary}60`, background: THEME.card,
    color: THEME.text, fontSize: 18, marginBottom: 12, boxSizing: "border-box",
    outline: "none", textAlign: "center", letterSpacing: 4,
  },
  btn: {
    padding: "14px 28px", borderRadius: 12, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 16, cursor: "pointer",
  },
  categoryHeader: {
    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px", background: THEME.card, borderRadius: 10,
    border: "none", color: THEME.text, fontWeight: 700, fontSize: 15, cursor: "pointer",
  },
  itemRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 12px", borderBottom: `1px solid ${THEME.textSecondary}15`,
  },
  thumbContainer: {
    width: 56, height: 56, borderRadius: 8, overflow: "hidden", flexShrink: 0,
  },
  thumb: {
    width: "100%", height: "100%", objectFit: "cover",
  },
  noThumb: {
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    background: THEME.card, color: THEME.textSecondary, fontSize: 10, borderRadius: 8,
  },
  actionBtn: {
    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${THEME.accent}40`, background: "transparent", color: THEME.accent,
  },
};
