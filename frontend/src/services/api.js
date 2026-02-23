const API_BASE = "http://localhost:8100";

export async function fetchGames(search = "", complexity = "") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (complexity) params.set("complexity", complexity);
  const url = `${API_BASE}/api/games${params.toString() ? "?" + params : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
  return res.json();
}

export async function fetchGame(gameId) {
  const res = await fetch(`${API_BASE}/api/games/${gameId}`);
  if (!res.ok) throw new Error(`Failed to fetch game: ${res.status}`);
  return res.json();
}

export async function queryGame(gameId, question) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `Query failed: ${res.status}`);
  }
  return res.json();
}

export async function reloadGames() {
  const res = await fetch(`${API_BASE}/api/reload`, { method: "POST" });
  if (!res.ok) throw new Error(`Reload failed: ${res.status}`);
  return res.json();
}
