import { useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { setOnUnauthorized } from "./services/api";
import EventTracker from "./services/EventTracker";
import { useKioskMode } from "./hooks/useKioskMode";
import IdlePrompt from "./components/IdlePrompt";
import NavMenu from "./components/NavMenu";
import DemoBadge from "./components/DemoBadge";
import ProtectedRoute from "./components/ProtectedRoute";
import GameSelector from "./components/GameSelector";
import GameTeacher from "./components/GameTeacher";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ExpiredPage from "./components/ExpiredPage";
import QRGeneratorPage from "./components/QRGeneratorPage";
import VenueStatsPage from "./components/VenueStatsPage";
import VenueSettingsPage from "./components/VenueSettingsPage";
import CollectionManagerPage from "./components/CollectionManagerPage";
import CustomizeHomePage from "./components/CustomizeHomePage";
import AdminFeedbackPage from "./components/AdminFeedbackPage";
import MenuPage from "./components/MenuPage";
import LobbyJoin from "./components/LobbyJoin";
import LobbyScoreTracker from "./components/LobbyScoreTracker";

// Roles that can access admin routes
const ADMIN_ROLES = ["super_admin", "demo", "venue_admin"];

function AuthWatcher() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setOnUnauthorized(() => {
      logout(true);
      navigate("/login", { replace: true });
    });
    return () => setOnUnauthorized(null);
  }, [logout, navigate]);

  return null;
}

/* Root route: logged in → /games, not logged in → login screen */
function RootRedirect() {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/games" replace />;
  return <LoginPage />;
}

function AppShell() {
  const navigate = useNavigate();
  const navigateHome = useCallback(() => navigate("/games"), [navigate]);
  const { showIdlePrompt, dismissIdlePrompt } = useKioskMode(navigateHome);

  useEffect(() => {
    const venueId = localStorage.getItem('gmai-venue-id');
    if (venueId) EventTracker.setVenue(venueId);
    EventTracker.start();
    return () => EventTracker.stop();
  }, []);

  return (
    <>
      <AuthWatcher />
      <NavMenu />
      <DemoBadge />
      {showIdlePrompt && <IdlePrompt onDismiss={dismissIdlePrompt} />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/expired" element={<ExpiredPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/games" element={<ProtectedRoute><GameSelector /></ProtectedRoute>} />
        <Route path="/app" element={<Navigate to="/games" replace />} />
        <Route path="/game/:gameId" element={<ProtectedRoute><GameTeacher /></ProtectedRoute>} />
        <Route path="/join/:code" element={<LobbyJoin />} />
        <Route path="/join" element={<LobbyJoin />} />
        <Route path="/lobby/:lobbyId" element={<LobbyScoreTracker />} />
        <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
        {/* Admin routes — restricted to super_admin, demo, venue_admin */}
        <Route path="/admin/qr" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><QRGeneratorPage /></ProtectedRoute>} />
        <Route path="/admin/stats" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><VenueStatsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><VenueSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/collection" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><CollectionManagerPage /></ProtectedRoute>} />
        <Route path="/admin/customize" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><CustomizeHomePage /></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminFeedbackPage /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
