import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../../services/api";

const STRIPE_LINK = "https://buy.stripe.com/3cI6oA4Yldsb5ne5UG5Vu01";

const SWPRentalLanding = () => {
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [catalogGames, setCatalogGames] = useState([]);
  const [totalGames, setTotalGames] = useState(438);
  const sectionRefs = useRef({});

  useEffect(() => {
    document.title = "Game Rentals | Shall We Play?";
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.12 }
    );
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/rentals/catalog?venue_id=shallweplay`)
      .then(r => r.json())
      .then(data => {
        const games = (data.games || []).filter(g => g.status === "available").slice(0, 12);
        setCatalogGames(games);
        setTotalGames(data.total || data.games?.length || 438);
      })
      .catch(() => {});
  }, []);

  const r = (id) => (el) => { if (el) sectionRefs.current[id] = el; };
  const v = (id) => visibleSections.has(id);

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#faf9f6",
      color: "#2a2a2a",
      minHeight: "100vh",
      overflowX: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400;1,9..144,700&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal { opacity: 0; transform: translateY(24px); transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
        .reveal.show { opacity: 1; transform: translateY(0); }
        .cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 15px 32px; background: #C1432E; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700;
          border: none; border-radius: 50px; cursor: pointer; text-decoration: none;
          transition: all 0.25s ease;
        }
        .cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(193,67,46,0.2); }
        .cta-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 13px 24px; background: transparent; color: #C1432E;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          border: 1.5px solid rgba(193,67,46,0.25); border-radius: 50px;
          cursor: pointer; text-decoration: none; transition: all 0.25s ease;
        }
        .cta-ghost:hover { border-color: #C1432E; background: rgba(193,67,46,0.03); }
        .catalog-scroll {
          display: flex; gap: 14px; overflow-x: auto; padding: 4px 0 16px;
          scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
        }
        .catalog-scroll::-webkit-scrollbar { height: 3px; }
        .catalog-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
        .gcard {
          min-width: 150px; border-radius: 12px; overflow: hidden; background: white;
          border: 1px solid rgba(0,0,0,0.05); transition: all 0.25s ease; cursor: pointer;
          scroll-snap-align: start;
        }
        .gcard:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .faq-row { border-bottom: 1px solid rgba(0,0,0,0.05); padding: 18px 0; cursor: pointer; }
        .faq-row:last-child { border-bottom: none; }
        .check { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        @media (max-width: 768px) {
          .hero-row { flex-direction: column !important; }
          .steps-row { flex-direction: column !important; }
          .credit-row { flex-direction: column !important; }
          .h1 { font-size: 38px !important; }
          .pad { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 40 ? "rgba(250,249,246,0.95)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(16px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(0,0,0,0.05)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div className="pad" style={{
          maxWidth: 1060, margin: "0 auto", padding: "0 40px",
          height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", overflow: "hidden",
              background: "#2BA5B5", display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 14,
            }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Shall We Play?</span>
            <span style={{
              fontSize: 10, color: "#2BA5B5", background: "rgba(43,165,181,0.07)",
              padding: "2px 8px", borderRadius: 12, fontWeight: 600, letterSpacing: "0.3px",
            }}>RENTALS</span>
          </div>
          <a href={STRIPE_LINK} className="cta" style={{ padding: "8px 20px", fontSize: 13 }}>
            $9.99/mo →
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <div className="pad" style={{ maxWidth: 1060, margin: "0 auto", padding: "100px 40px 60px", width: "100%" }}>
          <div className="hero-row" style={{ display: "flex", alignItems: "center", gap: 56 }}>
            <div style={{ flex: "1 1 55%" }}>
              <h1 className="h1" style={{
                fontFamily: "'Fraunces', serif", fontSize: 52, lineHeight: 1.08,
                fontWeight: 700, marginBottom: 18,
                animation: "fadeUp 0.6s ease both",
              }}>
                Take the game{" "}
                <span style={{ color: "#2BA5B5", fontStyle: "italic", fontWeight: 400 }}>home</span>.
              </h1>
              <p style={{
                fontSize: 17, lineHeight: 1.6, color: "#777", maxWidth: 400, marginBottom: 10,
                animation: "fadeUp 0.6s ease both 0.1s", opacity: 0,
              }}>
                Rent a board game for <strong style={{ color: "#2a2a2a" }}>$9.99/month</strong>.
                Play it at home. Swap it whenever you're ready.
              </p>
              <p style={{
                fontSize: 15, color: "#C1432E", fontWeight: 600, marginBottom: 32,
                animation: "fadeUp 0.6s ease both 0.18s", opacity: 0,
              }}>
                Love it? Buy it — your $9.99 goes toward the price.
              </p>
              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                animation: "fadeUp 0.6s ease both 0.25s", opacity: 0,
              }}>
                <a href={STRIPE_LINK} className="cta">Start Renting →</a>
                <a href="#how" className="cta-ghost">How it works</a>
              </div>
            </div>

            {/* Pricing Card */}
            <div style={{ flex: "1 1 40%", animation: "fadeUp 0.7s ease both 0.15s", opacity: 0 }}>
              <div style={{
                background: "white", border: "1px solid rgba(0,0,0,0.07)",
                borderRadius: 18, padding: "32px 28px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.03)",
              }}>
                <div style={{ fontSize: 12, color: "#aaa", fontWeight: 500, marginBottom: 2 }}>MONTHLY RENTAL</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 20 }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 44, fontWeight: 700 }}>$9.99</span>
                  <span style={{ fontSize: 14, color: "#aaa" }}>/mo</span>
                </div>
                <div style={{ height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 18 }} />
                {[
                  { t: "One game at a time, swap anytime", accent: false },
                  { t: "$9.99 credit toward purchase", accent: true },
                  { t: "Step-by-step learning guides", accent: false },
                  { t: "No late fees, cancel anytime", accent: false },
                  { t: "Pick up at Shall We Play?", accent: false },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    fontSize: 13.5, color: item.accent ? "#C1432E" : "#555",
                    fontWeight: item.accent ? 600 : 400,
                  }}>
                    <div className="check" style={{
                      background: item.accent ? "rgba(193,67,46,0.07)" : "rgba(43,165,181,0.07)",
                      color: item.accent ? "#C1432E" : "#2BA5B5",
                    }}>✓</div>
                    {item.t}
                  </div>
                ))}
                <a href={STRIPE_LINK} className="cta" style={{
                  width: "100%", justifyContent: "center", marginTop: 20, padding: "13px 28px",
                }}>Subscribe Now</a>
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#bbb" }}>Cancel anytime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG */}
      <section id="catalog" ref={r("catalog")} className={`reveal ${v("catalog") ? "show" : ""}`}>
        <div className="pad" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 40px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                Browse the catalog
              </h2>
              <p style={{ fontSize: 14, color: "#999" }}>{totalGames} games and growing.</p>
            </div>
            <a href="/swp/rentals/browse" className="cta-ghost" style={{ fontSize: 12, padding: "8px 16px" }}>
              See all →
            </a>
          </div>
          <div className="catalog-scroll">
            {catalogGames.map((g, i) => (
              <div key={i} className="gcard" style={{ minWidth: 144, maxWidth: 144 }}>
                <div style={{
                  width: 144, height: 108,
                  background: `url(${g.image_url}) center/cover`, backgroundColor: "#eee",
                }} />
                <div style={{
                  padding: "8px 10px", fontSize: 12.5, fontWeight: 600,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{g.title}</div>
              </div>
            ))}
            {totalGames > 12 && (
              <div style={{
                minWidth: 72, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: "#bbb", fontWeight: 500,
              }}>+{Math.max(0, totalGames - 12)} more</div>
            )}
          </div>
        </div>
      </section>

      {/* RENTAL CREDIT */}
      <section id="credit" ref={r("credit")} className={`reveal ${v("credit") ? "show" : ""}`}>
        <div className="pad" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 40px 60px" }}>
          <div style={{
            background: "white", border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 18, padding: "40px 36px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
          }}>
            <div className="credit-row" style={{ display: "flex", alignItems: "center", gap: 48 }}>
              <div style={{ flex: "1 1 55%" }}>
                <h2 style={{
                  fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700,
                  lineHeight: 1.15, marginBottom: 12,
                }}>
                  Every rental is a down payment on{" "}
                  <span style={{ color: "#C1432E", fontStyle: "italic", fontWeight: 400 }}>ownership</span>.
                </h2>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#888", maxWidth: 400, marginBottom: 24 }}>
                  Buy any game you're renting and your $9.99 is applied as a credit.
                  Try before you buy.
                </p>
                <div style={{
                  background: "#faf9f6", border: "1px solid rgba(0,0,0,0.05)",
                  borderRadius: 12, padding: "16px 20px", display: "inline-block",
                }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>
                    EXAMPLE: WINGSPAN
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ textDecoration: "line-through", color: "#ccc", fontSize: 17 }}>$44.99</span>
                    <span style={{ color: "#ddd" }}>→</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "#2BA5B5" }}>$35.00</span>
                    <span style={{
                      background: "rgba(43,165,181,0.07)", color: "#2BA5B5",
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    }}>-$9.99</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 6 }}>One-time credit per purchase</div>
                </div>
              </div>
              <div style={{ flex: "1 1 40%" }}>
                {[
                  { n: "1", t: "Rent it", d: "Browse the catalog and take a game home." },
                  { n: "2", t: "Play it", d: "Host game night. Use the learning guides if you need them." },
                  { n: "3", t: "Buy it or swap it", d: "Keep it with your credit, or pick your next game." },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#2BA5B5",
                      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>{s.n}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.t}</div>
                      <div style={{ fontSize: 13, color: "#999", lineHeight: 1.5 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" ref={r("how")} className={`reveal ${v("how") ? "show" : ""}`}>
        <div className="pad" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 40px 60px" }}>
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700,
            textAlign: "center", marginBottom: 36,
          }}>How it works</h2>
          <div className="steps-row" style={{ display: "flex", gap: 18 }}>
            {[
              { icon: "📱", title: "Subscribe", desc: "Scan the QR in-store or sign up online. $9.99/month." },
              { icon: "🎲", title: "Reserve", desc: "Pick a game. Choose your pickup day." },
              { icon: "🏪", title: "Pick up", desc: "Staff has it set aside for you." },
              { icon: "🔄", title: "Swap or buy", desc: "Reserve your next game. That's your return date." },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: "white", border: "1px solid rgba(0,0,0,0.05)",
                borderRadius: 14, padding: "24px 20px", textAlign: "center",
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#999" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEARNING GUIDES */}
      <section id="guides" ref={r("guides")} className={`reveal ${v("guides") ? "show" : ""}`}>
        <div className="pad" style={{ maxWidth: 1060, margin: "0 auto", padding: "20px 40px 60px" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(43,165,181,0.04), rgba(193,67,46,0.02))",
            border: "1px solid rgba(43,165,181,0.08)", borderRadius: 18,
            padding: "40px 36px", textAlign: "center",
          }}>
            <h2 style={{
              fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, marginBottom: 10,
            }}>Never read a rulebook again.</h2>
            <p style={{
              fontSize: 15, lineHeight: 1.6, color: "#888", maxWidth: 420, margin: "0 auto 22px",
            }}>
              Every rental includes a step-by-step learning guide.
              Setup, rules, and strategy — explained like a friend teaching you at the table.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              {["Setup walkthrough", "Rules explained simply", "Strategy tips", "Voice-powered"].map((f, i) => (
                <span key={i} style={{
                  fontSize: 12.5, color: "#2BA5B5", fontWeight: 600,
                  background: "rgba(43,165,181,0.06)", padding: "5px 14px", borderRadius: 16,
                }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" ref={r("faq")} className={`reveal ${v("faq") ? "show" : ""}`}>
        <div className="pad" style={{ maxWidth: 600, margin: "0 auto", padding: "20px 40px 60px" }}>
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700,
            marginBottom: 24, textAlign: "center",
          }}>Questions</h2>
          {[
            { q: "How many games at once?", a: "One at a time. Reserve your next game and bring the current one back." },
            { q: "Are there late fees?", a: "Nope. Keep it as long as you want." },
            { q: "How does the purchase credit work?", a: "Buy a game you're renting and your $9.99 monthly fee is applied once as a discount." },
            { q: "Can I cancel?", a: "Anytime. Return your game and you're done." },
            { q: "Where do I pick up?", a: "Shall We Play? in Las Vegas. Reserve online and it's ready when you arrive." },
          ].map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "20px 40px 80px", textAlign: "center" }}>
        <h2 style={{
          fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 10,
        }}>
          Game night starts at <span style={{ color: "#2BA5B5", fontStyle: "italic", fontWeight: 400 }}>$9.99</span>.
        </h2>
        <p style={{ fontSize: 15, color: "#999", marginBottom: 24 }}>
          Subscribe today. Pick up your first game tomorrow.
        </p>
        <a href={STRIPE_LINK} className="cta" style={{ fontSize: 16, padding: "16px 40px" }}>
          Start Renting →
        </a>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid rgba(0,0,0,0.05)", padding: "28px 40px", textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: "#bbb" }}>
          <strong style={{ color: "#888" }}>Shall We Play?</strong> × GameMaster Guide · Las Vegas, NV
        </div>
      </footer>

      {/* MEMBER LINK */}
      <section style={{ textAlign: "center", padding: "0 24px 40px" }}>
        <a href="/swp/rentals/browse" style={{ color: "#2BA5B5", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Already a member? Browse games →
        </a>
      </section>
    </div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-row" onClick={() => setOpen(!open)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{question}</span>
        <span style={{
          fontSize: 18, color: "#2BA5B5", transition: "transform 0.3s ease",
          transform: open ? "rotate(45deg)" : "rotate(0)", flexShrink: 0, marginLeft: 12,
        }}>+</span>
      </div>
      <div style={{
        maxHeight: open ? 120 : 0, overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)", opacity: open ? 1 : 0,
      }}>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#999", paddingTop: 8 }}>{answer}</p>
      </div>
    </div>
  );
};

export default SWPRentalLanding;
