import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import MenuPage from "./components/MenuPage";

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

function AppShell() {
  const navigate = useNavigate();
  const { showIdlePrompt, dismissIdlePrompt } = useKioskMode(() => {
    navigate("/games");
  });

  return (
    <>
      <AuthWatcher />
      <NavMenu />
      {showIdlePrompt && <IdlePrompt onDismiss={dismissIdlePrompt} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games" element={<GameSelector />} />
        <Route path="/app" element={<Navigate to="/games" replace />} />
        <Route path="/game/:gameId" element={<GameTeacher />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/qr" element={<ProtectedRoute><QRGeneratorPage /></ProtectedRoute>} />
        <Route path="/admin/stats" element={<ProtectedRoute><VenueStatsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><VenueSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/collection" element={<ProtectedRoute><CollectionManagerPage /></ProtectedRoute>} />
        <Route path="/admin/customize" element={<ProtectedRoute><CustomizeHomePage /></ProtectedRoute>} />
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
