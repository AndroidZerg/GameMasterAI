import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../../services/api";
import { formatPrice } from "../../utils/format";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const card = {
  background: "var(--bg-card, #1e2a45)",
  borderRadius: "12px",
  padding: "16px",
  border: "1px solid var(--border, #2a3a5c)",
};

function Toggle({ label, active, color, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        border: "none",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? (color || "var(--accent, #e94560)") : "var(--bg-secondary, #16213e)",
        color: active ? "#fff" : "var(--text-secondary, #a0a0a0)",
      }}
    >
      {label}
    </button>
  );
}

export default function MenuTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [addingItem, setAddingItem] = useState(null); // category_id
  const [addingCategory, setAddingCategory] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", price_dollars: "" });
  const [newCategory, setNewCategory] = useState({ name: "", sort_order: 0 });

  const loadMenu = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/venue/menu`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const cats = Array.isArray(d) ? d : [];
        setCategories(cats);
        // Auto-expand all
        const exp = {};
        cats.forEach((c) => { exp[c.id] = true; });
        setExpanded(exp);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const patchItem = async (itemId, updates) => {
    try {
      await fetch(`${API_BASE}/api/v1/venue/menu/items/${itemId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      loadMenu();
    } catch {}
  };

  const deleteItem = async (itemId) => {
    try {
      await fetch(`${API_BASE}/api/v1/venue/menu/items/${itemId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      loadMenu();
    } catch {}
  };

  const submitNewItem = async (categoryId) => {
    if (!newItem.name.trim()) return;
    try {
      await fetch(`${API_BASE}/api/v1/venue/menu/categories/${categoryId}/items`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description,
          price_dollars: parseFloat(newItem.price_dollars) || 0,
          is_available: true,
        }),
      });
      setAddingItem(null);
      setNewItem({ name: "", description: "", price_dollars: "" });
      loadMenu();
    } catch {}
  };

  const submitNewCategory = async () => {
    if (!newCategory.name.trim()) return;
    try {
      await fetch(`${API_BASE}/api/v1/venue/menu/categories`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      setAddingCategory(false);
      setNewCategory({ name: "", sort_order: 0 });
      loadMenu();
    } catch {}
  };

  if (loading) return <p style={{ color: "#a0a0a0", padding: 20 }}>Loading menu...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {categories.map((cat) => (
        <div key={cat.id} style={card}>
          <button
            onClick={() => setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              color: "var(--text-primary, #e0e0e0)",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {expanded[cat.id] ? "▾" : "▸"} {cat.name}
            <span style={{ fontSize: 12, color: "var(--text-secondary, #a0a0a0)", marginLeft: 8 }}>
              ({cat.items.length} items)
            </span>
          </button>

          {expanded[cat.id] && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "var(--bg-secondary, #16213e)",
                    borderRadius: 8,
                    opacity: item.is_available ? 1 : 0.5,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #e0e0e0)" }}>
                      {item.name}
                      <span style={{ fontSize: 13, fontWeight: 400, color: "var(--accent, #e94560)", marginLeft: 8 }}>
                        {formatPrice(item.price_cents)}
                      </span>
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary, #a0a0a0)", marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <Toggle
                    label="Avail"
                    active={item.is_available}
                    color="#2ecc71"
                    onToggle={() => patchItem(item.id, { is_available: !item.is_available })}
                  />
                  <Toggle
                    label="86"
                    active={item.is_eighty_sixed}
                    color="#e74c3c"
                    onToggle={() => patchItem(item.id, { is_eighty_sixed: !item.is_eighty_sixed })}
                  />
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary, #a0a0a0)",
                      cursor: "pointer",
                      fontSize: 16,
                      padding: "2px 6px",
                    }}
                    title="Delete item"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add item form */}
              {addingItem === cat.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px", background: "var(--bg-secondary, #16213e)", borderRadius: 8 }}>
                  <input
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border, #2a3a5c)", background: "var(--bg-card, #1e2a45)", color: "var(--text-primary, #e0e0e0)", fontSize: 13 }}
                  />
                  <input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border, #2a3a5c)", background: "var(--bg-card, #1e2a45)", color: "var(--text-primary, #e0e0e0)", fontSize: 13 }}
                  />
                  <input
                    placeholder="Price (dollars)"
                    type="number"
                    step="0.01"
                    value={newItem.price_dollars}
                    onChange={(e) => setNewItem((p) => ({ ...p, price_dollars: e.target.value }))}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border, #2a3a5c)", background: "var(--bg-card, #1e2a45)", color: "var(--text-primary, #e0e0e0)", fontSize: 13, width: 120 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => submitNewItem(cat.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--accent, #e94560)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      Add
                    </button>
                    <button onClick={() => setAddingItem(null)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--bg-card, #1e2a45)", color: "var(--text-secondary, #a0a0a0)", cursor: "pointer", fontSize: 13 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingItem(cat.id); setNewItem({ name: "", description: "", price_dollars: "" }); }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px dashed var(--border, #2a3a5c)",
                    background: "none",
                    color: "var(--text-secondary, #a0a0a0)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  + Add Item
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add category */}
      {addingCategory ? (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            placeholder="Category name"
            value={newCategory.name}
            onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #2a3a5c)", background: "var(--bg-secondary, #16213e)", color: "var(--text-primary, #e0e0e0)", fontSize: 14 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submitNewCategory} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent, #e94560)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              Add Category
            </button>
            <button onClick={() => setAddingCategory(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--bg-card, #1e2a45)", color: "var(--text-secondary, #a0a0a0)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingCategory(true)}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px dashed var(--border, #2a3a5c)",
            background: "none",
            color: "var(--text-secondary, #a0a0a0)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          + Add Category
        </button>
      )}

      {categories.length === 0 && !addingCategory && (
        <p style={{ color: "var(--text-secondary, #a0a0a0)", textAlign: "center", padding: 40 }}>
          No menu categories yet. Add one to get started.
        </p>
      )}
    </div>
  );
}
