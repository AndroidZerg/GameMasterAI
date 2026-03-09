import { Link, useLocation } from "react-router-dom";
import { THEME } from "./swpTheme";

const STRIPE_LINK = "https://buy.stripe.com/3cI6oA4Yldsb5ne5UG5Vu01";

export default function SWPRentalNav({ subscriberName }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const isSubscriber = !!localStorage.getItem("swp_rental_customer");

  return (
    <nav style={{
      background: THEME.cardBg,
      borderBottom: `1px solid ${THEME.cardBorder}`,
      padding: "0 24px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: THEME.fontBody,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Left: brand + badge */}
      <Link to="/swp/rentals" style={{
        textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: THEME.fontHeading, fontWeight: 700, fontSize: 16, color: THEME.text }}>
          Shall We Play?
        </span>
        <span style={{
          background: THEME.primary, color: "#fff",
          fontSize: 9, fontWeight: 700, padding: "2px 7px",
          borderRadius: 6, letterSpacing: 0.8,
        }}>
          RENTALS
        </span>
      </Link>

      {/* Right: nav links + profile/subscribe */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <Link
          to="/swp/rentals/browse"
          style={{
            textDecoration: "none", fontWeight: 600, fontSize: 14,
            color: isActive("/swp/rentals/browse") ? THEME.primary : THEME.textSecondary,
            borderBottom: isActive("/swp/rentals/browse") ? `2px solid ${THEME.primary}` : "2px solid transparent",
            paddingBottom: 2,
          }}
        >
          Browse
        </Link>
        {isSubscriber && (
          <Link
            to="/swp/rentals/profile"
            style={{
              textDecoration: "none", fontWeight: 600, fontSize: 14,
              color: isActive("/swp/rentals/profile") ? THEME.primary : THEME.textSecondary,
              borderBottom: isActive("/swp/rentals/profile") ? `2px solid ${THEME.primary}` : "2px solid transparent",
              paddingBottom: 2,
            }}
          >
            My Rentals
          </Link>
        )}
        {isSubscriber ? (
          <Link to="/swp/rentals/profile" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: THEME.primary, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>
              {subscriberName ? subscriberName.charAt(0).toUpperCase() : "?"}
            </div>
          </Link>
        ) : (
          <a href={STRIPE_LINK} style={{
            background: THEME.primary, color: "#fff",
            fontSize: 13, fontWeight: 700, padding: "7px 16px",
            borderRadius: 20, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            $9.99/mo
          </a>
        )}
      </div>
    </nav>
  );
}
