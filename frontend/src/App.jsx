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
import LGSDashboard from "./pages/LGSDashboard";
import PlayLanding from "./components/PlayLanding";
import ThaiHousePage from "./pages/ThaiHousePage";
import DrinkClubPage from "./pages/DrinkClubPage";
import DrinkClubWelcome from "./pages/DrinkClubWelcome";
import DrinkClubMember from "./pages/DrinkClubMember";
import StaffPage from "./pages/StaffPage";
import StaffRedeem from "./pages/StaffRedeem";
import ThaiHouseAdmin from "./pages/ThaiHouseAdmin";
import ThaiHouseDashboard from "./pages/ThaiHouseDashboard";
import SWPRentalLanding from "./pages/swp/SWPRentalLanding";
import SWPRentalWelcome from "./pages/swp/SWPRentalWelcome";
import SWPRentalBrowse from "./pages/swp/SWPRentalBrowse";
import SWPRentalProfile from "./pages/swp/SWPRentalProfile";
import LandingPage from "./components/LandingPage";
import CoverArtManager from "./pages/CoverArtManager";

// Roles that can access admin routes
const ADMIN_ROLES = ["super_admin", "demo", "venue_admin"];
const LGS_ROLES = ["lgs_admin", "super_admin"];

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
    console.log('[GMG] Build:', __COMMIT_HASH__);
    document.querySelector('meta[name="gmg-version"]')?.setAttribute('content', __COMMIT_HASH__);
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
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/play" element={<PlayLanding />} />
        <Route path="/expired" element={<ExpiredPage />} />

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
        <Route path="/admin/cover-art" element={<ProtectedRoute allowedRoles={["super_admin"]}><CoverArtManager /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/analytics" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/venue/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        {/* LGS partner routes */}
        <Route path="/lgs/dashboard" element={<ProtectedRoute allowedRoles={LGS_ROLES}><LGSDashboard /></ProtectedRoute>} />
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
        <Routes>
          {/* Thai House public routes — no app shell, no auth */}
          <Route path="/thaihouse" element={<ThaiHousePage />} />
          <Route path="/thaihouse/drinks" element={<DrinkClubPage />} />
          <Route path="/thaihouse/drinks/welcome" element={<DrinkClubWelcome />} />
          <Route path="/thaihouse/drinks/member" element={<DrinkClubMember />} />
          <Route path="/thaihouse/staff" element={<StaffPage />} />
          <Route path="/thaihouse/staff/redeem" element={<StaffRedeem />} />
          <Route path="/thaihouse/admin" element={<ThaiHouseAdmin />} />
          <Route path="/thaihouse/dashboard" element={<ThaiHouseDashboard />} />
          {/* SWP Rental routes — no app shell, no GMG auth */}
          <Route path="/swp/rentals-sign-up" element={<SWPRentalLanding />} />
          <Route path="/swp/rentals" element={<Navigate to="/swp/rentals-sign-up" replace />} />
          <Route path="/swp/rentals/welcome" element={<SWPRentalWelcome />} />
          <Route path="/swp/rentals/browse" element={<SWPRentalBrowse />} />
          <Route path="/swp/rentals/profile" element={<SWPRentalProfile />} />
          {/* Main GMAI app */}
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
