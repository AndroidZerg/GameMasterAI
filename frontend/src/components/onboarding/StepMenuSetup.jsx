import { useState } from "react";

const DEFAULT_CATEGORIES = ["Hot Drinks", "Cold Drinks", "Food", "Beer & Wine"];

function newItem() {
  return { name: "", description: "", price_dollars: "", is_available: true };
}

export default function StepMenuSetup({ savedMenu, onSave }) {
  const [categories, setCategories] = useState(() => {
    if (savedMenu && savedMenu.length > 0) return savedMenu;
    return DEFAULT_CATEGORIES.map(name => ({ name, items: [], open: true }));
  });
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const updateCat = (idx, updates) => {
    const next = [...categories];
    next[idx] = { ...next[idx], ...updates };
    setCategories(next);
  };

  const removeCat = (idx) => setCategories(categories.filter((_, i) => i !== idx));

  const addCategory = () => {
    if (!newCatName.trim()) return;
    setCategories([...categories, { name: newCatName.trim(), items: [], open: true }]);
    setNewCatName("");
  };

  const addItem = (catIdx) => {
    const next = [...categories];
    next[catIdx] = { ...next[catIdx], items: [...next[catIdx].items, newItem()] };
    setCategories(next);
  };

  const updateItem = (catIdx, itemIdx, updates) => {
    const next = [...categories];
    const items = [...next[catIdx].items];
    items[itemIdx] = { ...items[itemIdx], ...updates };
    next[catIdx] = { ...next[catIdx], items };
    setCategories(next);
  };

  const removeItem = (catIdx, itemIdx) => {
    const next = [...categories];
    next[catIdx] = { ...next[catIdx], items: next[catIdx].items.filter((_, i) => i !== itemIdx) };
    setCategories(next);
  };

  const toggleOpen = (idx) => updateCat(idx, { open: !categories[idx].open });

  const handleSave = async () => {
    setSaving(true);
    const payload = categories.map(c => ({
      name: c.name,
      items: c.items
        .filter(it => it.name.trim())
        .map(it => ({
          name: it.name,
          description: it.description || "",
          price_dollars: parseFloat(it.price_dollars) || 0,
          is_available: it.is_available,
        })),
    })).filter(c => c.items.length > 0);
    await onSave({ categories: payload });
    setSaving(false);
  };

  const inputStyle = {
    padding: "8px 10px", background: "#1a2332", border: "1px solid #2a3a4a",
    borderRadius: 6, color: "#fff", fontSize: 14, outline: "none",
  };

  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>Menu Setup</h2>
      <p style={{ color: "#8899aa", marginBottom: 20, fontSize: 14 }}>
        Build your food and drink menu. Prices are in dollars.
      </p>

      {categories.map((cat, ci) => (
        <div key={ci} style={{
          background: "#152030", borderRadius: 10, marginBottom: 12,
          border: "1px solid #2a3a4a", overflow: "hidden",
        }}>
          <div
            onClick={() => toggleOpen(ci)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", cursor: "pointer", background: "#1a2838",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 600 }}>{cat.name} ({cat.items.length} items)</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={e => { e.stopPropagation(); removeCat(ci); }} style={{
                background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: 14,
              }}>Remove</button>
              <span style={{ color: "#666" }}>{cat.open ? "▲" : "▼"}</span>
            </div>
          </div>

          {cat.open && (
            <div style={{ padding: 16 }}>
              {cat.items.map((item, ii) => (
                <div key={ii} style={{
                  display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap",
                }}>
                  <input
                    placeholder="Item name" value={item.name}
                    onChange={e => updateItem(ci, ii, { name: e.target.value })}
                    style={{ ...inputStyle, flex: 2, minWidth: 120 }}
                  />
                  <input
                    placeholder="Description" value={item.description}
                    onChange={e => updateItem(ci, ii, { description: e.target.value })}
                    style={{ ...inputStyle, flex: 2, minWidth: 100 }}
                  />
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#888", marginRight: 4 }}>$</span>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={item.price_dollars}
                      onChange={e => updateItem(ci, ii, { price_dollars: e.target.value })}
                      style={{ ...inputStyle, width: 80 }}
                    />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={item.is_available}
                      onChange={e => updateItem(ci, ii, { is_available: e.target.checked })} />
                    <span style={{ color: "#888", fontSize: 12 }}>Avail</span>
                  </label>
                  <button onClick={() => removeItem(ci, ii)} style={{
                    background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: 18, padding: "0 4px",
                  }}>×</button>
                </div>
              ))}
              <button onClick={() => addItem(ci)} style={{
                padding: "8px 16px", background: "transparent", color: "#3498db",
                border: "1px dashed #3498db", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%",
              }}>
                + Add Item
              </button>
            </div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={newCatName} onChange={e => setNewCatName(e.target.value)}
          placeholder="New category name..."
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCategory())}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={addCategory} disabled={!newCatName.trim()} style={{
          padding: "8px 16px", background: "#2a3a4a", color: "#fff",
          border: "none", borderRadius: 6, cursor: "pointer",
          opacity: newCatName.trim() ? 1 : 0.5,
        }}>
          Add Category
        </button>
      </div>

      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", padding: "14px", background: "#e94560",
        color: "#fff", border: "none", borderRadius: 8, fontSize: 16,
        fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
      }}>
        {saving ? "Saving..." : "Save Menu & Continue"}
      </button>
    </div>
  );
}
