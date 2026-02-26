import { useState, useEffect, useCallback } from "react";
import { fetchVenueMenu, placeOrder, API_BASE, fetchExpansions } from "../services/api";

const MOCK_MENU = {
  categories: [
    {
      name: "Hot Drinks", icon: "\u2615",
      items: [
        { name: "Drip Coffee", price: 3.50, description: "House blend" },
        { name: "Latte", price: 5.00, description: "Espresso + steamed milk" },
        { name: "Cappuccino", price: 5.00, description: "Espresso + foam" },
        { name: "Hot Chocolate", price: 4.50, description: "Rich & creamy" },
        { name: "Chai Latte", price: 5.50, description: "Spiced tea latte" },
      ],
    },
    {
      name: "Cold Drinks", icon: "\uD83E\uDDCA",
      items: [
        { name: "Iced Coffee", price: 4.50, description: "Cold brew style" },
        { name: "Iced Tea", price: 3.50, description: "Black or green" },
        { name: "Lemonade", price: 4.00, description: "Fresh squeezed" },
        { name: "Smoothie", price: 6.50, description: "Berry or mango" },
      ],
    },
    {
      name: "Beer & Wine", icon: "\uD83C\uDF7A",
      items: [
        { name: "IPA Draft", price: 7.00, description: "Local craft" },
        { name: "Lager Draft", price: 6.00, description: "Light & crisp" },
        { name: "Hard Cider", price: 7.00, description: "Dry apple" },
        { name: "House Red Wine", price: 8.00, description: "Glass" },
        { name: "House White Wine", price: 8.00, description: "Glass" },
      ],
    },
    {
      name: "Food", icon: "\uD83C\uDF55",
      items: [
        { name: "Flatbread Pizza", price: 12.00, description: "Margherita or pepperoni" },
        { name: "Loaded Nachos", price: 10.00, description: "Cheese, jalape\u00f1os, salsa" },
        { name: "Soft Pretzel", price: 7.00, description: "With beer cheese dip" },
        { name: "Chicken Tenders", price: 9.00, description: "With fries & ranch" },
        { name: "Grilled Cheese", price: 8.00, description: "Three cheese blend" },
      ],
    },
    {
      name: "Snacks", icon: "\uD83C\uDF7F",
      items: [
        { name: "Popcorn", price: 3.00, description: "Butter or white cheddar" },
        { name: "Trail Mix", price: 4.00, description: "Nuts, chocolate, dried fruit" },
        { name: "Cookies", price: 3.50, description: "Chocolate chip (2 pack)" },
        { name: "Brownie", price: 4.00, description: "Double chocolate" },
      ],
    },
  ],
};

const ACCESSORIES = [
  { id: "card-sleeves", name: "Card Sleeves", price: 5.99, description: "Protect your cards" },
  { id: "dice-set", name: "Dice Set", price: 8.99, description: "7-piece polyhedral set" },
  { id: "game-organizer", name: "Game Organizer Insert", price: 14.99, description: "Custom foam insert" },
  { id: "playmat", name: "Playmat", price: 19.99, description: "Neoprene 24\u00d714 inch" },
];

const EXPANSION_PRICES = {
  "Catan: Seafarers": 34.99, "Catan: Cities & Knights": 39.99, "Catan: Traders & Barbarians": 34.99,
  "Wingspan: European Expansion": 29.99, "Wingspan: Oceania Expansion": 29.99, "Wingspan: Asia Expansion": 34.99,
  "Ticket to Ride: Europe": 39.99, "Ticket to Ride: Nordic Countries": 34.99,
  "Pandemic: On the Brink": 29.99, "Pandemic: In the Lab": 29.99,
  "Terraforming Mars: Hellas & Elysium": 19.99, "Terraforming Mars: Prelude": 24.99, "Terraforming Mars: Colonies": 29.99,
  "Root: The Riverfolk Expansion": 34.99, "Root: The Underworld Expansion": 39.99,
  "Dominion: Intrigue": 34.99, "Dominion: Seaside": 34.99, "Dominion: Prosperity": 34.99,
  "Spirit Island: Branch & Claw": 29.99, "Spirit Island: Jagged Earth": 39.99,
};

function cartKey(sessionId) {
  return `gmai-cart-${sessionId || "local"}`;
}

function loadCart(sessionId) {
  try { return JSON.parse(localStorage.getItem(cartKey(sessionId))) || []; } catch { return []; }
}

function saveCart(sessionId, cart) {
  try { localStorage.setItem(cartKey(sessionId), JSON.stringify(cart)); } catch {}
}

/* ── Add to Cart button ─────────────────────────────────── */
function AddToCartBtn({ item, category, cart, setCart, sessionId }) {
  const existing = cart.find((c) => c.name === item.name && c.category === category);
  const qty = existing?.quantity || 0;

  const add = () => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.name === item.name && c.category === category);
      let next;
      if (idx >= 0) {
        next = prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c);
      } else {
        next = [...prev, { item_id: item.id || item.name.toLowerCase().replace(/\s+/g, "-"), name: item.name, price: item.price, quantity: 1, category }];
      }
      saveCart(sessionId, next);
      return next;
    });
  };

  const remove = () => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.name === item.name && c.category === category);
      if (idx < 0) return prev;
      let next;
      if (prev[idx].quantity <= 1) {
        next = prev.filter((_, i) => i !== idx);
      } else {
        next = prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c);
      }
      saveCart(sessionId, next);
      return next;
    });
  };

  if (qty > 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button onClick={remove} style={{
          width: "30px", height: "30px", borderRadius: "8px", border: "1px solid var(--border)",
          background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "1rem",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>-</button>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", minWidth: "20px", textAlign: "center" }}>{qty}</span>
        <button onClick={add} style={{
          width: "30px", height: "30px", borderRadius: "8px", border: "none",
          background: "var(--accent)", color: "#fff", fontSize: "1rem",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>+</button>
      </div>
    );
  }

  return (
    <button onClick={add} style={{
      padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600,
      background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer",
      whiteSpace: "nowrap",
    }}>
      Add
    </button>
  );
}

/* ── Cart Detail / Checkout ──────────────────────────────── */
function CartDetail({ cart, setCart, sessionId, onPlaceOrder }) {
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const updateQty = (idx, delta) => {
    setCart((prev) => {
      const next = prev.map((c, i) => {
        if (i !== idx) return c;
        const newQty = c.quantity + delta;
        return newQty <= 0 ? null : { ...c, quantity: newQty };
      }).filter(Boolean);
      saveCart(sessionId, next);
      return next;
    });
  };

  const removeItem = (idx) => {
    setCart((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveCart(sessionId, next);
      return next;
    });
  };

  const handlePlace = async () => {
    setPlacing(true);
    try {
      await onPlaceOrder(cart, subtotal);
      setCart([]);
      saveCart(sessionId, []);
      setPlaced(true);
    } catch {
      // still clear locally
    }
    setPlacing(false);
  };

  if (placed) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>&#x2705;</div>
        <h2 style={{ color: "var(--text-primary)", fontSize: "1.3rem", marginBottom: "8px" }}>Order placed!</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Your server will be with you shortly.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "16px" }}>Your Cart</h2>

      {cart.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>Cart is empty</p>
      ) : (
        <>
          {cart.map((item, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "12px",
              marginBottom: "8px", background: "var(--bg-secondary)", borderRadius: "10px",
              border: "1px solid var(--border)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>{item.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  ${item.price.toFixed(2)} each
                  {item.category && <span> &middot; {item.category}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button onClick={() => updateQty(idx, -1)} style={{
                  width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--border)",
                  background: "var(--bg-primary)", color: "var(--text-primary)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
                }}>-</button>
                <span style={{ fontWeight: 700, minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} style={{
                  width: "28px", height: "28px", borderRadius: "6px", border: "none",
                  background: "var(--accent)", color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
                }}>+</button>
              </div>
              <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: "60px", textAlign: "right" }}>
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <button onClick={() => removeItem(idx)} style={{
                background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer",
                fontSize: "1rem", padding: "4px",
              }}>&times;</button>
            </div>
          ))}

          <div style={{
            display: "flex", justifyContent: "space-between", padding: "16px 0",
            borderTop: "1px solid var(--border)", marginTop: "8px",
          }}>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1.05rem" }}>Subtotal</span>
            <span style={{ fontWeight: 800, color: "var(--accent)", fontSize: "1.15rem" }}>${subtotal.toFixed(2)}</span>
          </div>

          <button disabled style={{
            width: "100%", padding: "14px", borderRadius: "12px",
            background: "#6b7280",
            color: "#fff", border: "none", fontSize: "0.95rem", fontWeight: 600,
            cursor: "not-allowed", opacity: 0.8,
          }}>
            Ordering available at participating venues.
          </button>
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN: OrderPanel
   ═════════════════════════════════════════════════════════════ */
export default function OrderPanel({ open, onClose, gameId, gameTitle, gamePrice, sessionId }) {
  const [tab, setTab] = useState("games"); // "games" | "menu"
  const [showCart, setShowCart] = useState(false);
  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState(() => loadCart(sessionId));
  const [expansions, setExpansions] = useState([]);

  // Load menu data
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    fetchVenueMenu()
      .then((data) => {
        if (!mounted) return;
        if (!data.categories && data.sections) data.categories = data.sections;
        setMenu(data);
      })
      .catch(() => { if (mounted) setMenu(MOCK_MENU); });
    return () => { mounted = false; };
  }, [open]);

  // Load expansions for this game
  useEffect(() => {
    if (!open || !gameId) return;
    let mounted = true;
    fetchExpansions(gameId)
      .then((data) => { if (mounted) setExpansions(data.expansions || data || []); })
      .catch(() => { if (mounted) setExpansions([]); });
    return () => { mounted = false; };
  }, [open, gameId]);

  // Sync cart with localStorage on sessionId change
  useEffect(() => {
    setCart(loadCart(sessionId));
  }, [sessionId]);

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handlePlaceOrder = async (items, subtotal) => {
    const venueId = localStorage.getItem("gmai_venue_id") || null;
    await placeOrder({
      venue_id: venueId,
      session_id: sessionId || null,
      items,
      total: subtotal,
      submitted_at: new Date().toISOString(),
    });
    // Save order locally
    try {
      const orders = JSON.parse(localStorage.getItem("gmai-orders") || "[]");
      orders.push({ items, total: subtotal, submitted_at: new Date().toISOString() });
      localStorage.setItem("gmai-orders", JSON.stringify(orders));
    } catch {}
  };

  if (!open) return null;

  const menuCategories = (menu || MOCK_MENU).categories || [];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1300,
      background: "rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }} onClick={onClose}>
      <div
        style={{
          background: "var(--bg-primary)", borderRadius: "20px 20px 0 0",
          height: "90vh", display: "flex", flexDirection: "column",
          animation: "slideUp 0.25s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* DEMO Banner — visible for all roles */}
        <div style={{
          background: "#6b7280",
          color: "#fff",
          textAlign: "center",
          padding: "8px 16px",
          fontSize: "0.8rem",
          fontWeight: 700,
          letterSpacing: "0.05em",
          flexShrink: 0,
          borderRadius: "20px 20px 0 0",
        }}>
          DEMO
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {showCart && (
              <button onClick={() => setShowCart(false)} style={{
                background: "none", border: "none", color: "var(--text-secondary)",
                cursor: "pointer", fontSize: "1rem", padding: "4px 8px",
              }}>&larr;</button>
            )}
            <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
              {showCart ? "Cart" : "Order"}
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border)", fontSize: "1rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&times;</button>
        </div>

        {showCart ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CartDetail cart={cart} setCart={setCart} sessionId={sessionId} onPlaceOrder={handlePlaceOrder} />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{
              display: "flex", gap: "4px", padding: "12px 20px 0", flexShrink: 0,
            }}>
              {[{ key: "games", label: "Games & Accessories" }, { key: "menu", label: "Menu" }].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: "10px", borderRadius: "10px 10px 0 0", fontWeight: 600,
                  fontSize: "0.9rem", cursor: "pointer",
                  background: tab === t.key ? "var(--bg-secondary)" : "transparent",
                  color: tab === t.key ? "var(--text-primary)" : "var(--text-secondary)",
                  border: tab === t.key ? "1px solid var(--border)" : "1px solid transparent",
                  borderBottom: tab === t.key ? "1px solid var(--bg-secondary)" : "1px solid var(--border)",
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", paddingBottom: totalItems > 0 ? "90px" : "20px" }}>
              {tab === "games" && (
                <div>
                  {/* Current game */}
                  <div style={{
                    display: "flex", gap: "14px", padding: "16px",
                    background: "var(--bg-secondary)", borderRadius: "12px",
                    border: "1px solid var(--border)", marginBottom: "20px",
                  }}>
                    <img
                      src={`${API_BASE}/api/images/${gameId}.jpg`}
                      alt={gameTitle}
                      onError={(e) => { e.target.style.display = "none"; }}
                      style={{
                        width: "60px", height: "60px", borderRadius: "10px",
                        objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{gameTitle}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>The game you're playing</div>
                      {gamePrice && (
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent)", marginTop: "4px" }}>${gamePrice.toFixed(2)}</div>
                      )}
                    </div>
                    {gamePrice && (
                      <AddToCartBtn
                        item={{ id: gameId, name: gameTitle, price: gamePrice }}
                        category="Games"
                        cart={cart} setCart={setCart} sessionId={sessionId}
                      />
                    )}
                  </div>

                  {/* Expansions */}
                  {expansions.length > 0 && (
                    <>
                      <h3 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "12px" }}>
                        Expansions
                      </h3>
                      {expansions.map((exp, i) => {
                        const price = EXPANSION_PRICES[exp.name] || 29.99;
                        return (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                            marginBottom: "8px", background: "var(--bg-secondary)", borderRadius: "10px",
                            border: "1px solid var(--border)",
                          }}>
                            <div style={{
                              width: "44px", height: "44px", borderRadius: "8px",
                              background: "var(--bg-card)", display: "flex", alignItems: "center",
                              justifyContent: "center", fontSize: "1.3rem", flexShrink: 0,
                            }}>
                              {"\uD83D\uDCE6"}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>{exp.name}</div>
                              {exp.description && (
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{exp.description}</div>
                              )}
                              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>${price.toFixed(2)}</div>
                            </div>
                            <AddToCartBtn
                              item={{ id: exp.name.toLowerCase().replace(/[\s:&]+/g, "-"), name: exp.name, price }}
                              category="Expansions"
                              cart={cart} setCart={setCart} sessionId={sessionId}
                            />
                          </div>
                        );
                      })}
                      <div style={{ height: "8px" }} />
                    </>
                  )}

                  {/* Accessories */}
                  <h3 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "12px" }}>
                    Pairs Well With This Game
                  </h3>
                  {ACCESSORIES.map((acc) => (
                    <div key={acc.id} style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                      marginBottom: "8px", background: "var(--bg-secondary)", borderRadius: "10px",
                      border: "1px solid var(--border)",
                    }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "8px",
                        background: "var(--bg-card)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "1.3rem", flexShrink: 0,
                      }}>
                        {acc.id === "card-sleeves" ? "\uD83C\uDCCF" : acc.id === "dice-set" ? "\uD83C\uDFB2" : acc.id === "game-organizer" ? "\uD83D\uDCE6" : "\uD83E\uDDFA"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>{acc.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{acc.description}</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>${acc.price.toFixed(2)}</div>
                      </div>
                      <AddToCartBtn item={acc} category="Accessories" cart={cart} setCart={setCart} sessionId={sessionId} />
                    </div>
                  ))}
                </div>
              )}

              {tab === "menu" && (
                <div>
                  {menuCategories.map((cat) => (
                    <div key={cat.name} style={{ marginBottom: "20px" }}>
                      <h3 style={{
                        fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)",
                        marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px",
                        borderBottom: "1px solid var(--border)", paddingBottom: "6px",
                      }}>
                        <span>{cat.icon}</span> {cat.name}
                      </h3>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "8px",
                      }}>
                        {cat.items.map((item, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "12px 14px", background: "var(--bg-secondary)",
                            borderRadius: "10px", border: "1px solid var(--border)",
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{item.name}</span>
                                {item.badge && (
                                  <span style={{
                                    fontSize: "0.65rem", padding: "1px 6px", borderRadius: "999px",
                                    background: item.badge === "New" ? "#22c55e" : "var(--accent)",
                                    color: "#fff", fontWeight: 700,
                                  }}>{item.badge}</span>
                                )}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "1px" }}>{item.description}</div>
                              )}
                              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>${item.price.toFixed(2)}</div>
                            </div>
                            <AddToCartBtn item={item} category={cat.name} cart={cart} setCart={setCart} sessionId={sessionId} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart summary bar */}
            {totalItems > 0 && (
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
                padding: "12px 20px", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.1rem" }}>{"\uD83D\uDED2"}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    {totalItems} item{totalItems !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ fontWeight: 800, color: "var(--accent)", fontSize: "1.05rem" }}>
                  ${totalPrice.toFixed(2)}
                </span>
                <button onClick={() => setShowCart(true)} style={{
                  padding: "10px 20px", borderRadius: "10px", fontWeight: 700,
                  background: "var(--accent)", color: "#fff", border: "none",
                  cursor: "pointer", fontSize: "0.9rem",
                }}>
                  View Cart & Checkout
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CountdownTimer — overlay modal
   ═════════════════════════════════════════════════════════════ */
export function CountdownTimer({ open, onClose }) {
  const [minutes, setMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setRunning(false);
      // Simple alert beep
      try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZqTi3ttX1Vmcn+LlJ6di3ptXVVlcn+Lk5ybi3lvXlZmcn+Kk5yai3lvXlZmcn+Kk5yai3hvXlZlcX6Jkpuai3lvXlVlcX6JkZqZiXhvXlZlcX6JkZqZiXhvXlZlcX6JkZqZiXhvXlZlcX6IkJmYh3duXFRjb3yHj5eWhXVrYFhhbn2Ij5iXhXRrX1dga3uGjZSThHRqXlZfanuFjJOSgnNpXVVeanqDi5GOgHFnW1NcaHmBiY+NfnBmWlJbZniAh42LfG5lWFFaZXd/ho2KemxjV09YY3V9hIqIeGphVk5XYnR8g4mHdmhfVExWYXN7goiGdGdeSg==").play(); } catch {}
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, secondsLeft]);

  const startTimer = () => {
    if (minutes <= 0) return;
    setSecondsLeft(minutes * 60);
    setRunning(true);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 1400, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-primary)", borderRadius: "16px", padding: "24px",
        width: "100%", maxWidth: "320px", border: "1px solid var(--border)", textAlign: "center",
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "16px", fontSize: "1.1rem" }}>
          {running ? "Timer Running" : "Countdown Timer"}
        </h3>

        {secondsLeft !== null && secondsLeft > 0 ? (
          <>
            <div style={{
              fontSize: "3rem", fontWeight: 800, fontFamily: "monospace",
              color: secondsLeft <= 10 ? "#ef4444" : "var(--accent)", marginBottom: "16px",
              animation: secondsLeft <= 10 ? "pulse 1s infinite" : "none",
            }}>
              {formatTime(secondsLeft)}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => { setRunning(false); setSecondsLeft(null); }} style={{
                padding: "10px 24px", borderRadius: "10px", background: "var(--bg-secondary)",
                color: "var(--text-primary)", border: "1px solid var(--border)",
                fontWeight: 600, cursor: "pointer",
              }}>Reset</button>
              <button onClick={() => setRunning(!running)} style={{
                padding: "10px 24px", borderRadius: "10px",
                background: running ? "#f59e0b" : "var(--accent)",
                color: "#fff", border: "none", fontWeight: 600, cursor: "pointer",
              }}>{running ? "Pause" : "Resume"}</button>
            </div>
          </>
        ) : secondsLeft === 0 ? (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>&#x23F0;</div>
            <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "16px" }}>Time's up!</p>
            <button onClick={() => { setSecondsLeft(null); setRunning(false); }} style={{
              padding: "10px 24px", borderRadius: "10px", background: "var(--accent)",
              color: "#fff", border: "none", fontWeight: 600, cursor: "pointer",
            }}>OK</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
              <button onClick={() => setMinutes((m) => Math.max(1, m - 1))} style={{
                width: "40px", height: "40px", borderRadius: "10px", fontSize: "1.2rem",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border)", cursor: "pointer",
              }}>-</button>
              <input
                type="number" value={minutes} min={1} max={120}
                onChange={(e) => setMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                style={{
                  width: "70px", textAlign: "center", fontSize: "1.5rem", fontWeight: 700,
                  fontFamily: "monospace", borderRadius: "10px", border: "1px solid var(--border)",
                  background: "var(--bg-primary)", color: "var(--text-primary)", padding: "8px",
                }}
              />
              <button onClick={() => setMinutes((m) => Math.min(120, m + 1))} style={{
                width: "40px", height: "40px", borderRadius: "10px", fontSize: "1.2rem",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border)", cursor: "pointer",
              }}>+</button>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>min</span>
            </div>
            <button onClick={startTimer} style={{
              padding: "12px 32px", borderRadius: "12px", fontSize: "1rem", fontWeight: 700,
              background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer",
            }}>Start Timer</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Floating timer badge (when timer running outside modal) ── */
export function TimerBadge({ secondsLeft, running, onClick }) {
  if (!running || secondsLeft === null || secondsLeft <= 0) return null;
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return (
    <button onClick={onClick} style={{
      position: "fixed", top: "12px", right: "12px", zIndex: 1100,
      padding: "6px 12px", borderRadius: "999px",
      background: secondsLeft <= 10 ? "#ef4444" : "var(--accent)",
      color: "#fff", border: "none", fontWeight: 700, fontSize: "0.85rem",
      fontFamily: "monospace", cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      animation: secondsLeft <= 10 ? "pulse 1s infinite" : "none",
    }}>
      {m}:{s.toString().padStart(2, "0")}
    </button>
  );
}
