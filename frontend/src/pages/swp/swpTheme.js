/** SWP Rental brand theme — shared across all /swp/rentals/* pages. */

export const THEME = {
  bg: "#faf9f6",
  text: "#2a2a2a",
  textSecondary: "#666",
  primary: "#2BA5B5",       // SWP teal
  primaryDark: "#228e9c",
  secondary: "#C1432E",     // SWP red-brown
  secondaryDark: "#a03726",
  cardBg: "#fff",
  cardBorder: "rgba(0,0,0,0.06)",
  radius: 16,
  fontBody: "'DM Sans', sans-serif",
  fontHeading: "'Fraunces', serif",
};

export const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_4gMcMY3UhfAj6ri96S5Vu00";

export const FONTS_LINK = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@400;600;700;800&display=swap";

// Shared inline styles
export const styles = {
  page: {
    minHeight: "100vh",
    background: THEME.bg,
    color: THEME.text,
    fontFamily: THEME.fontBody,
  },
  card: {
    background: THEME.cardBg,
    border: `1px solid ${THEME.cardBorder}`,
    borderRadius: THEME.radius,
    padding: 24,
  },
  primaryBtn: {
    background: THEME.secondary,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: THEME.fontBody,
    transition: "background 0.15s",
  },
  tealBtn: {
    background: THEME.primary,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: THEME.fontBody,
    transition: "background 0.15s",
  },
  ghostBtn: {
    background: "transparent",
    color: THEME.primary,
    border: `2px solid ${THEME.primary}`,
    borderRadius: 12,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: THEME.fontBody,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 16,
    fontFamily: THEME.fontBody,
    boxSizing: "border-box",
    outline: "none",
  },
};
