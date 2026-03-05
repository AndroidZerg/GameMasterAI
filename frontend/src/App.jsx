import { useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
import JoinPage from "./components/JoinPage";
import LobbyJoin from "./components/LobbyJoin";
import LobbyScoreTracker from "./components/LobbyScoreTracker";
import OnboardingPage from "./pages/OnboardingPage";
import VenueDashboard from "./pages/VenueDashboard";
import CRMPage from "./pages/CRMPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PlayLanding from "./components/PlayLanding";

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

/* /join route: ?key= → magic link login, otherwise → lobby join */
function JoinRouter() {
  const [params] = useSearchParams();
  if (params.get("key")) return <JoinPage />;
  return <LobbyJoin />;
}

/* Root route: logged in → /games, not logged in → login screen */
function RootRedirect() {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/games" replace />;
  return <LoginPage />;
}

/** Track page_viewed and page_dwell on every route change */
function RouteTracker() {
  const location = useLocation();
  const prevPathRef = useRef(null);
  const pageEntryRef = useRef(Date.now());

  useEffect(() => {
    const prevPath = prevPathRef.current;
    const now = Date.now();

    // Fire page_dwell for the previous page
    if (prevPath !== null) {
      const dwellSeconds = Math.round((now - pageEntryRef.current) / 1000);
      if (dwellSeconds > 0) {
        EventTracker.track('page_dwell', null, {
          page: prevPath,
          dwell_seconds: dwellSeconds,
        });
      }
    }

    // Fire page_viewed for the new page
    EventTracker.track('page_viewed', null, {
      page: location.pathname,
      referrer_page: prevPath || '',
    });

    prevPathRef.current = location.pathname;
    pageEntryRef.current = now;
  }, [location.pathname]);

  return null;
}

function AppShell() {
  const navigate = useNavigate();
  const navigateHome = useCallback(() => navigate("/games"), [navigate]);
  const { showIdlePrompt, dismissIdlePrompt } = useKioskMode(navigateHome);

  useEffect(() => {
    const venueId = localStorage.getItem('gmai_venue_id');
    if (venueId) EventTracker.setVenue(venueId);
    EventTracker.start();
    return () => EventTracker.stop();
  }, []);

  return (
    <>
      <RouteTracker />
      <AuthWatcher />
      <NavMenu />
      <DemoBadge />
      {showIdlePrompt && <IdlePrompt onDismiss={dismissIdlePrompt} />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/play" element={<PlayLanding />} />
        <Route path="/expired" element={<ExpiredPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/games" element={<ProtectedRoute><GameSelector /></ProtectedRoute>} />
        <Route path="/app" element={<Navigate to="/games" replace />} />
        <Route path="/game/:gameId" element={<ProtectedRoute><GameTeacher /></ProtectedRoute>} />
        <Route path="/join/:code" element={<LobbyJoin />} />
        <Route path="/join" element={<JoinRouter />} />
        <Route path="/lobby/:lobbyId" element={<LobbyScoreTracker />} />
        <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
        {/* Admin routes — restricted to super_admin, demo, venue_admin */}
        <Route path="/admin/qr" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><QRGeneratorPage /></ProtectedRoute>} />
        <Route path="/admin/stats" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><VenueStatsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><VenueSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/collection" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><CollectionManagerPage /></ProtectedRoute>} />
        <Route path="/admin/customize" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><CustomizeHomePage /></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminFeedbackPage /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/analytics" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/venue/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        {/* Venue platform routes */}
        <Route path="/onboarding" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><OnboardingPage /></ProtectedRoute>} />
        <Route path="/onboarding/:step" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><OnboardingPage /></ProtectedRoute>} />
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
