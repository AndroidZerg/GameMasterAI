import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE } from "../services/api";

const PLAYER_COLORS = [
  "#e94560", "#4a90d9", "#2ecc71", "#f39c12", "#9b59b6", "#e67e22",
];

const PLAYER_AVATARS = [
  "\u{1F9D9}", "\u{1F9DC}", "\u{1F9DA}", "\u{1F9DE}", "\u{1F9DF}", "\u{1F9D1}\u200D\u{1F680}",
];

// Scoring configs per game — count (stepper × points), boolean (exclusive toggle), manual (calculator)
const MOCK_SCORES = {
  catan: {
    game_title: "Catan",
    scoring_type: "calculator",
    categories: [
      { id: "settlements", name: "Settlements", type: "count", points_each: 1 },
      { id: "cities", name: "Cities", type: "count", points_each: 2 },
      { id: "longest_road", name: "Longest Road", type: "boolean", points_each: 2 },
      { id: "largest_army", name: "Largest Army", type: "boolean", points_each: 2 },
      { id: "vp_cards", name: "VP Cards", type: "count", points_each: 1 },
    ],
  },
  wingspan: {
    game_title: "Wingspan",
    scoring_type: "calculator",
    categories: [
      { id: "birds", name: "Bird Points", type: "manual", points_each: 1 },
      { id: "bonus_cards", name: "Bonus Cards", type: "manual", points_each: 1 },
      { id: "end_of_round", name: "End-of-Round Goals", type: "manual", points_each: 1 },
      { id: "eggs", name: "Eggs", type: "count", points_each: 1 },
      { id: "food_on_cards", name: "Cached Food", type: "count", points_each: 1 },
      { id: "tucked_cards", name: "Tucked Cards", type: "count", points_each: 1 },
    ],
  },
  "ticket-to-ride": {
    game_title: "Ticket to Ride",
    scoring_type: "calculator",
    categories: [
      { id: "route_points", name: "Route Points", type: "manual", points_each: 1 },
      { id: "tickets_completed", name: "Completed Tickets", type: "manual", points_each: 1 },
      { id: "tickets_failed", name: "Failed Tickets", type: "manual", points_each: -1 },
      { id: "longest_route", name: "Longest Route", type: "boolean", points_each: 10 },
    ],
  },
  azul: {
    game_title: "Azul",
    scoring_type: "calculator",
    categories: [
      { id: "tile_placement", name: "Tile Placement", type: "manual", points_each: 1 },
      { id: "complete_rows", name: "Complete Rows", type: "count", points_each: 2 },
      { id: "complete_columns", name: "Complete Columns", type: "count", points_each: 7 },
      { id: "complete_colors", name: "Complete Colors", type: "count", points_each: 10 },
      { id: "floor_penalty", name: "Floor Penalty", type: "manual", points_each: 1 },
    ],
  },
  "7-wonders": {
    game_title: "7 Wonders",
    scoring_type: "calculator",
    categories: [
      { id: "military", name: "Military", type: "manual", points_each: 1 },
      { id: "treasury", name: "Treasury", type: "manual", points_each: 1 },
      { id: "wonder", name: "Wonder", type: "manual", points_each: 1 },
      { id: "civilian", name: "Civilian", type: "manual", points_each: 1 },
      { id: "science", name: "Science", type: "manual", points_each: 1 },
      { id: "commerce", name: "Commerce", type: "manual", points_each: 1 },
      { id: "guilds", name: "Guilds", type: "manual", points_each: 1 },
    ],
  },
  "terraforming-mars": {
    game_title: "Terraforming Mars",
    scoring_type: "calculator",
    categories: [
      { id: "tr", name: "Terraform Rating", type: "manual", points_each: 1 },
      { id: "awards", name: "Awards", type: "manual", points_each: 1 },
      { id: "milestones", name: "Milestones", type: "count", points_each: 5 },
      { id: "greenery", name: "Greenery Tiles", type: "count", points_each: 1 },
      { id: "city", name: "City Tiles", type: "manual", points_each: 1 },
      { id: "vp_cards", name: "VP on Cards", type: "manual", points_each: 1 },
    ],
  },
  splendor: {
    game_title: "Splendor",
    scoring_type: "calculator",
    categories: [
      { id: "card_points", name: "Card Points", type: "manual", points_each: 1 },
      { id: "nobles", name: "Noble Tiles", type: "count", points_each: 3 },
    ],
  },
  dominion: {
    game_title: "Dominion",
    scoring_type: "calculator",
    categories: [
      { id: "estates", name: "Estates", type: "count", points_each: 1 },
      { id: "duchies", name: "Duchies", type: "count", points_each: 3 },
      { id: "provinces", name: "Provinces", type: "count", points_each: 6 },
      { id: "colonies", name: "Colonies", type: "count", points_each: 10 },
      { id: "gardens", name: "Gardens / VP Cards", type: "manual", points_each: 1 },
      { id: "curses", name: "Curses", type: "count", points_each: -1 },
    ],
  },
  everdell: {
    game_title: "Everdell",
    scoring_type: "calculator",
    categories: [
      { id: "base_points", name: "Card Base Points", type: "manual", points_each: 1 },
      { id: "prosperity", name: "Prosperity Cards", type: "manual", points_each: 1 },
      { id: "events", name: "Events", type: "manual", points_each: 1 },
      { id: "journey", name: "Journey Points", type: "manual", points_each: 1 },
    ],
  },
  root: {
    game_title: "Root",
    scoring_type: "calculator",
    categories: [
      { id: "vp", name: "Victory Points", type: "manual", points_each: 1 },
    ],
  },
  "spirit-island": {
    game_title: "Spirit Island",
    scoring_type: "cooperative",
    win_conditions: ["Destroy all invaders or meet terror level victory condition before the island is overwhelmed"],
  },
  pandemic: {
    game_title: "Pandemic",
    scoring_type: "cooperative",
    win_conditions: ["Cure all 4 diseases before outbreaks or deck runs out"],
  },
  "the-crew": {
    game_title: "The Crew",
    scoring_type: "cooperative",
    win_conditions: ["Complete all mission tasks without breaking trick rules"],
  },
  "king-of-tokyo": {
    game_title: "King of Tokyo",
    scoring_type: "elimination",
    categories: [
      { id: "vp", name: "Victory Points", type: "count", points_each: 1 },
    ],
  },
  coup: {
    game_title: "Coup",
    scoring_type: "elimination",
    categories: [],
  },
  "love-letter": {
    game_title: "Love Letter",
    scoring_type: "calculator",
    categories: [
      { id: "tokens", name: "Tokens of Affection", type: "count", points_each: 1 },
    ],
  },
  sagrada: {
    game_title: "Sagrada",
    scoring_type: "calculator",
    categories: [
      { id: "public_obj", name: "Public Objectives", type: "manual", points_each: 1 },
      { id: "private_obj", name: "Private Objective", type: "manual", points_each: 1 },
      { id: "favor_tokens", name: "Favor Tokens", type: "count", points_each: 1 },
      { id: "empty_penalty", name: "Empty Spaces", type: "count", points_each: -1 },
    ],
  },
  carcassonne: {
    game_title: "Carcassonne",
    scoring_type: "calculator",
    categories: [
      { id: "cities", name: "City Points", type: "manual", points_each: 1 },
      { id: "roads", name: "Road Points", type: "manual", points_each: 1 },
      { id: "monasteries", name: "Monastery Points", type: "manual", points_each: 1 },
      { id: "farms", name: "Farm Points", type: "manual", points_each: 1 },
    ],
  },
};

/* ── Player Setup Screen ─────────────────────────────────────── */
function PlayerSetup({ minPlayers, maxPlayers, onStart, scoringType }) {
  const [numPlayers, setNumPlayers] = useState(Math.max(minPlayers || 2, 2));
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    setPlayers(
      Array.from({ length: numPlayers }, (_, i) => ({
        name: `Player ${i + 1}`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        avatar: PLAYER_AVATARS[i % PLAYER_AVATARS.length],
      }))
    );
  }, [numPlayers]);

  const updatePlayer = (idx, field, value) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "20px", textAlign: "center", color: "var(--text-primary)" }}>
        {scoringType === "cooperative" ? "Who's playing?" : "How many players?"}
      </h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={() => setNumPlayers(Math.max(minPlayers || 2, numPlayers - 1))}
          style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border)", fontSize: "1.3rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
          }}
        >-</button>
        <span style={{ fontSize: "2.5rem", fontWeight: 700, minWidth: "50px", textAlign: "center", color: "var(--text-primary)" }}>{numPlayers}</span>
        <button
          onClick={() => setNumPlayers(Math.min(maxPlayers || 6, numPlayers + 1))}
          style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border)", fontSize: "1.3rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
          }}
        >+</button>
      </div>

      {/* Player name inputs — colors auto-assigned, no color picker (Bug 3) */}
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {players.map((player, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px",
              background: "var(--bg-secondary)", borderRadius: "12px", padding: "8px 12px",
              border: `2px solid ${player.color}`,
            }}
          >
            <button
              onClick={() => {
                const nextIdx = (PLAYER_AVATARS.indexOf(player.avatar) + 1) % PLAYER_AVATARS.length;
                updatePlayer(i, "avatar", PLAYER_AVATARS[nextIdx]);
              }}
              style={{
                fontSize: "1.5rem", background: "none", border: "none",
                cursor: "pointer", padding: "4px", flexShrink: 0,
              }}
              title="Change avatar"
            >{player.avatar}</button>
            <input
              type="text"
              value={player.name}
              onChange={(e) => updatePlayer(i, "name", e.target.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "8px",
                border: "1px solid var(--border)", background: "var(--bg-primary)",
                color: "var(--text-primary)", fontSize: "1rem", outline: "none",
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => onStart(players)}
        style={{
          display: "block", width: "100%", maxWidth: "400px",
          margin: "20px auto 0", padding: "14px",
          borderRadius: "12px", background: "var(--accent)",
          color: "#fff", border: "none", fontSize: "1.05rem",
          fontWeight: 700, cursor: "pointer",
        }}
      >
        {scoringType === "cooperative" ? "Start Game" : "Start Scoring"}
      </button>
    </div>
  );
}

/* ── Mini Calculator Overlay ──────────────────────────────────── */
function MiniCalculator({ value, onSave, onClose, playerName, catName }) {
  const [display, setDisplay] = useState(String(value || 0));
  const [pendingOp, setPendingOp] = useState(null);
  const [pendingVal, setPendingVal] = useState(null);

  const handleNum = (n) => {
    setDisplay((prev) => (prev === "0" ? String(n) : prev + String(n)));
  };

  const handleOp = (op) => {
    const current = parseFloat(display) || 0;
    if (pendingOp && pendingVal !== null) {
      const result = calcOp(pendingVal, current, pendingOp);
      setDisplay(String(result));
      setPendingVal(result);
    } else {
      setPendingVal(current);
    }
    setPendingOp(op);
    setDisplay("0");
  };

  const calcOp = (a, b, op) => {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b !== 0 ? a / b : 0;
    return b;
  };

  const handleEquals = () => {
    if (pendingOp && pendingVal !== null) {
      const current = parseFloat(display) || 0;
      const result = calcOp(pendingVal, current, pendingOp);
      setDisplay(String(result));
      setPendingOp(null);
      setPendingVal(null);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPendingOp(null);
    setPendingVal(null);
  };

  const handleRound = (dir) => {
    const val = parseFloat(display) || 0;
    setDisplay(String(dir === "up" ? Math.ceil(val) : Math.floor(val)));
  };

  const handleDone = () => {
    let final = parseFloat(display) || 0;
    if (pendingOp && pendingVal !== null) {
      final = calcOp(pendingVal, final, pendingOp);
    }
    onSave(Math.round(final));
  };

  const btnStyle = (bg, color) => ({
    width: "100%", height: "48px", borderRadius: "8px",
    background: bg || "var(--bg-card)", color: color || "var(--text-primary)",
    border: "1px solid var(--border)", fontSize: "1.1rem",
    fontWeight: 600, cursor: "pointer", padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-primary)", borderRadius: "16px",
        padding: "16px", width: "100%", maxWidth: "300px",
        border: "1px solid var(--border)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {playerName} — {catName}
          </span>
        </div>
        {/* Display */}
        <div style={{
          background: "var(--bg-card)", borderRadius: "10px",
          padding: "12px 16px", marginBottom: "12px",
          textAlign: "right", border: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {display}
          </span>
        </div>

        {/* Numpad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {[7,8,9].map((n) => <button key={n} onClick={() => handleNum(n)} style={btnStyle()}>{n}</button>)}
          <button onClick={() => handleOp("/")} style={btnStyle("var(--bg-secondary)", "var(--accent)")}>÷</button>
          {[4,5,6].map((n) => <button key={n} onClick={() => handleNum(n)} style={btnStyle()}>{n}</button>)}
          <button onClick={() => handleOp("*")} style={btnStyle("var(--bg-secondary)", "var(--accent)")}>×</button>
          {[1,2,3].map((n) => <button key={n} onClick={() => handleNum(n)} style={btnStyle()}>{n}</button>)}
          <button onClick={() => handleOp("-")} style={btnStyle("var(--bg-secondary)", "var(--accent)")}>−</button>
          <button onClick={handleClear} style={btnStyle("var(--bg-secondary)", "#ef4444")}>C</button>
          <button onClick={() => handleNum(0)} style={btnStyle()}>0</button>
          <button onClick={handleEquals} style={btnStyle("var(--bg-secondary)", "var(--text-primary)")}>=</button>
          <button onClick={() => handleOp("+")} style={btnStyle("var(--bg-secondary)", "var(--accent)")}>+</button>
        </div>

        {/* Round up/down */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
          <button onClick={() => handleRound("down")} style={btnStyle("var(--bg-secondary)", "var(--text-secondary)")}>⌊ Round Down</button>
          <button onClick={() => handleRound("up")} style={btnStyle("var(--bg-secondary)", "var(--text-secondary)")}>⌈ Round Up</button>
        </div>

        {/* Done */}
        <button onClick={handleDone} style={{
          width: "100%", padding: "14px", borderRadius: "10px",
          background: "var(--accent)", color: "#fff", border: "none",
          fontSize: "1.05rem", fontWeight: 700, cursor: "pointer",
          marginTop: "10px",
        }}>
          Done
        </button>
      </div>
    </div>
  );
}

/* ── Scoring Reference (How to Score) ────────────────────────── */
const SCORING_REFERENCE = {
  catan: [
    "Settlements = 1 VP each",
    "Cities = 2 VP each (upgrade from settlement)",
    "Longest Road = 2 VP (5+ connected roads, must be longest)",
    "Largest Army = 2 VP (3+ knights played, must be largest)",
    "VP Cards = 1 VP each (revealed from dev cards)",
    "First to 10 VP wins!",
  ],
  wingspan: [
    "Bird Points = face value on each bird card played",
    "Bonus Cards = points from end-game bonus cards",
    "End-of-Round Goals = points earned per round objective",
    "Eggs = 1 point per egg on bird cards",
    "Cached Food = 1 point per food token cached on bird cards",
    "Tucked Cards = 1 point per card tucked under bird cards",
  ],
  "ticket-to-ride": [
    "Route Points = points from claimed routes (varies by length)",
    "Completed Tickets = add face value of completed destination tickets",
    "Failed Tickets = subtract face value of incomplete tickets",
    "Longest Route Bonus = 10 points for longest continuous path",
  ],
  "king-of-tokyo": [
    "Earn VP by rolling three-of-a-kind (1s=1, 2s=2, 3s=3 VP)",
    "Each extra matching die beyond 3 = +1 VP",
    "Start in Tokyo to earn 1 VP, stay for another turn = +2 VP",
    "Card effects can also award VP",
    "First to 20 VP or last monster standing wins!",
  ],
  azul: [
    "Score points for each tile placed based on adjacent tiles",
    "Complete row bonus = 2 points per completed horizontal row",
    "Complete column bonus = 7 points per completed vertical column",
    "Complete color bonus = 10 points for all 5 of one color",
    "Floor line tiles subtract points (1,1,2,2,2,3,3)",
  ],
  "7-wonders": [
    "Military: compare shields with neighbors, +/- tokens",
    "Treasury: 1 VP per 3 coins",
    "Wonder: VP printed on wonder stages",
    "Civilian: blue card VP values",
    "Science: sets of 3 different = 7 VP, pairs = square of count",
    "Commerce: VP from yellow cards",
    "Guilds: VP from purple cards based on conditions",
  ],
  "terraforming-mars": [
    "Terraform Rating = your TR track position (starts at 20)",
    "Milestones = 5 VP each (max 3 claimed per game)",
    "Awards = 5 VP first, 2 VP second in each funded award",
    "Greenery tiles = 1 VP each",
    "City tiles = 1 VP per adjacent greenery",
    "VP on cards = count all VP icons on played cards",
  ],
  splendor: [
    "Card points = prestige points printed on development cards",
    "Noble tiles = 3 VP each when visited by a noble",
    "First to 15 points triggers final round",
  ],
  dominion: [
    "Estates = 1 VP, Duchies = 3 VP, Provinces = 6 VP",
    "Colonies = 10 VP (if using Prosperity)",
    "Gardens = 1 VP per 10 cards in deck",
    "Curses = -1 VP each",
    "Count all VP cards in your deck at game end",
  ],
  sagrada: [
    "Public objectives scored by all players",
    "Private objective = sum of pips of your secret color",
    "Favor tokens = 1 VP each remaining",
    "Empty spaces = -1 VP each",
  ],
  carcassonne: [
    "Completed cities = 2 pts per tile + 2 per pennant",
    "Completed roads = 1 pt per tile",
    "Completed monasteries = 9 pts (monastery + 8 surrounding)",
    "Farms = 3 pts per completed city touching your farm",
    "Incomplete features score half at game end",
  ],
};

function ScoringReference({ gameId }) {
  const [open, setOpen] = useState(false);
  const tips = SCORING_REFERENCE[gameId];
  if (!tips) return null;

  return (
    <div style={{
      margin: "0 8px 8px", borderRadius: "10px",
      border: "1px solid var(--border)", overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "10px 14px",
          background: "var(--bg-secondary)", color: "var(--text-primary)",
          border: "none", cursor: "pointer", fontSize: "0.85rem",
          fontWeight: 600, textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>📋</span>
          <span>How to Score</span>
        </span>
        <span style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", fontSize: "0.7rem",
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "10px 14px", background: "var(--bg-card)" }}>
          {tips.map((tip, i) => (
            <div key={i} style={{
              display: "flex", gap: "8px", marginBottom: "6px",
              fontSize: "0.8rem", lineHeight: 1.5,
              color: "var(--text-secondary)",
            }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Spreadsheet Score Entry ───────────────────────────────────── */
function SpreadsheetScoring({ players, categories, scores, setScores, playerNames, setPlayerNames, categoryNames, setCategoryNames }) {
  const [calcOpen, setCalcOpen] = useState(null); // { pi, catId }

  const getPlayerTotal = (pi) => {
    return categories.reduce((sum, cat) => {
      const value = Number(scores[pi]?.[cat.id]) || 0;
      const points = Number(cat.points_each) || 1;
      if (cat.type === "boolean") return sum + (value ? points : 0);
      if (cat.type === "count") return sum + (value * points);
      return sum + value; // manual type — value IS the points
    }, 0);
  };

  const updateScore = (pi, catId, value) => {
    setScores((prev) => {
      const next = { ...prev };
      next[pi] = { ...(next[pi] || {}), [catId]: value };
      return next;
    });
  };

  const handleBooleanToggle = (pi, catId) => {
    setScores((prev) => {
      const next = { ...prev };
      players.forEach((_, idx) => {
        next[idx] = { ...(next[idx] || {}), [catId]: false };
      });
      next[pi] = { ...(next[pi] || {}), [catId]: true };
      return next;
    });
  };

  // Column width calculation
  const colCount = players.length;
  const labelWidth = "140px";

  return (
    <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "0 8px" }}>
      {/* Player header row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `${labelWidth} repeat(${colCount}, 1fr)`,
        gap: "4px",
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--bg-primary)", paddingBottom: "8px",
      }}>
        <div />
        {players.map((p, i) => (
          <div key={i} style={{
            textAlign: "center", padding: "8px 4px",
            borderRadius: "8px", background: p.color + "22",
            border: `2px solid ${p.color}`,
          }}>
            <div style={{ fontSize: "1.3rem" }}>{p.avatar}</div>
            <input
              type="text"
              value={playerNames[i] ?? p.name}
              onChange={(e) => setPlayerNames((prev) => ({ ...prev, [i]: e.target.value }))}
              style={{
                fontSize: "0.8rem", fontWeight: 600, color: p.color,
                maxWidth: "100%", width: "100%",
                background: "transparent", border: "none", outline: "none",
                textAlign: "center", padding: "0 2px", boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>

      {/* Category rows */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          style={{
            display: "grid",
            gridTemplateColumns: `${labelWidth} repeat(${colCount}, 1fr)`,
            gap: "4px",
            marginBottom: "4px",
            alignItems: "center",
          }}
        >
          {/* Category label */}
          <div style={{
            padding: "8px 10px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            minHeight: "44px",
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <input
              type="text"
              value={categoryNames[cat.id] ?? cat.name}
              onChange={(e) => setCategoryNames((prev) => ({ ...prev, [cat.id]: e.target.value }))}
              style={{
                fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.2,
                background: "transparent", border: "none", outline: "none",
                padding: 0, width: "100%", boxSizing: "border-box",
              }}
            />
            {(Number(cat.points_each) || 1) > 1 && cat.type !== "manual" && (
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.2 }}>
                {cat.type === "boolean" ? `${cat.points_each}pts (exclusive)` : `${cat.points_each}pts each`}
              </span>
            )}
          </div>

          {/* Player cells */}
          {players.map((player, pi) => (
            <div key={pi} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "4px", minHeight: "44px",
              background: "var(--bg-secondary)", borderRadius: "8px",
              border: "1px solid var(--border)",
            }}>
              {cat.type === "count" && (
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <button
                    onClick={() => updateScore(pi, cat.id, Math.max(0, (scores[pi]?.[cat.id] || 0) - 1))}
                    aria-label={`Decrease ${cat.name} for ${player.name}`}
                    style={{
                      width: "32px", height: "32px", borderRadius: "6px",
                      background: "var(--bg-card)", color: "var(--text-primary)",
                      border: "1px solid var(--border)", fontSize: "1rem",
                      padding: 0, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >-</button>
                  <span style={{
                    minWidth: "28px", textAlign: "center", fontWeight: 700,
                    fontSize: "1rem", color: "var(--text-primary)",
                  }}>
                    {scores[pi]?.[cat.id] || 0}
                  </span>
                  <button
                    onClick={() => updateScore(pi, cat.id, (scores[pi]?.[cat.id] || 0) + 1)}
                    aria-label={`Increase ${cat.name} for ${player.name}`}
                    style={{
                      width: "32px", height: "32px", borderRadius: "6px",
                      background: "var(--bg-card)", color: "var(--text-primary)",
                      border: "1px solid var(--border)", fontSize: "1rem",
                      padding: 0, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >+</button>
                </div>
              )}

              {cat.type === "boolean" && (
                <button
                  onClick={() => handleBooleanToggle(pi, cat.id)}
                  style={{
                    width: "100%", maxWidth: "80px", height: "32px", borderRadius: "6px",
                    background: scores[pi]?.[cat.id] ? player.color : "var(--bg-card)",
                    color: scores[pi]?.[cat.id] ? "#fff" : "var(--text-secondary)",
                    border: scores[pi]?.[cat.id] ? "none" : "1px solid var(--border)",
                    fontSize: "0.75rem", cursor: "pointer", fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {scores[pi]?.[cat.id] ? `+${cat.points_each}` : "—"}
                </button>
              )}

              {cat.type === "manual" && (
                <button
                  onClick={() => setCalcOpen({ pi, catId: cat.id })}
                  style={{
                    width: "70px", padding: "4px 6px", borderRadius: "6px",
                    border: "1px solid var(--border)", background: "var(--bg-card)",
                    color: "var(--text-primary)", fontSize: "0.95rem",
                    textAlign: "center", cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {scores[pi]?.[cat.id] || 0}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Totals row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `${labelWidth} repeat(${colCount}, 1fr)`,
        gap: "4px",
        marginTop: "8px",
        position: "sticky", bottom: 0,
        background: "var(--bg-primary)", paddingTop: "4px",
      }}>
        <div style={{
          padding: "10px", background: "var(--accent)",
          borderRadius: "8px", color: "#fff", fontWeight: 700,
          fontSize: "0.9rem", display: "flex", alignItems: "center",
        }}>
          TOTAL
        </div>
        {players.map((p, pi) => (
          <div key={pi} style={{
            textAlign: "center", padding: "10px 4px",
            background: p.color + "22", borderRadius: "8px",
            border: `2px solid ${p.color}`,
          }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: p.color }}>
              {getPlayerTotal(pi)}
            </span>
          </div>
        ))}
      </div>

      {/* Calculator overlay */}
      {calcOpen && (
        <MiniCalculator
          value={scores[calcOpen.pi]?.[calcOpen.catId] || 0}
          playerName={playerNames[calcOpen.pi] ?? players[calcOpen.pi]?.name}
          catName={categoryNames[calcOpen.catId] ?? categories.find((c) => c.id === calcOpen.catId)?.name}
          onSave={(val) => {
            updateScore(calcOpen.pi, calcOpen.catId, val);
            setCalcOpen(null);
          }}
          onClose={() => setCalcOpen(null)}
        />
      )}
    </div>
  );
}

/* ── Cooperative Tracker ──────────────────────────────────────── */
function CooperativeTracker({ players, winConditions, onFinish }) {
  const [won, setWon] = useState(null);

  return (
    <div style={{ padding: "20px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <h3 style={{ color: "var(--text-primary)", marginBottom: "16px" }}>Cooperative Mode</h3>
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px",
        padding: "16px", marginBottom: "24px", border: "1px solid var(--border)",
      }}>
        <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>Win Condition:</p>
        {winConditions.map((cond, i) => (
          <p key={i} style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>{cond}</p>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "999px", background: p.color + "22", border: `1px solid ${p.color}` }}>
            <span>{p.avatar}</span>
            <span style={{ color: p.color, fontSize: "0.9rem", fontWeight: 500 }}>{p.name}</span>
          </div>
        ))}
      </div>
      {won === null ? (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => { setWon(true); onFinish(true); }}
            style={{
              padding: "14px 32px", borderRadius: "12px",
              background: "#22c55e", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "1.1rem", cursor: "pointer",
            }}
          >We Won!</button>
          <button
            onClick={() => { setWon(false); onFinish(false); }}
            style={{
              padding: "14px 32px", borderRadius: "12px",
              background: "#ef4444", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "1.1rem", cursor: "pointer",
            }}
          >We Lost</button>
        </div>
      ) : (
        <div style={{
          padding: "24px", borderRadius: "16px",
          background: won ? "#0f2a0f" : "#2a0f0f",
          border: won ? "2px solid #22c55e" : "2px solid #ef4444",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>{won ? "\u{1F389}" : "\u{1F614}"}</div>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: won ? "#22c55e" : "#ef4444" }}>
            {won ? "Victory!" : "Defeat"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Elimination Tracker ─────────────────────────────────────── */
function EliminationTracker({ players, categories, scores, setScores }) {
  const [eliminated, setEliminated] = useState(new Set());

  const updateScore = (playerIdx, catId, value) => {
    setScores((prev) => {
      const next = { ...prev };
      next[playerIdx] = { ...(next[playerIdx] || {}), [catId]: value };
      return next;
    });
  };

  const toggleEliminate = (pi) => {
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(pi)) next.delete(pi); else next.add(pi);
      return next;
    });
  };

  const alive = players.filter((_, i) => !eliminated.has(i));

  return (
    <div style={{ padding: "10px 16px", flex: 1 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px", padding: "0 4px",
      }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {alive.length} of {players.length} remaining
        </span>
      </div>

      {players.map((player, pi) => (
        <div
          key={pi}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "8px", padding: "10px 14px",
            borderRadius: "12px",
            background: eliminated.has(pi) ? "var(--bg-primary)" : "var(--bg-secondary)",
            border: eliminated.has(pi) ? "1px solid var(--border)" : `2px solid ${player.color}`,
            opacity: eliminated.has(pi) ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>{player.avatar}</span>
          <span style={{
            flex: 1, fontWeight: 600,
            color: eliminated.has(pi) ? "var(--text-secondary)" : player.color,
            textDecoration: eliminated.has(pi) ? "line-through" : "none",
          }}>
            {player.name}
          </span>
          {categories && categories.length > 0 && !eliminated.has(pi) && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => updateScore(pi, categories[0].id, Math.max(0, (scores[pi]?.[categories[0].id] || 0) - 1))}
                style={{ width: "36px", height: "36px", borderRadius: "6px", background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "1rem", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >-</button>
              <span style={{ minWidth: "28px", textAlign: "center", fontWeight: 700, fontSize: "1rem" }}>
                {scores[pi]?.[categories[0].id] || 0}
              </span>
              <button
                onClick={() => updateScore(pi, categories[0].id, (scores[pi]?.[categories[0].id] || 0) + 1)}
                style={{ width: "36px", height: "36px", borderRadius: "6px", background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "1rem", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >+</button>
            </div>
          )}
          <button
            onClick={() => toggleEliminate(pi)}
            style={{
              padding: "6px 12px", borderRadius: "8px", fontSize: "0.8rem",
              background: eliminated.has(pi) ? "#22c55e" : "#ef4444",
              color: "#fff", border: "none", cursor: "pointer", fontWeight: 600,
            }}
          >
            {eliminated.has(pi) ? "Revive" : "Eliminate"}
          </button>
        </div>
      ))}

      {alive.length <= 1 && alive.length > 0 && (
        <div style={{
          marginTop: "16px", padding: "20px", borderRadius: "12px",
          background: alive[0].color + "22", border: `2px solid ${alive[0].color}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "4px" }}>{alive[0].avatar}</div>
          <p style={{ fontWeight: 700, fontSize: "1.2rem", color: alive[0].color }}>
            {alive[0].name} wins!
          </p>
        </div>
      )}
    </div>
  );
}

/* ── End Game Confirmation ────────────────────────────────────── */
function EndGameConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onCancel}>
      <div style={{
        background: "var(--bg-primary)", borderRadius: "16px",
        padding: "24px", width: "100%", maxWidth: "340px",
        border: "1px solid var(--border)", textAlign: "center",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{"\u{1F3C1}"}</div>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "8px", fontSize: "1.2rem" }}>End this game?</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
          Final scores will be revealed.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px", borderRadius: "10px",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "12px", borderRadius: "10px",
            background: "#ef4444", color: "#fff", border: "none",
            fontWeight: 600, cursor: "pointer",
          }}>End Game</button>
        </div>
      </div>
    </div>
  );
}

/* ── Post-Game Survey ────────────────────────────────────────── */
function PostGameSurvey({ gameId, gameTitle, lobbyId, playerName, onDone }) {
  const [gameRating, setGameRating] = useState(0);
  const [playedBefore, setPlayedBefore] = useState(null);
  const [helpfulSetup, setHelpfulSetup] = useState(0);
  const [helpfulRules, setHelpfulRules] = useState(0);
  const [helpfulStrategy, setHelpfulStrategy] = useState(0);
  const [helpfulScoring, setHelpfulScoring] = useState(0);
  const [wouldUseAgain, setWouldUseAgain] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const StarRow = ({ label, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
      <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => onChange(s)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem",
            color: s <= value ? "#f59e0b" : "var(--border)", padding: "2px",
          }}>{s <= value ? "\u2605" : "\u2606"}</button>
        ))}
      </div>
    </div>
  );

  const YesNo = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: "8px" }}>
      {[true, false].map((v) => (
        <button key={String(v)} onClick={() => onChange(v)} style={{
          padding: "8px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer",
          background: value === v ? "var(--accent)" : "var(--bg-secondary)",
          color: value === v ? "#fff" : "var(--text-primary)",
          border: value === v ? "none" : "1px solid var(--border)",
        }}>{v ? "Yes" : "No"}</button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    if (gameRating === 0) return;
    setSubmitting(true);
    try {
      const venueId = localStorage.getItem("gmai_venue_id") || null;
      await fetch(`${API_BASE}/api/feedback/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          lobby_id: lobbyId || null,
          venue_id: venueId,
          player_name: playerName || null,
          game_rating: gameRating,
          played_before: playedBefore,
          helpful_setup: helpfulSetup || null,
          helpful_rules: helpfulRules || null,
          helpful_strategy: helpfulStrategy || null,
          helpful_scoring: helpfulScoring || null,
          would_use_again: wouldUseAgain,
          feedback_text: feedbackText || null,
          submitted_at: new Date().toISOString(),
        }),
      });
    } catch { /* non-fatal */ }
    onDone();
  };

  return (
    <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "1.3rem", color: "var(--text-primary)", marginBottom: "24px" }}>
        How was your experience?
      </h2>

      {/* Section 1: Game Rating */}
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px",
        border: "1px solid var(--border)", marginBottom: "16px",
      }}>
        <StarRow label={`Rate ${gameTitle || gameId}:`} value={gameRating} onChange={setGameRating} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Have you played this game before?</span>
          <YesNo value={playedBefore} onChange={setPlayedBefore} />
        </div>
      </div>

      {/* Section 2: GameMaster AI Feedback */}
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px",
        border: "1px solid var(--border)", marginBottom: "16px",
      }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
          How helpful was GameMaster AI for:
        </p>
        <StarRow label="Setup" value={helpfulSetup} onChange={setHelpfulSetup} />
        <StarRow label="Rules" value={helpfulRules} onChange={setHelpfulRules} />
        <StarRow label="Strategies" value={helpfulStrategy} onChange={setHelpfulStrategy} />
        <StarRow label="Keeping Score" value={helpfulScoring} onChange={setHelpfulScoring} />
      </div>

      {/* Section 3: Recommendation */}
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px",
        border: "1px solid var(--border)", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", flex: 1, marginRight: "8px" }}>
            Would you use GameMaster AI to learn a new game?
          </span>
          <YesNo value={wouldUseAgain} onChange={setWouldUseAgain} />
        </div>
      </div>

      {/* Section 4: Optional */}
      <div style={{
        background: "var(--bg-secondary)", borderRadius: "12px", padding: "16px",
        border: "1px solid var(--border)", marginBottom: "20px",
      }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
          Any other feedback? (optional)
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Tell us what you think..."
          rows={3}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid var(--border)", background: "var(--bg-primary)",
            color: "var(--text-primary)", fontSize: "0.9rem", resize: "vertical",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || gameRating === 0}
        style={{
          display: "block", width: "100%", padding: "14px", borderRadius: "12px",
          background: gameRating === 0 ? "var(--bg-secondary)" : "var(--accent)",
          color: gameRating === 0 ? "var(--text-secondary)" : "#fff",
          border: "none", fontSize: "1.05rem", fontWeight: 700, cursor: gameRating === 0 ? "default" : "pointer",
          marginBottom: "8px", opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>

      {/* Skip */}
      <button
        onClick={onDone}
        style={{
          display: "block", width: "100%", padding: "10px",
          background: "none", border: "none", color: "var(--text-secondary)",
          fontSize: "0.85rem", cursor: "pointer", textAlign: "center",
        }}
      >
        Skip
      </button>
    </div>
  );
}

/* ── Results Screen ──────────────────────────────────────────── */
function ResultsScreen({ players, categories, scores, scoringType, coopResult, onPlayAgain, onNewGame, onSurvey, gameId, gameTitle }) {
  const RANK_MESSAGES = [
    { icon: "\u{1F3C6}", msg: "You won! 1st Place!", color: "#f59e0b" },
    { icon: "\u{1F948}", msg: "Great game! 2nd Place!", color: "#94a3b8" },
    { icon: "\u{1F949}", msg: "Well played! 3rd Place!", color: "#cd7f32" },
  ];

  const totals = players.map((_, pi) =>
    categories
      ? categories.reduce((sum, cat) => {
          const value = Number(scores[pi]?.[cat.id]) || 0;
          const points = Number(cat.points_each) || 1;
          if (cat.type === "boolean") return sum + (value ? points : 0);
          if (cat.type === "count") return sum + (value * points);
          return sum + value;
        }, 0)
      : 0
  );

  const sorted = players
    .map((player, i) => ({ ...player, total: totals[i], idx: i }))
    .sort((a, b) => b.total - a.total);

  const confettiColors = ["#e94560", "#ff6b81", "#a855f7", "#22c55e", "#3b82f6", "#f59e0b"];

  useEffect(() => {
    const postSession = async () => {
      try {
        await fetch(`${API_BASE}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: gameId,
            game_title: gameTitle,
            scoring_type: scoringType,
            players: players.map((p, i) => ({
              name: p.name, avatar: p.avatar, color: p.color, score: totals[i],
            })),
            winner: scoringType === "cooperative"
              ? (coopResult ? "team_win" : "team_loss")
              : sorted[0]?.name,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {}
    };
    postSession();
  }, []);

  const getRankLabel = (rank) => {
    if (rank < 3) return RANK_MESSAGES[rank];
    const n = rank + 1;
    const suffix = n === 4 ? "th" : n === 5 ? "th" : n === 6 ? "th" : "th";
    return { icon: "", msg: `You got ${n}${suffix} place. Good try! Better luck next time!`, color: "var(--text-secondary)" };
  };

  return (
    <div style={{ padding: "20px", position: "relative", overflow: "hidden", flex: 1 }}>
      {/* Confetti */}
      {confettiColors.map((color, i) =>
        Array.from({ length: 6 }).map((_, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              position: "absolute", top: "0",
              left: `${5 + (i * 6 + j) * 2.5}%`,
              width: j % 3 === 0 ? "10px" : "8px",
              height: j % 3 === 0 ? "10px" : "8px",
              borderRadius: j % 2 === 0 ? "50%" : "2px",
              background: color,
              animation: `confetti 2s ease-out ${(i * 6 + j) * 0.05}s forwards`,
              opacity: 0.9,
            }}
          />
        ))
      )}

      <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: "20px", color: "var(--text-primary)" }}>
        {scoringType === "cooperative" ? (coopResult ? "Victory!" : "Defeat") : "Final Scores"}
      </h2>

      {scoringType !== "cooperative" ? (
        sorted.map((p, rank) => {
          const rankInfo = getRankLabel(rank);
          const isWinner = rank === 0;
          return (
            <div
              key={p.idx}
              style={{
                background: isWinner ? p.color : "var(--bg-secondary)",
                borderRadius: "12px", padding: "16px", marginBottom: "10px",
                border: isWinner ? `2px solid ${p.color}` : "1px solid var(--border)",
                animation: isWinner ? "glow 2s ease-in-out infinite" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{p.avatar}</span>
                  <div>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isWinner ? "#fff" : "var(--text-primary)" }}>
                      {rankInfo.icon ? `${rankInfo.icon} ` : ""}{p.name}
                    </span>
                    <div style={{ fontSize: "0.8rem", color: isWinner ? "#ffd" : rankInfo.color, marginTop: "2px" }}>
                      {rankInfo.msg}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: isWinner ? "#fff" : p.color }}>
                  {p.total}
                </span>
              </div>

              {categories && (
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {categories.map((cat) => {
                    const val = Number(scores[p.idx]?.[cat.id]) || 0;
                    const points = Number(cat.points_each) || 1;
                    const pts = cat.type === "boolean" ? (val ? points : 0) : cat.type === "count" ? val * points : val;
                    if (pts === 0) return null;
                    return (
                      <span key={cat.id} style={{
                        fontSize: "0.75rem", padding: "2px 8px", borderRadius: "999px",
                        background: isWinner ? "rgba(255,255,255,0.2)" : "var(--bg-card)",
                        color: isWinner ? "#fff" : "var(--text-secondary)",
                      }}>
                        {cat.name}: {pts}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "8px" }}>{coopResult ? "\u{1F389}" : "\u{1F614}"}</div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            {players.map((p, i) => (
              <span key={i} style={{ padding: "4px 12px", borderRadius: "999px", background: p.color + "22", border: `1px solid ${p.color}`, color: p.color, fontSize: "0.9rem" }}>
                {p.avatar} {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onSurvey} style={{
          flex: 1, padding: "14px", borderRadius: "12px",
          background: "var(--accent)", color: "#fff", border: "none",
          fontWeight: 600, cursor: "pointer", fontSize: "1rem",
        }}>Rate This Game</button>
        <button onClick={onPlayAgain} style={{
          flex: 1, padding: "14px", borderRadius: "12px",
          background: "var(--bg-secondary)", color: "var(--text-primary)",
          border: "1px solid var(--border)", fontWeight: 600,
          cursor: "pointer", fontSize: "1rem",
        }}>Play Again</button>
      </div>
    </div>
  );
}

/* ── Main ScoreTracker ───────────────────────────────────────── */
export default function ScoreTracker({ gameId, gameTitle, playerCount, onClose, onNewGame, savedState, onStateChange }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState(null);
  const [scoringType, setScoringType] = useState("calculator");
  const [winConditions, setWinConditions] = useState([]);
  const [scores, setScores] = useState({});
  const [coopResult, setCoopResult] = useState(null);
  const [playerNames, setPlayerNames] = useState({});
  const [categoryNames, setCategoryNames] = useState({});
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Restore from savedState on mount (Bug 4: preserve scores across tab switches)
  useEffect(() => {
    if (savedState) {
      if (savedState.players) setPlayers(savedState.players);
      if (savedState.scores) setScores(savedState.scores);
      if (savedState.phase) setPhase(savedState.phase);
      if (savedState.coopResult !== undefined) setCoopResult(savedState.coopResult);
    }
  }, []);

  // Save state up on any change (Bug 4)
  useEffect(() => {
    onStateChange?.({ players, scores, phase, coopResult });
  }, [players, scores, phase, coopResult]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scores/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || null);
          setScoringType(data.scoring_type || "calculator");
          setWinConditions(data.win_conditions || []);
          return;
        }
      } catch {}

      if (MOCK_SCORES[gameId]) {
        const mock = MOCK_SCORES[gameId];
        setCategories(mock.categories || null);
        setScoringType(mock.scoring_type || "calculator");
        setWinConditions(mock.win_conditions || []);
      } else {
        setCategories([
          { id: "score", name: "Score", type: "manual", points_each: 1 },
        ]);
        setScoringType("calculator");
      }
    };
    fetchConfig();
  }, [gameId]);

  if (scoringType !== "cooperative" && !categories) return null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: 0,
    }}>
      {/* Content — renders inline in the Score tab */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {phase === "setup" && (
          <PlayerSetup
            minPlayers={playerCount?.min || 2}
            maxPlayers={Math.min(playerCount?.max || 6, 6)}
            scoringType={scoringType}
            onStart={(playerData) => {
              setPlayers(playerData);
              if (scoringType === "cooperative") {
                setPhase("scoring");
              } else {
                const initialScores = {};
                playerData.forEach((_, i) => {
                  initialScores[i] = {};
                  if (categories) {
                    categories.forEach((cat) => {
                      initialScores[i][cat.id] = cat.type === "boolean" ? false : 0;
                    });
                  }
                });
                setScores(initialScores);
                setPhase("scoring");
              }
            }}
          />
        )}

        {phase === "scoring" && scoringType === "calculator" && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <ScoringReference gameId={gameId} />
            <SpreadsheetScoring players={players} categories={categories} scores={scores} setScores={setScores} playerNames={playerNames} setPlayerNames={setPlayerNames} categoryNames={categoryNames} setCategoryNames={setCategoryNames} />
            <div style={{ padding: "12px 0", flexShrink: 0 }}>
              <button onClick={() => setShowEndConfirm(true)} style={{
                display: "block", width: "100%", padding: "14px",
                borderRadius: "12px", background: "#ef4444", color: "#fff",
                border: "none", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer",
              }}>
                End Game
              </button>
            </div>
          </div>
        )}

        {phase === "scoring" && scoringType === "cooperative" && (
          <CooperativeTracker
            players={players}
            winConditions={winConditions}
            onFinish={(won) => {
              setCoopResult(won);
              setPhase("results");
            }}
          />
        )}

        {phase === "scoring" && scoringType === "elimination" && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <EliminationTracker
              players={players}
              categories={categories}
              scores={scores}
              setScores={setScores}
            />
            <div style={{ padding: "12px 0", flexShrink: 0 }}>
              <button onClick={() => setShowEndConfirm(true)} style={{
                display: "block", width: "100%", padding: "14px",
                borderRadius: "12px", background: "#ef4444", color: "#fff",
                border: "none", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer",
              }}>
                End Game
              </button>
            </div>
          </div>
        )}

        {showEndConfirm && (
          <EndGameConfirm
            onConfirm={() => { setShowEndConfirm(false); setPhase("results"); }}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}

        {phase === "results" && (
          <ResultsScreen
            players={players}
            categories={categories}
            scores={scores}
            scoringType={scoringType}
            coopResult={coopResult}
            gameId={gameId}
            gameTitle={gameTitle}
            onSurvey={() => setPhase("survey")}
            onPlayAgain={() => {
              if (categories) {
                const resetScores = {};
                players.forEach((_, i) => {
                  resetScores[i] = {};
                  categories.forEach((cat) => {
                    resetScores[i][cat.id] = cat.type === "boolean" ? false : 0;
                  });
                });
                setScores(resetScores);
              }
              setCoopResult(null);
              setPhase("scoring");
            }}
            onNewGame={() => {
              if (onClose) onClose();
              if (onNewGame) onNewGame();
            }}
          />
        )}

        {phase === "survey" && (
          <PostGameSurvey
            gameId={gameId}
            gameTitle={gameTitle}
            playerName={players[0]?.name}
            onDone={() => navigate("/games")}
          />
        )}
      </div>
    </div>
  );
}
