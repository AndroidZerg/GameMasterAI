import { Link, useLocation } from "react-router-dom";
import { THEME } from "./swpTheme";

export default function SWPRentalNav({ subscriberName }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: THEME.cardBg,
      borderBottom: `1px solid ${THEME.cardBorder}`,
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: THEME.fontBody,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Left: brand */}
      <Link to="/swp/rentals" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: THEME.fontHeading, fontWeight: 700, fontSize: 18, color: THEME.text }}>
          Shall We Play?
        </span>
        <span style={{
          background: THEME.primary,
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 6,
          letterSpacing: 1,
        }}>
          RENTALS
        </span>
      </Link>

      {/* Center: nav links */}
      <div style={{ display: "flex", gap: 24 }}>
        <Link
          to="/swp/rentals/browse"
          style={{
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 15,
            color: isActive("/swp/rentals/browse") ? THEME.primary : THEME.textSecondary,
            borderBottom: isActive("/swp/rentals/browse") ? `2px solid ${THEME.primary}` : "2px solid transparent",
            paddingBottom: 2,
          }}
        >
          Browse
        </Link>
        <Link
          to="/swp/rentals/profile"
          style={{
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 15,
            color: isActive("/swp/rentals/profile") ? THEME.primary : THEME.textSecondary,
            borderBottom: isActive("/swp/rentals/profile") ? `2px solid ${THEME.primary}` : "2px solid transparent",
            paddingBottom: 2,
          }}
        >
          My Rentals
        </Link>
      </div>

      {/* Right: profile */}
      <Link to="/swp/rentals/profile" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: THEME.primary, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700,
        }}>
          {subscriberName ? subscriberName.charAt(0).toUpperCase() : "?"}
        </div>
      </Link>
    </nav>
  );
}
