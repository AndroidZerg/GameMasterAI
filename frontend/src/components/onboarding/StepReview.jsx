import { useState } from "react";

export default function StepReview({ data, onComplete, onEditStep }) {
  const [launching, setLaunching] = useState(false);

  const handleLaunch = async () => {
    setLaunching(true);
    await onComplete();
    setLaunching(false);
  };

  const cardStyle = {
    background: "#152030", borderRadius: 10, padding: 16,
    border: "1px solid #2a3a4a", marginBottom: 16,
  };
  const headStyle = {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  };
  const editBtn = (step) => (
    <button onClick={() => onEditStep(step)} style={{
      background: "none", border: "1px solid #3498db", color: "#3498db",
      borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13,
    }}>Edit</button>
  );

  const hours = data.hours_json || {};
  const games = data.games || {};
  const menu = data.menu || [];

  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>Review & Launch</h2>
      <p style={{ color: "#8899aa", marginBottom: 24, fontSize: 14 }}>
        Review your setup, then launch GameMaster Guide for your venue.
      </p>

      {/* Venue Info */}
      <div style={cardStyle}>
        <div style={headStyle}>
          <h3 style={{ color: "#fff", margin: 0 }}>Venue Info</h3>
          {editBtn(1)}
        </div>
        <div style={{ color: "#ccc", fontSize: 14, lineHeight: 1.8 }}>
          <div><strong>{data.venue_name}</strong></div>
          {data.address && <div>{data.address}</div>}
          {(data.city || data.state) && <div>{[data.city, data.state, data.zip_code].filter(Boolean).join(", ")}</div>}
          {data.phone && <div>Phone: {data.phone}</div>}
          {data.contact_name && <div>Contact: {data.contact_name}</div>}
        </div>
      </div>

      {/* Games */}
      <div style={cardStyle}>
        <div style={headStyle}>
          <h3 style={{ color: "#fff", margin: 0 }}>Game Collection</h3>
          {editBtn(3)}
        </div>
        <div style={{ color: "#ccc", fontSize: 14 }}>
          <div>{(games.owned_game_ids || []).length} games owned</div>
          <div>{(games.priority_game_ids || []).length} priority games</div>
        </div>
      </div>

      {/* Menu */}
      <div style={cardStyle}>
        <div style={headStyle}>
          <h3 style={{ color: "#fff", margin: 0 }}>Menu</h3>
          {editBtn(4)}
        </div>
        <div style={{ color: "#ccc", fontSize: 14 }}>
          {menu.length === 0 ? (
            <div style={{ color: "#888" }}>No menu items added</div>
          ) : (
            menu.map((cat, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{cat.name}</div>
                {cat.items.map((item, j) => (
                  <div key={j} style={{ paddingLeft: 16, color: "#aaa" }}>
                    {item.name} — ${item.price_dollars?.toFixed(2)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <button onClick={handleLaunch} disabled={launching} style={{
        width: "100%", padding: "16px", background: "#e94560",
        color: "#fff", border: "none", borderRadius: 8, fontSize: 18,
        fontWeight: 700, cursor: launching ? "wait" : "pointer",
        opacity: launching ? 0.7 : 1, marginTop: 8,
      }}>
        {launching ? "Launching..." : "Launch GameMaster Guide"}
      </button>
    </div>
  );
}
