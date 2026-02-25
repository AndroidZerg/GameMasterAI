import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PUBLIC_ITEMS = [
  { path: "/", label: "Home", icon: "\u{1F3E0}" },
  { path: "/games", label: "Games", icon: "\u{1F3B2}" },
  { path: "/join", label: "Join a Game", icon: "\u{1F91D}" },
  { path: "/menu", label: "Menu", icon: "\u{1F354}" },
];

const ADMIN_ITEMS = [
  { path: "/admin/stats", label: "Dashboard", icon: "\u{1F4CA}" },
  { path: "/admin/qr", label: "QR Codes", icon: "\u{1F4F1}" },
  { path: "/admin/settings", label: "Venue Settings", icon: "\u2699\uFE0F" },
  { path: "/admin/collection", label: "Game Collection", icon: "\u{1F3AE}" },
  { path: "/admin/customize", label: "Customize Home", icon: "\u2728" },
  { path: "/admin/feedback", label: "Feedback", icon: "\u{1F4DD}" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, venueName, logout } = useAuth();

  // Hide hamburger menu entirely for non-admin users
  if (!isLoggedIn) return null;

  // Hide hamburger menu on all game pages (/game/*)
  if (location.pathname.startsWith("/game/")) return null;

  const handleNavigate = (path) => {
    navigate(path);
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Close on swipe left
  useEffect(() => {
    if (!open) return;
    let startX = 0;
    const handleTouchStart = (e) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -60) setOpen(false);
    };
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (path) => location.pathname === path;

  const menuItemStyle = (path) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 20px",
    fontSize: "1rem",
    cursor: "pointer",
    borderRadius: "10px",
    background: isActive(path) ? "var(--accent)" : "transparent",
    color: isActive(path) ? "#fff" : "var(--text-primary)",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontWeight: isActive(path) ? 600 : 400,
    transition: "background 0.15s",
    minHeight: "44px",
  });

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: 1001,
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontSize: "1.3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
        }}
      >
        ☰
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1999,
            transition: "opacity 0.2s",
          }}
        />
      )}

      {/* Drawer */}
      <nav
        aria-label="Main navigation"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "280px",
          maxWidth: "85vw",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          zIndex: 2000,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease-in-out",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          overflowY: "auto",
        }}
      >
        {/* Venue header */}
        <div style={{ padding: "8px 8px 20px", borderBottom: "1px solid var(--border)", marginBottom: "12px" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)" }}>GameMaster AI</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {isLoggedIn && venueName ? venueName : "Board Game Teaching"}
          </div>
        </div>

        {/* Public items */}
        <div style={{ marginBottom: "8px" }}>
          {PUBLIC_ITEMS.map((item) => (
            <button key={item.path} onClick={() => handleNavigate(item.path)} style={menuItemStyle(item.path)}>
              <span style={{ fontSize: "1.1rem", width: "24px", textAlign: "center" }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Admin items */}
        {isLoggedIn && (
          <>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 20px 4px", marginTop: "4px" }}>
              Admin
            </div>
            {ADMIN_ITEMS.map((item) => (
              <button key={item.path} onClick={() => handleNavigate(item.path)} style={menuItemStyle(item.path)}>
                <span style={{ fontSize: "1.1rem", width: "24px", textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={handleLogout}
              style={{
                ...menuItemStyle("/logout"),
                color: "var(--accent-dark)",
                marginTop: "12px",
                borderTop: "1px solid var(--border)",
                borderRadius: "0 0 10px 10px",
                paddingTop: "16px",
              }}
            >
              <span style={{ fontSize: "1.1rem", width: "24px", textAlign: "center" }}>{"\u{1F6AA}"}</span>
              <span>Logout</span>
            </button>
          </>
        )}

        {!isLoggedIn && (
          <>
            <div style={{ flex: 1 }} />
            <button onClick={() => handleNavigate("/login")} style={menuItemStyle("/login")}>
              <span style={{ fontSize: "1.1rem", width: "24px", textAlign: "center" }}>{"\u{1F511}"}</span>
              <span>Venue Login</span>
            </button>
          </>
        )}
      </nav>
    </>
  );
}
