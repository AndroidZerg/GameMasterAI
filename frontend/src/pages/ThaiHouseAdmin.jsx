import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem,
  uploadMenuPhoto, deleteMenuPhoto, getToggles, createToggle, updateToggle, deleteToggle,
} from "../services/api";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", muted: "#a89880", danger: "#e74c3c", success: "#27ae60",
};

export default function ThaiHouseAdmin() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("items"); // "items" | "toggles"
  const [categories, setCategories] = useState([]);
  const [toggles, setToggles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const data = await getMenuItems(pin);
      setCategories(data.categories);
      setToggles(data.toggles || []);
      setAuthed(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const refresh = useCallback(async () => {
    try {
      const data = await getMenuItems(pin);
      setCategories(data.categories);
      setToggles(data.toggles || []);
    } catch {}
  }, [pin]);

  if (!authed) {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 380, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ color: THEME.accent, fontSize: 24, marginBottom: 24 }}>Thai House Admin</h1>
          <form onSubmit={handleAuth}>
            <input type="password" placeholder="Staff PIN" value={pin}
              onChange={(e) => setPin(e.target.value)} style={S.pinInput} autoFocus />
            <button type="submit" disabled={loading}
              style={{ ...S.btn, width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Verifying..." : "Enter"}
            </button>
            {error && <p style={{ color: THEME.danger, marginTop: 12, fontSize: 14 }}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ color: THEME.accent, fontSize: 22, margin: 0 }}>Thai House Menu Manager</h1>
          <Link to="/thaihouse" style={{ color: THEME.muted, fontSize: 13, textDecoration: "none" }}>Back to Menu</Link>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["items", "Menu Items"], ["toggles", "Toggles"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ ...S.tabBtn, ...(tab === id ? S.tabActive : {}) }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "items" && (
          <MenuItemsTab categories={categories} toggles={toggles} pin={pin} refresh={refresh} />
        )}
        {tab === "toggles" && (
          <TogglesTab toggles={toggles} pin={pin} refresh={refresh} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MENU ITEMS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function MenuItemsTab({ categories, toggles, pin, refresh }) {
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState(null);
  const [editItem, setEditItem] = useState(null);   // item being edited
  const [addingTo, setAddingTo] = useState(null);    // category name for new item
  const [uploading, setUploading] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const fileRef = useRef(null);
  const [uploadSlug, setUploadSlug] = useState(null);

  const filtered = search.trim()
    ? categories.map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
      })).filter((cat) => cat.items.length > 0)
    : categories;

  const handleUploadClick = (slug) => { setUploadSlug(slug); fileRef.current?.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadSlug) return;
    setUploading(uploadSlug);
    try { await uploadMenuPhoto(uploadSlug, file, pin); await refresh(); }
    catch (err) { alert("Upload failed: " + err.message); }
    finally { setUploading(null); setUploadSlug(null); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleDeletePhoto = async (slug) => {
    try { await deleteMenuPhoto(slug, pin); await refresh(); }
    catch (err) { alert("Delete photo failed: " + err.message); }
  };

  const handleDeleteItem = async (slug) => {
    try { await deleteMenuItem(pin, slug); setConfirmDel(null); await refresh(); }
    catch (err) { alert("Delete failed: " + err.message); }
  };

  return (
    <>
      {/* Search */}
      <input type="text" placeholder="Search items..." value={search}
        onChange={(e) => setSearch(e.target.value)} style={S.searchInput} />

      <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }}
        onChange={handleFileChange} />

      {/* Edit / Add Modal */}
      {(editItem || addingTo) && (
        <ItemFormModal
          item={editItem}
          category={addingTo || null}
          categories={categories}
          toggles={toggles}
          pin={pin}
          onClose={() => { setEditItem(null); setAddingTo(null); }}
          onSaved={() => { setEditItem(null); setAddingTo(null); refresh(); }}
        />
      )}

      {/* Categories */}
      {filtered.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 12 }}>
          <button onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
            style={S.catHeader}>
            <span>{cat.icon} {cat.name} ({cat.items.length})</span>
            <span style={{ fontSize: 12, color: THEME.muted }}>
              {cat.items.filter((i) => i.has_photo).length} photos
            </span>
          </button>

          {(expandedCat === cat.name || search.trim()) && (
            <div style={{ padding: "4px 0" }}>
              {cat.items.map((item) => (
                <div key={item.slug} style={S.itemRow}>
                  {/* Thumb */}
                  <div style={S.thumbBox}>
                    {item.has_photo ? (
                      <img src={`${API_BASE}/api/images/menu/${item.slug}-thumb.jpg?t=${Date.now()}`}
                        alt="" style={S.thumb} />
                    ) : (
                      <div style={S.noThumb}>--</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: THEME.text, fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                    <div style={{ color: THEME.muted, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.description}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ color: THEME.accent, fontSize: 13, fontWeight: 700 }}>${item.price.toFixed(2)}</span>
                      {item.toggles.map((tid) => (
                        <span key={tid} style={S.toggleBadge}>{tid}</span>
                      ))}
                      {item.allows_modifications && <span style={{ ...S.toggleBadge, background: "#27ae6020", color: THEME.success }}>notes</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleUploadClick(item.slug)}
                      disabled={uploading === item.slug} style={S.smallBtn}>
                      {uploading === item.slug ? "..." : "Img"}
                    </button>
                    {item.has_photo && (
                      <button onClick={() => handleDeletePhoto(item.slug)}
                        style={{ ...S.smallBtn, color: THEME.danger, borderColor: THEME.danger + "40" }}>
                        -Img
                      </button>
                    )}
                    <button onClick={() => setEditItem(item)} style={S.smallBtn}>Edit</button>
                    {confirmDel === item.slug ? (
                      <>
                        <button onClick={() => handleDeleteItem(item.slug)}
                          style={{ ...S.smallBtn, color: THEME.danger, borderColor: THEME.danger }}>Yes</button>
                        <button onClick={() => setConfirmDel(null)} style={S.smallBtn}>No</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDel(item.slug)}
                        style={{ ...S.smallBtn, color: THEME.danger, borderColor: THEME.danger + "40" }}>Del</button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Item Button */}
              <button onClick={() => setAddingTo(cat.name)}
                style={{ ...S.smallBtn, width: "100%", marginTop: 4, padding: "10px 0" }}>
                + Add Item to {cat.name}
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* ── Item Edit/Add Form Modal ── */

function ItemFormModal({ item, category, categories, toggles, pin, onClose, onSaved }) {
  const isNew = !item;
  const [name, setName] = useState(item?.name || "");
  const [desc, setDesc] = useState(item?.description || "");
  const [price, setPrice] = useState(item?.price?.toString() || "");
  const [selectedToggles, setSelectedToggles] = useState(item?.toggles || []);
  const [allowsMods, setAllowsMods] = useState(item?.allows_modifications || false);
  const [cat, setCat] = useState(category || categories[0]?.name || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const toggleToggle = (tid) => {
    setSelectedToggles((prev) =>
      prev.includes(tid) ? prev.filter((t) => t !== tid) : [...prev, tid]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true); setErr(null);
    try {
      if (isNew) {
        await createMenuItem(pin, {
          category: cat,
          name: name.trim(),
          description: desc.trim(),
          price: parseFloat(price),
          toggles: selectedToggles,
          allows_modifications: allowsMods,
        });
      } else {
        await updateMenuItem(pin, item.slug, {
          name: name.trim(),
          description: desc.trim(),
          price: parseFloat(price),
          toggles: selectedToggles,
          allows_modifications: allowsMods,
        });
      }
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: THEME.accent, fontSize: 18, margin: 0 }}>
            {isNew ? "Add Item" : "Edit Item"}
          </h2>
          <button onClick={onClose} style={S.closeBtn}>&times;</button>
        </div>

        <form onSubmit={handleSave}>
          {isNew && (
            <label style={S.label}>
              Category
              <select value={cat} onChange={(e) => setCat(e.target.value)} style={S.input}>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          )}

          <label style={S.label}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} style={S.input} required />
          </label>

          <label style={S.label}>
            Description
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...S.input, height: 60, resize: "vertical" }} />
          </label>

          <label style={S.label}>
            Price ($)
            <input type="number" step="0.01" min="0" value={price}
              onChange={(e) => setPrice(e.target.value)} style={S.input} required />
          </label>

          {/* Toggle checkboxes */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: THEME.text, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Customization Toggles</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {toggles.map((t) => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 4, color: THEME.text, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedToggles.includes(t.id)}
                    onChange={() => toggleToggle(t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.text, fontSize: 13, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={allowsMods} onChange={(e) => setAllowsMods(e.target.checked)} />
            Allow special instructions (notes)
          </label>

          {err && <p style={{ color: THEME.danger, fontSize: 13, marginBottom: 8 }}>{err}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving} style={{ ...S.btn, flex: 1, opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Add Item" : "Save Changes"}
            </button>
            <button type="button" onClick={onClose} style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${THEME.muted}`, color: THEME.muted }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOGGLES TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function TogglesTab({ toggles: initialToggles, pin, refresh }) {
  const [togglesList, setTogglesList] = useState(initialToggles);
  const [editToggle, setEditToggle] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => { setTogglesList(initialToggles); }, [initialToggles]);

  const refreshToggles = async () => {
    try {
      const data = await getToggles(pin);
      setTogglesList(data.toggles);
    } catch {}
    refresh();
  };

  const handleDelete = async (tid) => {
    try { await deleteToggle(pin, tid); setConfirmDel(null); await refreshToggles(); }
    catch (err) { alert("Delete failed: " + err.message); }
  };

  return (
    <>
      <button onClick={() => setShowNew(true)} style={{ ...S.btn, marginBottom: 16, width: "100%" }}>
        + New Toggle
      </button>

      {(editToggle || showNew) && (
        <ToggleFormModal
          toggle={editToggle}
          pin={pin}
          onClose={() => { setEditToggle(null); setShowNew(false); }}
          onSaved={() => { setEditToggle(null); setShowNew(false); refreshToggles(); }}
        />
      )}

      {togglesList.map((t) => (
        <div key={t.id} style={S.toggleCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <span style={{ color: THEME.text, fontWeight: 700, fontSize: 15 }}>{t.name}</span>
              <span style={{ color: THEME.muted, fontSize: 12, marginLeft: 8 }}>({t.id})</span>
              {t.required && <span style={{ ...S.toggleBadge, marginLeft: 8, background: THEME.accent + "20", color: THEME.accent }}>required</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditToggle(t)} style={S.smallBtn}>Edit</button>
              {confirmDel === t.id ? (
                <>
                  <button onClick={() => handleDelete(t.id)}
                    style={{ ...S.smallBtn, color: THEME.danger, borderColor: THEME.danger }}>
                    Yes ({t.item_count || 0} items)
                  </button>
                  <button onClick={() => setConfirmDel(null)} style={S.smallBtn}>No</button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(t.id)}
                  style={{ ...S.smallBtn, color: THEME.danger, borderColor: THEME.danger + "40" }}>Del</button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {t.options.map((o) => (
              <span key={o.name} style={S.optionPill}>
                {o.name}{o.upcharge > 0 ? ` (+$${o.upcharge.toFixed(2)})` : ""}
              </span>
            ))}
          </div>
          <div style={{ color: THEME.muted, fontSize: 11, marginTop: 6 }}>
            Used by {t.item_count || 0} items
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Toggle Edit/Add Form Modal ── */

function ToggleFormModal({ toggle, pin, onClose, onSaved }) {
  const isNew = !toggle;
  const [name, setName] = useState(toggle?.name || "");
  const [tid, setTid] = useState(toggle?.id || "");
  const [required, setRequired] = useState(toggle?.required ?? true);
  const [options, setOptions] = useState(
    toggle?.options?.map((o) => ({ ...o })) || [{ name: "", upcharge: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // Auto-generate id from name for new toggles
  useEffect(() => {
    if (isNew && name) {
      setTid(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, isNew]);

  const updateOption = (idx, field, value) => {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const removeOption = (idx) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !tid.trim() || options.length === 0) return;
    setSaving(true); setErr(null);

    const cleanOptions = options
      .filter((o) => o.name.trim())
      .map((o) => ({ name: o.name.trim(), upcharge: parseFloat(o.upcharge) || 0 }));

    try {
      if (isNew) {
        await createToggle(pin, { id: tid, name: name.trim(), required, options: cleanOptions });
      } else {
        await updateToggle(pin, toggle.id, { name: name.trim(), required, options: cleanOptions });
      }
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: THEME.accent, fontSize: 18, margin: 0 }}>
            {isNew ? "New Toggle" : `Edit: ${toggle.name}`}
          </h2>
          <button onClick={onClose} style={S.closeBtn}>&times;</button>
        </div>

        <form onSubmit={handleSave}>
          <label style={S.label}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} style={S.input} required />
          </label>

          <label style={S.label}>
            ID {!isNew && <span style={{ color: THEME.muted }}>(read-only)</span>}
            <input value={tid} onChange={(e) => isNew && setTid(e.target.value)}
              style={{ ...S.input, opacity: isNew ? 1 : 0.5 }} readOnly={!isNew} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.text, fontSize: 13, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required (customer must select one)
          </label>

          {/* Options */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: THEME.text, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Options</div>
            {options.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input placeholder="Option name" value={o.name}
                  onChange={(e) => updateOption(i, "name", e.target.value)}
                  style={{ ...S.input, flex: 1, marginBottom: 0 }} />
                <input type="number" step="0.01" placeholder="$0" value={o.upcharge || ""}
                  onChange={(e) => updateOption(i, "upcharge", e.target.value)}
                  style={{ ...S.input, width: 70, marginBottom: 0 }} />
                <button type="button" onClick={() => removeOption(i)}
                  style={{ ...S.smallBtn, color: THEME.danger, borderColor: THEME.danger + "40" }}>X</button>
              </div>
            ))}
            <button type="button" onClick={() => setOptions([...options, { name: "", upcharge: 0 }])}
              style={{ ...S.smallBtn, width: "100%", marginTop: 4 }}>+ Add Option</button>
          </div>

          {err && <p style={{ color: THEME.danger, fontSize: 13, marginBottom: 8 }}>{err}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ ...S.btn, flex: 1, opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Toggle" : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}
              style={{ ...S.btn, flex: 1, background: "transparent", border: `1px solid ${THEME.muted}`, color: THEME.muted }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Styles ── */

const S = {
  page: { background: THEME.bg, minHeight: "100vh", color: THEME.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  pinInput: { width: "100%", padding: "14px 16px", borderRadius: 10, border: `1px solid ${THEME.muted}60`, background: THEME.card, color: THEME.text, fontSize: 18, marginBottom: 12, boxSizing: "border-box", outline: "none", textAlign: "center", letterSpacing: 4 },
  searchInput: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${THEME.muted}40`, background: THEME.card, color: THEME.text, fontSize: 14, marginBottom: 16, boxSizing: "border-box", outline: "none" },
  btn: { padding: "12px 20px", borderRadius: 10, border: "none", background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  smallBtn: { padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${THEME.accent}40`, background: "transparent", color: THEME.accent },
  tabBtn: { padding: "8px 20px", borderRadius: 8, border: `1px solid ${THEME.muted}40`, background: "transparent", color: THEME.muted, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tabActive: { background: THEME.accent, color: THEME.bg, border: `1px solid ${THEME.accent}` },
  catHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: THEME.card, borderRadius: 10, border: "none", color: THEME.text, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderBottom: `1px solid ${THEME.muted}15` },
  thumbBox: { width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0 },
  thumb: { width: "100%", height: "100%", objectFit: "cover" },
  noThumb: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: THEME.card, color: THEME.muted, fontSize: 10, borderRadius: 6 },
  toggleBadge: { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: THEME.accent + "15", color: THEME.accent },
  toggleCard: { background: THEME.card, padding: "14px 16px", borderRadius: 10, marginBottom: 10 },
  optionPill: { padding: "4px 10px", borderRadius: 6, fontSize: 12, background: THEME.bg, color: THEME.text, border: `1px solid ${THEME.muted}30` },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: THEME.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, maxHeight: "85vh", overflowY: "auto" },
  closeBtn: { background: "none", border: "none", color: THEME.muted, fontSize: 28, cursor: "pointer" },
  label: { display: "block", color: THEME.text, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  input: { display: "block", width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${THEME.muted}50`, background: THEME.bg, color: THEME.text, fontSize: 14, marginTop: 4, marginBottom: 0, boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
};
