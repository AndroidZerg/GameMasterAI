import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { THEME, FONTS_LINK, styles } from "./swpTheme";
import SWPRentalNav from "./SWPRentalNav";
import {
  fetchRentalProfile,
  fetchRentalBillingPortal,
  cancelRentalReservation,
  initiateRentalReturn,
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

export default function SWPRentalProfile() {
  const navigate = useNavigate();
  const customerId = localStorage.getItem("swp_rental_customer");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    document.title = "My Rentals | SWP";
    if (!document.querySelector('link[href*="Fraunces"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS_LINK;
      document.head.appendChild(link);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!customerId) { navigate("/swp/rentals"); return; }
    try {
      const data = await fetchRentalProfile(customerId);
      if (!data.subscriber || data.subscriber.status !== "active") {
        localStorage.removeItem("swp_rental_customer");
        navigate("/swp/rentals");
        return;
      }
      setProfile(data);
    } catch {
      localStorage.removeItem("swp_rental_customer");
      navigate("/swp/rentals");
    } finally {
      setLoading(false);
    }
  }, [customerId, navigate]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleManageSubscription = async () => {
    try {
      const data = await fetchRentalBillingPortal(customerId);
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      setError(err.message || "Failed to open billing portal");
    }
  };

  const handleReturn = async () => {
    if (!returnDate) return;
    setReturning(true);
    try {
      await initiateRentalReturn({
        stripe_customer_id: customerId,
        return_date: returnDate,
      });
      setShowReturnModal(false);
      setReturnDate("");
      loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setReturning(false);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm(`Cancel your reservation for ${profile?.next_reservation?.game_title}?`)) return;
    setCancelling(true);
    try {
      await cancelRentalReservation({
        stripe_customer_id: customerId,
        reservation_id: reservationId,
      });
      loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const dateOptions = getDateOptions();

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: THEME.textSecondary }}>Loading profile...</p>
      </div>
    );
  }

  const sub = profile?.subscriber;
  const rental = profile?.current_rental;
  const reservation = profile?.next_reservation;
  const history = profile?.history || [];

  return (
    <div style={styles.page}>
      <SWPRentalNav subscriberName={sub?.name} />

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontFamily: THEME.fontHeading, fontSize: 26, fontWeight: 700, margin: "0 0 20px" }}>
          Your Rentals
        </h1>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
            padding: "12px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 14,
          }}>
            {error}
            <button onClick={() => setError(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>x</button>
          </div>
        )}

        {/* Profile card */}
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{sub?.name}</div>
          <div style={{ color: THEME.textSecondary, fontSize: 14, marginBottom: 4 }}>{sub?.email}</div>
          <div style={{ color: THEME.textSecondary, fontSize: 13 }}>Member since {sub?.member_since}</div>
        </div>

        {/* Current rental */}
        {rental && (
          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Currently Renting
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {rental.image_url && (
                <img src={rental.image_url} alt={rental.game_title}
                  style={{ width: 70, height: 70, borderRadius: 10, objectFit: "cover" }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{rental.game_title}</div>
                {rental.return_deadline && (
                  <div style={{ fontSize: 13, color: THEME.textSecondary }}>
                    Return by: {rental.return_deadline}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {rental.game_id && (
                    <Link to={`/game/${rental.game_id}`}
                      style={{ ...styles.tealBtn, padding: "8px 16px", fontSize: 13, textDecoration: "none" }}>
                      Learn to Play
                    </Link>
                  )}
                  <button onClick={() => setShowReturnModal(true)}
                    style={{ ...styles.ghostBtn, padding: "8px 16px", fontSize: 13 }}>
                    Return Game
                  </button>
                  <Link to="/swp/rentals/browse"
                    style={{ ...styles.ghostBtn, padding: "8px 16px", fontSize: 13, textDecoration: "none", color: THEME.primary }}>
                    Swap Game
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next reservation */}
        {reservation && (
          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#eab308", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Pending Reservation
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {reservation.image_url && (
                <img src={reservation.image_url} alt={reservation.game_title}
                  style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover" }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{reservation.game_title}</div>
                <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 8 }}>
                  Pick up by: {reservation.pickup_deadline}
                  {reservation.reservation_type === "swap" && " (swap)"}
                </div>
                <button
                  onClick={() => handleCancelReservation(reservation.reservation_id)}
                  disabled={cancelling}
                  style={{
                    background: "none", border: "none", color: "#dc2626",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    opacity: cancelling ? 0.5 : 1,
                  }}
                >
                  {cancelling ? "Cancelling..." : "Cancel Reservation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No active rental or reservation */}
        {!rental && !reservation && (
          <div style={{ ...styles.card, marginBottom: 20, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#127922;</div>
            <p style={{ color: THEME.textSecondary, marginBottom: 16 }}>You don't have a game right now.</p>
            <Link to="/swp/rentals/browse"
              style={{ ...styles.tealBtn, textDecoration: "none", display: "inline-block" }}>
              Browse Games
            </Link>
          </div>
        )}

        {/* Rental history */}
        {history.length > 0 && (
          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Rental History
            </div>
            {history.map((h, i) => (
              <div key={i} style={{
                padding: "10px 0",
                borderTop: i > 0 ? `1px solid ${THEME.cardBorder}` : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{h.game_title}</span>
                <span style={{ fontSize: 12, color: THEME.textSecondary }}>
                  {h.checked_out_at?.split("T")[0] || h.checked_out_at?.split(" ")[0]}
                  {h.returned_at && ` — ${h.returned_at.split("T")[0] || h.returned_at.split(" ")[0]}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
          <Link to="/swp/rentals/browse"
            style={{ ...styles.ghostBtn, flex: 1, textAlign: "center", textDecoration: "none" }}>
            Browse Games
          </Link>
          <button onClick={handleManageSubscription}
            style={{ ...styles.ghostBtn, flex: 1, borderColor: THEME.textSecondary, color: THEME.textSecondary }}>
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Return modal */}
      {showReturnModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReturnModal(false); }}
        >
          <div style={{ ...styles.card, maxWidth: 380, width: "100%" }}>
            <h3 style={{ fontFamily: THEME.fontHeading, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
              When can you return {rental?.game_title}?
            </h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setReturnDate(opt.value)}
                  style={{
                    flex: 1, padding: "12px 8px", borderRadius: 10,
                    border: returnDate === opt.value ? `2px solid ${THEME.primary}` : "2px solid #e5e7eb",
                    background: returnDate === opt.value ? "#f0fdfa" : "#fff",
                    cursor: "pointer", fontWeight: 600, fontSize: 14,
                    fontFamily: THEME.fontBody, color: THEME.text,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowReturnModal(false)}
                style={{ ...styles.ghostBtn, flex: 1, padding: "12px" }}>
                Cancel
              </button>
              <button onClick={handleReturn} disabled={!returnDate || returning}
                style={{ ...styles.tealBtn, flex: 1, padding: "12px", opacity: !returnDate || returning ? 0.5 : 1 }}>
                {returning ? "Confirming..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
