import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE, fetchGames, fetchCoverArtOverrides, saveCoverArtOverride, deleteCoverArtOverride } from "../services/api";

const FILTERS = ["All", "Needs Art", "Custom"];

export default function CoverArtManager() {
  const { role } = useAuth();
  const [games, setGames] = useState([]);
  const [overrides, setOverrides] = useState({});  // {game_id: image_url}
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [newUrl, setNewUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const isSuperAdmin = role === "super_admin";

  // Load games + overrides on mount
  useEffect(() => {
    fetchGames().then(setGames).catch(() => {});
    loadOverrides();
  }, []);

  function loadOverrides() {
    fetchCoverArtOverrides()
      .then(list => {
        const map = {};
        list.forEach(o => { map[o.game_id] = o.image_url; });
        setOverrides(map);
      })
      .catch(() => {});
  }

  // Filter + search
  const filtered = useMemo(() => {
    let list = games;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => g.title.toLowerCase().includes(q));
    }
    if (filter === "Custom") {
      list = list.filter(g => g.game_id in overrides);
    } else if (filter === "Needs Art") {
      list = list.filter(g => !(g.game_id in overrides));
    }
    return list;
  }, [games, search, filter, overrides]);

  function selectGame(g) {
    setSelected(g);
    setNewUrl(overrides[g.game_id] || "");
    setPreviewUrl("");
    setMsg("");
  }

  async function handleSave() {
    if (!selected || !newUrl) return;
    setSaving(true);
    setMsg("");
    try {
      await saveCoverArtOverride(selected.game_id, newUrl);
      setOverrides(prev => ({ ...prev, [selected.game_id]: newUrl }));
      setMsg("Saved!");
      setPreviewUrl("");
    } catch (e) {
      setMsg("Error: " + e.message);
    }
    setSaving(false);
  }

  async function handleRemove() {
    if (!selected) return;
    setSaving(true);
    setMsg("");
    try {
      await deleteCoverArtOverride(selected.game_id);
      setOverrides(prev => {
        const next = { ...prev };
        delete next[selected.game_id];
        return next;
      });
      setNewUrl("");
      setPreviewUrl("");
      setMsg("Override removed");
    } catch (e) {
      setMsg("Error: " + e.message);
    }
    setSaving(false);
  }

  if (!isSuperAdmin) {
    return <div style={styles.page}><p style={{ color: "#e94560" }}>Super admin access required.</p></div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Cover Art Manager</h1>
      <p style={styles.tip}>
        Use BGG image URLs (cf.geekdo-images.com). Right-click box art on BGG &rarr; Copy image address.
      </p>

      {/* Search + filters */}
      <div style={styles.toolbar}>
        <input
          style={styles.search}
          placeholder="Search games..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={styles.filterRow}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={filter === f ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
            >
              {f}
            </button>
          ))}
          <span style={styles.count}>{filtered.length} games</span>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Game grid */}
        <div style={styles.grid}>
          {filtered.map(g => (
            <div
              key={g.game_id}
              onClick={() => selectGame(g)}
              style={selected?.game_id === g.game_id ? { ...styles.card, ...styles.cardSelected } : styles.card}
            >
              <GameThumb gameId={g.game_id} overrideUrl={overrides[g.game_id]} />
              {g.game_id in overrides && <span style={styles.badge}>CUSTOM</span>}
              <div style={styles.cardTitle}>{g.title}</div>
            </div>
          ))}
        </div>

        {/* Editor panel */}
        {selected && (
          <div style={styles.editor}>
            <h2 style={styles.h2}>{selected.title}</h2>
            <div style={styles.sideBySide}>
              <div style={styles.imgCol}>
                <div style={styles.imgLabel}>Current</div>
                <img
                  src={overrides[selected.game_id] || `${API_BASE}/api/images/${selected.game_id}.jpg`}
                  alt="Current"
                  style={styles.previewImg}
                  onError={e => { e.target.src = ""; e.target.alt = "No image"; }}
                />
              </div>
              <div style={styles.imgCol}>
                <div style={styles.imgLabel}>Preview</div>
                {previewUrl
                  ? <img src={previewUrl} alt="Preview" style={styles.previewImg} onError={e => { e.target.alt = "Load failed"; }} />
                  : <div style={styles.placeholder}>Paste URL & click Preview</div>
                }
              </div>
            </div>
            <input
              style={styles.urlInput}
              placeholder="https://cf.geekdo-images.com/..."
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
            />
            <div style={styles.btnRow}>
              <button style={styles.btn} onClick={() => setPreviewUrl(newUrl)} disabled={!newUrl}>
                Preview
              </button>
              <button style={{ ...styles.btn, ...styles.btnSave }} onClick={handleSave} disabled={saving || !newUrl}>
                {saving ? "Saving..." : "Save Override"}
              </button>
              {selected.game_id in overrides && (
                <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={handleRemove} disabled={saving}>
                  Remove Override
                </button>
              )}
            </div>
            {msg && <div style={styles.msg}>{msg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function GameThumb({ gameId, overrideUrl }) {
  const [src, setSrc] = useState(overrideUrl || `${API_BASE}/api/images/${gameId}.jpg`);
  useEffect(() => {
    setSrc(overrideUrl || `${API_BASE}/api/images/${gameId}.jpg`);
  }, [overrideUrl, gameId]);
  return (
    <img
      src={src}
      alt={gameId}
      style={styles.thumb}
      onError={() => setSrc(`${API_BASE}/api/images/${gameId}.png`)}
    />
  );
}

const styles = {
  page: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 16px 80px",
    fontFamily: "'DM Sans', sans-serif",
    color: "#e0e0e0",
    minHeight: "100vh",
  },
  h1: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "1.6rem",
    marginBottom: 4,
  },
  h2: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "1.2rem",
    marginBottom: 12,
  },
  tip: {
    fontSize: "0.8rem",
    color: "#64748b",
    marginBottom: 16,
  },
  toolbar: {
    marginBottom: 16,
  },
  search: {
    width: "100%",
    maxWidth: 400,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #2a3a5c",
    background: "#1e2a45",
    color: "#e0e0e0",
    fontSize: "0.9rem",
    marginBottom: 8,
    outline: "none",
  },
  filterRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "4px 14px",
    borderRadius: 16,
    border: "1px solid #2a3a5c",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  filterActive: {
    background: "#e94560",
    color: "#fff",
    borderColor: "#e94560",
  },
  count: {
    fontSize: "0.8rem",
    color: "#64748b",
    marginLeft: 8,
  },
  layout: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  card: {
    position: "relative",
    background: "#1e2a45",
    borderRadius: 8,
    padding: 6,
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "border-color 0.15s",
  },
  cardSelected: {
    borderColor: "#e94560",
  },
  thumb: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover",
    borderRadius: 6,
    background: "#0f172a",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "#22c55e",
    color: "#000",
    fontSize: "0.6rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: "0.7rem",
    marginTop: 4,
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#94a3b8",
  },
  editor: {
    width: 380,
    flexShrink: 0,
    background: "#1e2a45",
    borderRadius: 12,
    padding: 16,
    position: "sticky",
    top: 16,
  },
  sideBySide: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
  },
  imgCol: {
    flex: 1,
    textAlign: "center",
  },
  imgLabel: {
    fontSize: "0.7rem",
    color: "#64748b",
    marginBottom: 4,
  },
  previewImg: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover",
    borderRadius: 6,
    background: "#0f172a",
  },
  placeholder: {
    width: "100%",
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    borderRadius: 6,
    fontSize: "0.7rem",
    color: "#475569",
  },
  urlInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #2a3a5c",
    background: "#0f172a",
    color: "#e0e0e0",
    fontSize: "0.8rem",
    marginBottom: 10,
    outline: "none",
    boxSizing: "border-box",
  },
  btnRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  btn: {
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    background: "#334155",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  btnSave: {
    background: "#22c55e",
    color: "#000",
    fontWeight: 600,
  },
  btnDanger: {
    background: "#ef4444",
    color: "#fff",
  },
  msg: {
    marginTop: 8,
    fontSize: "0.8rem",
    color: "#22c55e",
  },
};
