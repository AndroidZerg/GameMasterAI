import { useParams, useNavigate } from "react-router-dom";

export default function GameTeacher() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "20px" }}>
        Back to Games
      </button>
      <h1>Game Teacher — {gameId}</h1>
      <p>Coming in Step 6...</p>
    </div>
  );
}
