import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { THEME, STRIPE_PAYMENT_LINK, FONTS_LINK, styles } from "./swpTheme";
import { fetchRentalCatalog } from "../../services/api";

export default function SWPRentalLanding() {
  const [sampleGames, setSampleGames] = useState([]);

  useEffect(() => {
    document.title = "Game Rentals | Shall We Play?";
    // Load Google Fonts
    if (!document.querySelector('link[href*="Fraunces"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS_LINK;
      document.head.appendChild(link);
    }
    // Fetch sample games
    fetchRentalCatalog("shallweplay")
      .then((data) => setSampleGames((data.games || []).filter(g => g.status === "available").slice(0, 12)))
      .catch(() => {});
  }, []);

  return (
    <div style={styles.page}>
      {/* Top nav */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 24px", maxWidth: 1100, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: THEME.fontHeading, fontWeight: 700, fontSize: 20, color: THEME.text }}>
            Shall We Play?
          </span>
          <span style={{
            background: THEME.primary, color: "#fff", fontSize: 10,
            fontWeight: 700, padding: "2px 8px", borderRadius: 6, letterSpacing: 1,
          }}>
            RENTALS
          </span>
        </div>
        <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
          style={{ ...styles.primaryBtn, padding: "10px 20px", fontSize: 14, textDecoration: "none" }}>
          Subscribe Now
        </a>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth: 800, margin: "0 auto", padding: "60px 24px 40px", textAlign: "center",
      }}>
        <h1 style={{
          fontFamily: THEME.fontHeading, fontSize: 48, fontWeight: 800,
          color: THEME.text, margin: "0 0 16px", lineHeight: 1.1,
        }}>
          Board games,<br />delivered to your table.
        </h1>
        <p style={{ fontSize: 20, color: THEME.textSecondary, margin: "0 0 32px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          Subscribe for $10/month and take home one game at a time from our library of 438+ titles.
          Swap whenever you want.
        </p>
        <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
          style={{ ...styles.primaryBtn, fontSize: 18, padding: "16px 40px", textDecoration: "none", display: "inline-block" }}>
          Start Renting — $10/month
        </a>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 60px" }}>
        <h2 style={{
          fontFamily: THEME.fontHeading, fontSize: 28, fontWeight: 700,
          textAlign: "center", margin: "0 0 32px", color: THEME.text,
        }}>
          How It Works
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 24,
        }}>
          {[
            { step: "1", title: "Subscribe", desc: "Sign up for $10/month. Cancel anytime." },
            { step: "2", title: "Browse", desc: "Pick from 438+ board games in our library." },
            { step: "3", title: "Pick Up", desc: "Grab your game at Shall We Play? in Las Vegas." },
            { step: "4", title: "Swap", desc: "Return it and pick a new one whenever you're ready." },
          ].map((s) => (
            <div key={s.step} style={{
              ...styles.card, textAlign: "center", padding: 28,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: THEME.primary, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, margin: "0 auto 12px",
              }}>
                {s.step}
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{s.title}</div>
              <div style={{ color: THEME.textSecondary, fontSize: 14 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog preview */}
      {sampleGames.length > 0 && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}>
          <h2 style={{
            fontFamily: THEME.fontHeading, fontSize: 28, fontWeight: 700,
            textAlign: "center", margin: "0 0 32px", color: THEME.text,
          }}>
            Browse Our Collection
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 16,
          }}>
            {sampleGames.map((g) => (
              <div key={g.id} style={{
                ...styles.card, padding: 0, overflow: "hidden",
              }}>
                <div style={{
                  width: "100%", aspectRatio: "1", background: "#f0ece6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ fontSize: 32 }}>&#127922;</span>
                  )}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{g.title}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
              style={{ ...styles.primaryBtn, textDecoration: "none", display: "inline-block" }}>
              Subscribe to Browse All 438+ Games
            </a>
          </div>
        </section>
      )}

      {/* Already a member */}
      <section style={{ textAlign: "center", padding: "0 24px 60px" }}>
        <Link to="/swp/rentals/browse" style={{ color: THEME.primary, fontSize: 15, fontWeight: 600 }}>
          Already a member? Browse games &rarr;
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${THEME.cardBorder}`,
        padding: "24px", textAlign: "center",
        color: THEME.textSecondary, fontSize: 13,
      }}>
        Shall We Play? | Las Vegas, NV | Powered by GameMaster Guide
      </footer>
    </div>
  );
}
