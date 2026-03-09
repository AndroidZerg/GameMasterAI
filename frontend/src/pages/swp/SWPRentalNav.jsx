import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { THEME } from "./swpTheme";
import { API_BASE } from "../../services/api";

const STRIPE_LINK = "https://buy.stripe.com/test_4gMcMY3UhfAj6ri96S5Vu00";
const SWP_LOGO = `${API_BASE}/api/images/swp-logo.avif`;

export default function SWPRentalNav({ subscriberName }) {
  const location = useLocation();
  const isSubscriber = !!localStorage.getItem("swp_rental_customer");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuItems = [];
  if (!isSubscriber) {
    menuItems.push({ label: "Sign Up", to: "/swp/rentals-sign-up" });
  }
  menuItems.push({ label: "Browse Games", to: "/swp/rentals/browse" });
  if (isSubscriber) {
    menuItems.push({ label: "My Rentals", to: "/swp/rentals/profile" });
  }
  if (!isSubscriber) {
    menuItems.push({ label: "Subscribe", href: STRIPE_LINK });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: THEME.cardBg,
      borderBottom: `1px solid ${THEME.cardBorder}`,
      padding: "0 16px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: THEME.fontBody,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Left: logo */}
      <Link to="/swp/rentals-sign-up" style={{
        textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
        flexShrink: 0,
      }}>
        <img
          src={SWP_LOGO}
          alt="Shall We Play?"
          style={{ height: 34, width: "auto", borderRadius: 6 }}
        />
      </Link>

      {/* Center: dropdown menu */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "none",
            border: `1.5px solid ${open ? THEME.primary : "#ddd"}`,
            borderRadius: 10,
            padding: "7px 16px",
            fontSize: 14,
            fontWeight: 600,
            color: open ? THEME.primary : THEME.text,
            cursor: "pointer",
            fontFamily: THEME.fontBody,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s",
          }}
        >
          Menu
          <span style={{
            fontSize: 10,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}>&#9660;</span>
        </button>

        {open && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            border: `1px solid ${THEME.cardBorder}`,
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            minWidth: 200,
            padding: "8px 0",
            zIndex: 200,
          }}>
            {menuItems.map((item) => {
              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{
                      display: "block",
                      padding: "12px 20px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: THEME.primary,
                      textDecoration: "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {item.label} &rarr;
                  </a>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  style={{
                    display: "block",
                    padding: "12px 20px",
                    fontSize: 15,
                    fontWeight: isActive(item.to) ? 700 : 500,
                    color: isActive(item.to) ? THEME.primary : THEME.text,
                    textDecoration: "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: profile icon (subscribers only) */}
      <div style={{ width: 34, flexShrink: 0 }}>
        {isSubscriber && (
          <Link to="/swp/rentals/profile" style={{ textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: THEME.primary, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>
              {subscriberName ? subscriberName.charAt(0).toUpperCase() : "?"}
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
}
