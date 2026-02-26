import { useAuth } from "../contexts/AuthContext";

/**
 * Small persistent "DEMO" badge in the top-right corner.
 * Only visible for demo and convention roles.
 */
export default function DemoBadge() {
  const { role, isLoggedIn } = useAuth();

  if (!isLoggedIn) return null;
  if (role !== "demo" && role !== "convention") return null;

  return (
    <div style={{
      position: "fixed",
      top: "56px",
      right: "12px",
      zIndex: 1050,
      padding: "3px 10px",
      borderRadius: "6px",
      background: "rgba(100, 116, 139, 0.85)",
      color: "#fff",
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      pointerEvents: "none",
      userSelect: "none",
    }}>
      DEMO
    </div>
  );
}
