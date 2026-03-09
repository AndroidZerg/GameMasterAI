import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { THEME, FONTS_LINK, styles } from "./swpTheme";
import SWPRentalNav from "./SWPRentalNav";
import {
  fetchRentalProfile,
  fetchRentalCatalog,
  createRentalReservation,
} from "../../services/api";

function getDateOptions() {
  const opts = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    opts.push({ label, value: d.toISOString().split("T")[0] });
  }
  return opts;
}

export default function SWPRentalBrowse() {
  const navigate = useNavigate();
  const customerId = localStorage.getItem("swp_rental_customer");

  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalGame, setModalGame] = useState(null);
  const [pickupDate, setPickupDate] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reserveMsg, setReserveMsg] = useState(null);

  useEffect(() => {
    document.title = "Browse Games | SWP Rentals";
    if (!document.querySelector('link[href*="Fraunces"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS_LINK;
      document.head.appendChild(link);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!customerId) { navigate("/swp/rentals"); return; }
    try {
      const [profileData, catalogData] = await Promise.all([
        fetchRentalProfile(customerId),
        fetchRentalCatalog("shallweplay"),
      ]);
      if (!profileData.subscriber || profileData.subscriber.status !== "active") {
        localStorage.removeItem("swp_rental_customer");
        navigate("/swp/rentals");
        return;
      }
      setProfile(profileData);
      setGames(catalogData.games || []);
    } catch {
      localStorage.removeItem("swp_rental_customer");
      navigate("/swp/rentals");
    } finally {
      setLoading(false);
    }
  }, [customerId, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const dateOptions = getDateOptions();

  const handleReserve = async () => {
    if (!pickupDate || !modalGame || !customerId) return;
    setReserving(true);
    try {
      const result = await createRentalReservation({
        stripe_customer_id: customerId,
        inventory_id: modalGame.id,
        pickup_deadline: pickupDate,
      });
      setReserveMsg(result.message || "Reserved!");
      setTimeout(() => {
        setModalGame(null);
        setReserveMsg(null);
        setPickupDate("");
        loadData();
      }, 2000);
    } catch (err) {
      setReserveMsg(err.message || "Reservation failed");
      setReserving(false);
    }
  };

  const filtered = games.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  const currentRental = profile?.current_rental;
  const hasCurrentRental = !!currentRental;

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: THEME.textSecondary, fontSize: 16 }}>Loading catalog...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <SWPRentalNav subscriberName={profile?.subscriber?.name} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Greeting */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontFamily: THEME.fontHeading, fontSize: 24, fontWeight: 700, margin: 0 }}>
            Hey {profile?.subscriber?.name?.split(" ")[0] || "there"}! &#128075;
          </h1>
          <Link to="/swp/rentals/profile" style={{ color: THEME.primary, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            My Rentals
          </Link>
        </div>

        {/* Current rental banner */}
        {hasCurrentRental && (
          <div style={{
            ...styles.card, padding: "14px 20px", marginBottom: 20,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>
              Currently renting: <strong>{currentRental.game_title}</strong>
            </span>
            {currentRental.game_id && (
              <Link to={`/game/${currentRental.game_id}`}
                style={{ color: THEME.primary, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Learn to Play &rarr;
              </Link>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search 438+ games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...styles.input, fontSize: 15 }}
          />
        </div>

        {/* Game grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 14,
        }}>
          {filtered.map((g) => {
            const isYours = hasCurrentRental && currentRental.game_title === g.title;
            const canReserve = g.status === "available" && !isYours;

            return (
              <div
                key={g.id}
                onClick={() => canReserve ? (setModalGame(g), setPickupDate(""), setReserveMsg(null), setReserving(false)) : null}
                style={{
                  ...styles.card, padding: 0, overflow: "hidden",
                  cursor: canReserve ? "pointer" : "default",
                  opacity: g.status !== "available" && !isYours ? 0.7 : 1,
                  transition: "transform 0.1s",
                }}
              >
                <div style={{
                  width: "100%", aspectRatio: "1", background: "#f0ece6",
                  position: "relative",
                }}>
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 32 }}>
                      &#127922;
                    </div>
                  )}
                  {/* Status badge */}
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: isYours ? THEME.primary
                      : g.status === "available" ? "#22c55e"
                      : g.status === "reserved" ? "#eab308"
                      : "#9ca3af",
                    color: "#fff",
                  }}>
                    {isYours ? "You have this!" : g.status === "available" ? "Available" : g.status === "reserved" ? "Reserved" : "Rented"}
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{g.title}</div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: THEME.textSecondary }}>
            No games found matching "{search}"
          </div>
        )}
      </div>

      {/* Reservation modal */}
      {modalGame && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setModalGame(null); } }}
        >
          <div style={{ ...styles.card, maxWidth: 400, width: "100%" }}>
            {reserveMsg ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>&#9989;</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>{reserveMsg}</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  {modalGame.image_url && (
                    <img src={modalGame.image_url} alt={modalGame.title}
                      style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <h3 style={{ fontFamily: THEME.fontHeading, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
                      {modalGame.title}
                    </h3>
                    <span style={{ fontSize: 13, color: THEME.textSecondary }}>Reserve this game</span>
                  </div>
                </div>

                {hasCurrentRental && (
                  <div style={{
                    background: "#fef3c7", borderRadius: 10, padding: "10px 14px",
                    marginBottom: 16, fontSize: 13, color: "#92400e",
                  }}>
                    This will be your return date for <strong>{currentRental.game_title}</strong>.
                  </div>
                )}

                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Pick up by:</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPickupDate(opt.value)}
                      style={{
                        flex: 1, padding: "12px 8px", borderRadius: 10,
                        border: pickupDate === opt.value ? `2px solid ${THEME.primary}` : "2px solid #e5e7eb",
                        background: pickupDate === opt.value ? "#f0fdfa" : "#fff",
                        cursor: "pointer", fontWeight: 600, fontSize: 14,
                        fontFamily: THEME.fontBody, color: THEME.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setModalGame(null)}
                    style={{ ...styles.ghostBtn, flex: 1, padding: "12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReserve}
                    disabled={!pickupDate || reserving}
                    style={{
                      ...styles.tealBtn, flex: 1, padding: "12px",
                      opacity: !pickupDate || reserving ? 0.5 : 1,
                    }}
                  >
                    {reserving ? "Reserving..." : "Reserve"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
