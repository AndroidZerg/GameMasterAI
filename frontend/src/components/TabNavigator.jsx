import { useState, useRef, useEffect } from "react";

/**
 * TabNavigator — compact dropdown + arrow tab navigator.
 * Replaces the old grid of tab buttons.
 *
 * @param {{ tabs: Array<{id: string, label: string, visible?: boolean}>, activeTab: string, onTabChange: (id: string) => void }} props
 */
export default function TabNavigator({ tabs, activeTab, onTabChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const visible = tabs.filter((t) => t.visible !== false);
  const idx = visible.findIndex((t) => t.id === activeTab);
  const current = visible[idx];
  const canPrev = idx > 0;
  const canNext = idx < visible.length - 1;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: "12px",
        background: "rgba(0,0,0,0.5)",
        borderRadius: "12px",
        padding: "4px",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Left arrow */}
      <button
        onClick={() => canPrev && onTabChange(visible[idx - 1].id)}
        disabled={!canPrev}
        aria-label="Previous tab"
        style={{
          ...arrowBtn,
          opacity: canPrev ? 1 : 0.3,
          cursor: canPrev ? "pointer" : "default",
        }}
      >
        ◀
      </button>

      {/* Center dropdown trigger */}
      <div ref={ref} style={{ position: "relative", flex: 1 }}>
        <button
          onClick={() => setOpen(!open)}
          aria-label="Select tab"
          aria-expanded={open}
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>{current?.label || activeTab}</span>
          <span style={{ fontSize: "0.6rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </button>

        {/* Dropdown overlay */}
        {open && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.4)",
                zIndex: 199,
              }}
              onClick={() => setOpen(false)}
            />
            {/* Menu */}
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                overflow: "hidden",
                zIndex: 200,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                animation: "fadeIn 0.15s ease-out",
              }}
            >
              {visible.map((t) => {
                const isActive = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    onClick={() => { onTabChange(t.id); setOpen(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "14px 16px",
                      border: "none",
                      background: isActive ? "var(--accent, #e94560)" : "transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
                      fontSize: "0.95rem",
                      fontWeight: isActive ? 700 : 400,
                      cursor: "pointer",
                      textAlign: "left",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {isActive ? "● " : "  "}{t.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => canNext && onTabChange(visible[idx + 1].id)}
        disabled={!canNext}
        aria-label="Next tab"
        style={{
          ...arrowBtn,
          opacity: canNext ? 1 : 0.3,
          cursor: canNext ? "pointer" : "default",
        }}
      >
        ▶
      </button>
    </div>
  );
}

const arrowBtn = {
  minWidth: "44px",
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  borderRadius: "8px",
  fontSize: "1rem",
  cursor: "pointer",
  flexShrink: 0,
};
