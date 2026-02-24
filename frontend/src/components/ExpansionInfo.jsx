import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8100";

const MOCK_EXPANSIONS = {
  catan: [
    { name: "Catan: Seafarers", year: 1997, description: "Explore islands, build ships, and discover gold rivers.", players: "3-4" },
    { name: "Catan: Cities & Knights", year: 1998, description: "Defend Catan from barbarians and develop cities with commodities.", players: "3-4" },
    { name: "Catan: Traders & Barbarians", year: 2007, description: "Five scenario variants including rivers, caravans, and barbarian attacks.", players: "2-4" },
  ],
  wingspan: [
    { name: "Wingspan: European Expansion", year: 2019, description: "81 European birds with new end-of-round goals and bonus cards.", players: "1-5" },
    { name: "Wingspan: Oceania Expansion", year: 2020, description: "95 birds from Australia and New Zealand plus new player mats and food.", players: "1-5" },
    { name: "Wingspan: Asia Expansion", year: 2022, description: "Duet mode for 2 players plus 90+ Asian birds.", players: "1-2 (duet) / 1-5" },
  ],
  "ticket-to-ride": [
    { name: "Ticket to Ride: Europe", year: 2005, description: "New map with tunnels, ferries, and stations across Europe.", players: "2-5" },
    { name: "Ticket to Ride: Nordic Countries", year: 2007, description: "Standalone 2-3 player game set in Scandinavia.", players: "2-3" },
  ],
  pandemic: [
    { name: "Pandemic: On the Brink", year: 2009, description: "Three new challenge modules: Virulent Strain, Mutation, and Bio-Terrorist.", players: "2-5" },
    { name: "Pandemic: In the Lab", year: 2013, description: "New lab challenge adds a board for curing diseases.", players: "1-6" },
  ],
  "terraforming-mars": [
    { name: "Terraforming Mars: Hellas & Elysium", year: 2017, description: "Two new maps with different milestones and awards.", players: "1-5" },
    { name: "Terraforming Mars: Prelude", year: 2018, description: "Fast-start cards that give your corporation a head start.", players: "1-5" },
    { name: "Terraforming Mars: Colonies", year: 2018, description: "Colonize moons of Jupiter and Saturn for new resources.", players: "1-5" },
  ],
  root: [
    { name: "Root: The Riverfolk Expansion", year: 2018, description: "Adds the Riverfolk Company and Lizard Cult factions.", players: "1-6" },
    { name: "Root: The Underworld Expansion", year: 2020, description: "Adds the Underground Duchy and Corvid Conspiracy plus 2 new maps.", players: "1-6" },
  ],
  dominion: [
    { name: "Dominion: Intrigue", year: 2009, description: "Choice-based action cards and new victory cards.", players: "2-4" },
    { name: "Dominion: Seaside", year: 2009, description: "Duration cards that affect your next turn.", players: "2-4" },
    { name: "Dominion: Prosperity", year: 2010, description: "Platinum and Colony cards for higher-value games.", players: "2-4" },
  ],
  "spirit-island": [
    { name: "Spirit Island: Branch & Claw", year: 2017, description: "New spirits, event cards, and tokens for beasts and disease.", players: "1-4" },
    { name: "Spirit Island: Jagged Earth", year: 2020, description: "10 new spirits, new adversaries, and scenarios.", players: "1-6" },
  ],
};

export default function ExpansionInfo({ gameId, gameTitle }) {
  const [expansions, setExpansions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchExpansions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/games/${gameId}/expansions`);
        if (res.ok) {
          const data = await res.json();
          setExpansions(data.expansions || []);
          setLoading(false);
          return;
        }
      } catch {}
      setExpansions(MOCK_EXPANSIONS[gameId] || []);
      setLoading(false);
    };
    fetchExpansions();
  }, [gameId]);

  if (!loading && expansions.length === 0) return null;

  return (
    <div style={{
      marginTop: "12px", borderRadius: "12px",
      border: "1px solid var(--border)", overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "12px 16px",
          background: "var(--bg-card)", color: "var(--text-primary)",
          border: "none", cursor: "pointer", fontSize: "0.95rem",
          fontWeight: 600, textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📦</span>
          <span>Expansions ({loading ? "..." : expansions.length})</span>
        </span>
        <span style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", fontSize: "0.8rem",
        }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={{ padding: "8px 12px", background: "var(--bg-secondary)" }}>
          {loading ? (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <div style={{
                width: "20px", height: "20px", border: "2px solid var(--border)",
                borderTopColor: "var(--accent)", borderRadius: "50%",
                animation: "spinnerRotate 0.6s linear infinite",
                margin: "0 auto",
              }} />
            </div>
          ) : (
            expansions.map((exp, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px", marginBottom: "6px",
                  background: "var(--bg-primary)", borderRadius: "10px",
                  border: "1px solid var(--border)",
                  animation: "fadeIn 0.2s ease-out",
                  animationDelay: `${i * 0.05}s`,
                  animationFillMode: "both",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    {exp.name}
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {exp.year && (
                      <span style={{
                        fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px",
                        background: "var(--bg-card)", color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}>
                        {exp.year}
                      </span>
                    )}
                    {exp.players && (
                      <span style={{
                        fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px",
                        background: "var(--bg-card)", color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}>
                        {exp.players}p
                      </span>
                    )}
                  </div>
                </div>
                {exp.description && (
                  <p style={{
                    color: "var(--text-secondary)", fontSize: "0.8rem",
                    lineHeight: 1.5, margin: "4px 0 0 0",
                  }}>
                    {exp.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
