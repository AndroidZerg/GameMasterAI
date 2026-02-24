import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useKioskMode } from "./hooks/useKioskMode";
import IdlePrompt from "./components/IdlePrompt";
import GameSelector from "./components/GameSelector";
import GameTeacher from "./components/GameTeacher";
import LandingPage from "./components/LandingPage";
import QRGeneratorPage from "./components/QRGeneratorPage";
import VenueStatsPage from "./components/VenueStatsPage";

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { kiosk, showIdlePrompt, dismissIdlePrompt } = useKioskMode(() => {
    navigate("/app");
  });

  return (
    <>
      {showIdlePrompt && <IdlePrompt onDismiss={dismissIdlePrompt} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<GameSelector />} />
        <Route path="/game/:gameId" element={<GameTeacher />} />
        <Route path="/admin/qr" element={<QRGeneratorPage />} />
        <Route path="/admin/stats" element={<VenueStatsPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
