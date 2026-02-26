import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * ProtectedRoute — wraps pages that require authentication.
 *
 * Props:
 *   allowedRoles — optional array of roles that can access this route.
 *                  If omitted, any authenticated user can access it.
 *   children     — the page component to render.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, role, isExpired } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Convention accounts: redirect to /expired if past the cutoff
  if (isExpired()) {
    return <Navigate to="/expired" replace />;
  }

  // Role-based gating
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect non-authorized roles to /games instead of showing a blank page
    return <Navigate to="/games" replace />;
  }

  return children;
}
