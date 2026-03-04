import { useState, useMemo } from "react";

/**
 * AppendixTab — searchable reference lookup for game terms.
 * Displays entries as expandable cards filtered by search and category.
 */
export default function AppendixTab({ entries }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedTerm, setExpandedTerm] = useState(null);

  if (!entries || entries.length === 0) {
    return (
      <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
        No appendix content available for this game.
      </div>
    );
  }

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category).filter(Boolean));
    return ["All", ...Array.from(cats).sort()];
  }, [entries]);

  // Filter entries
  const filtered = useMemo(() => {
    let result = entries;
    if (activeCategory !== "All") {
      result = result.filter((e) => e.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.term.toLowerCase().includes(q) ||
          e.definition.toLowerCase().includes(q) ||
          (e.related_birds || []).some((b) => b.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, activeCategory, search]);

  return (
    <div style={{ padding: "4px 0" }}>
      {/* Search bar */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search terms..."
        aria-label="Search appendix"
        style={{
          width: "100%",
          padding: "10px 14px",
          fontSize: "0.95rem",
          borderRadius: "10px",
          border: "2px solid var(--border)",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          outline: "none",
          boxSizing: "border-box",
          marginBottom: "10px",
        }}
      />

      {/* Category filter pills */}
      {categories.length > 2 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "5px 14px",
                borderRadius: "999px",
                border: activeCategory === cat ? "2px solid var(--accent)" : "2px solid var(--border)",
                background: activeCategory === cat ? "var(--accent)" : "var(--bg-primary)",
                color: "#fff",
                fontWeight: activeCategory === cat ? 700 : 400,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {search.trim() && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Entry cards */}
      {filtered.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
          No matching entries found.
        </div>
      ) : (
        filtered.map((entry) => {
          const isOpen = expandedTerm === entry.term;
          return (
            <div
              key={entry.term}
              style={{
                marginBottom: "6px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setExpandedTerm(isOpen ? null : entry.term)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  background: isOpen ? "var(--bg-card)" : "var(--bg-primary)",
                  color: "var(--text-primary)",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  gap: "8px",
                }}
              >
                <span>{entry.term}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {entry.category && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {entry.category}
                    </span>
                  )}
                  <span
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      fontSize: "0.7rem",
                    }}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                    color: "var(--text-primary)",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0" }}>{entry.definition}</p>
                  {entry.related_birds && entry.related_birds.length > 0 && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong>Related:</strong> {entry.related_birds.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
