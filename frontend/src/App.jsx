import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { setOnUnauthorized } from "./services/api";
import { useKioskMode } from "./hooks/useKioskMode";
import IdlePrompt from "./components/IdlePrompt";
import NavMenu from "./components/NavMenu";
import ProtectedRoute from "./components/ProtectedRoute";
import GameSelector from "./components/GameSelector";
import GameTeacher from "./components/GameTeacher";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import QRGeneratorPage from "./components/QRGeneratorPage";
import VenueStatsPage from "./components/VenueStatsPage";
import VenueSettingsPage from "./components/VenueSettingsPage";
import CollectionManagerPage from "./components/CollectionManagerPage";
import CustomizeHomePage from "./components/CustomizeHomePage";
import AdminFeedbackPage from "./components/AdminFeedbackPage";
import MenuPage from "./components/MenuPage";
import LobbyJoin from "./components/LobbyJoin";
import LobbyScoreTracker from "./components/LobbyScoreTracker";

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

function FnbFab() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const showFab = /^\/(games|game\/|lobby\/)/.test(location.pathname);
  if (!showFab) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Food & Drinks menu"
        style={{
          position: "fixed", bottom: "70px", right: "16px", zIndex: 1200,
          width: "56px", height: "56px", borderRadius: "50%",
          background: "var(--accent)", color: "#fff", border: "none",
          fontSize: "1.5rem", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          display: open ? "none" : "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        🍽️
      </button>

      {/* Slide-up F&B panel */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: "rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }} onClick={() => setOpen(false)}>
          <div
            style={{
              background: "var(--bg-primary)", borderRadius: "20px 20px 0 0",
              maxHeight: "85vh", overflowY: "auto",
              animation: "slideUp 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div style={{ display: "flex", justifyContent: "flex-start", padding: "12px 16px 0" }}>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "var(--bg-secondary)", color: "var(--text-primary)",
                  border: "1px solid var(--border)", fontSize: "1rem",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            </div>
            <MenuPage embedded />
          </div>
        </div>
      )}
    </>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const { showIdlePrompt, dismissIdlePrompt } = useKioskMode(() => {
    navigate("/games");
  });

  return (
    <>
      <AuthWatcher />
      <NavMenu />
      <FnbFab />
      {showIdlePrompt && <IdlePrompt onDismiss={dismissIdlePrompt} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games" element={<GameSelector />} />
        <Route path="/app" element={<Navigate to="/games" replace />} />
        <Route path="/game/:gameId" element={<GameTeacher />} />
        <Route path="/join/:code" element={<LobbyJoin />} />
        <Route path="/join" element={<LobbyJoin />} />
        <Route path="/lobby/:lobbyId" element={<LobbyScoreTracker />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/qr" element={<ProtectedRoute><QRGeneratorPage /></ProtectedRoute>} />
        <Route path="/admin/stats" element={<ProtectedRoute><VenueStatsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><VenueSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/collection" element={<ProtectedRoute><CollectionManagerPage /></ProtectedRoute>} />
        <Route path="/admin/customize" element={<ProtectedRoute><CustomizeHomePage /></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute><AdminFeedbackPage /></ProtectedRoute>} />
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
