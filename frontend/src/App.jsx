import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameSelector from "./components/GameSelector";
import GameTeacher from "./components/GameTeacher";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameSelector />} />
        <Route path="/game/:gameId" element={<GameTeacher />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
