import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { API_BASE, fetchPublicMenu, placePublicOrder } from "../services/api";

const THEME = {
  bg: "#1a1210",
  card: "#2a1f1a",
  accent: "#d4a843",
  text: "#f5f0e8",
  textSecondary: "#a89880",
  cardHover: "#352a22",
};

export default function ThaiHousePage() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    document.title = "Thai House Menu";
    fetchPublicMenu("thaihouse")
      .then((data) => {
        setMenu(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.name === item.name);
      if (existing) {
        return prev.map((c) =>
          c.name === item.name ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { name: item.name, price: item.price, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((name, delta) => {
    setCart((prev) => {
      return prev
        .map((c) =>
          c.name === name ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0);
    });
  }, []);

  const removeItem = useCallback((name) => {
    setCart((prev) => prev.filter((c) => c.name !== name));
  }, []);

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = async () => {
    if (!customerName.trim() || cart.length === 0 || placing) return;
    setPlacing(true);
    try {
      const res = await placePublicOrder("thaihouse", {
        customer_name: customerName.trim(),
        items: cart,
        total: Math.round(cartTotal * 100) / 100,
      });
      setOrderNumber(res.order_number);
      setOrderPlaced(true);
      setCart([]);
      setShowCart(false);
    } catch (err) {
      alert("Order failed: " + err.message);
    } finally {
      setPlacing(false);
    }
  };

  const sections = menu?.sections || [];
  const activeSection = sections[activeCategory];

  if (orderPlaced) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
          <h1 style={{ color: THEME.accent, fontSize: 28, margin: "0 0 12px" }}>
            Order #{orderNumber} Placed!
          </h1>
          <p style={{ color: THEME.text, fontSize: 18, margin: "0 0 32px" }}>
            Your server will be with you shortly.
          </p>
          <button
            onClick={() => {
              setOrderPlaced(false);
              setOrderNumber(null);
              setCustomerName("");
            }}
            style={styles.primaryBtn}
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={{ color: THEME.accent, fontSize: 32, margin: 0, fontWeight: 700, letterSpacing: 1 }}>
          Thai House
        </h1>
        <p style={{ color: THEME.textSecondary, margin: "4px 0 0", fontSize: 14 }}>
          Authentic Thai Cuisine
        </p>
      </header>

      {/* Drink Club Banner */}
      <Link to="/thaihouse/drinks" style={{ textDecoration: "none" }}>
        <div style={styles.drinkBanner}>
          <div style={{ fontSize: 20, fontWeight: 700, color: THEME.accent, marginBottom: 4 }}>
            Join Drink Club
          </div>
          <div style={{ color: THEME.text, fontSize: 14 }}>
            1 specialty drink every week for $14.99/mo
          </div>
          <div style={{ color: THEME.accent, fontSize: 13, marginTop: 8, fontWeight: 600 }}>
            Learn More &rarr;
          </div>
        </div>
      </Link>

      {loading && <div style={{ textAlign: "center", padding: 40, color: THEME.textSecondary }}>Loading menu...</div>}
      {error && <div style={{ textAlign: "center", padding: 40, color: "#e74c3c" }}>Error: {error}</div>}

      {!loading && !error && (
        <>
          {/* Category Tabs */}
          <div style={styles.tabsContainer}>
            <div style={styles.tabsScroll}>
              {sections.map((sec, i) => (
                <button
                  key={sec.name}
                  onClick={() => setActiveCategory(i)}
                  style={{
                    ...styles.tab,
                    ...(i === activeCategory ? styles.tabActive : {}),
                  }}
                >
                  <span style={{ marginRight: 4 }}>{sec.icon}</span>
                  {sec.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          {activeSection && (
            <div style={styles.grid}>
              {activeSection.items.map((item) => {
                const inCart = cart.find((c) => c.name === item.name);
                return (
                  <div key={item.name} style={styles.menuCard}>
                    {item.image ? (
                      <img
                        src={`${API_BASE}/api/images/menu/${item.image}-thumb.jpg`}
                        alt={item.name}
                        style={styles.foodImg}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        ...styles.placeholder,
                        display: item.image ? "none" : "flex",
                      }}
                    >
                      <span style={{ fontSize: 32 }}>{activeSection.icon}</span>
                    </div>
                    <div style={styles.cardBody}>
                      <div style={{ fontWeight: 700, color: THEME.text, fontSize: 15, marginBottom: 4 }}>
                        {item.name}
                      </div>
                      <div style={styles.description}>{item.description}</div>
                      <div style={styles.cardFooter}>
                        <span style={{ color: THEME.accent, fontWeight: 700, fontSize: 16 }}>
                          ${item.price.toFixed(2)}
                        </span>
                        {inCart ? (
                          <div style={styles.qtyControls}>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.name, -1)}>-</button>
                            <span style={{ color: THEME.text, minWidth: 20, textAlign: "center" }}>{inCart.quantity}</span>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.name, 1)}>+</button>
                          </div>
                        ) : (
                          <button style={styles.addBtn} onClick={() => addToCart(item)}>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button
          style={styles.cartFab}
          onClick={() => setShowCart(true)}
        >
          <span style={{ fontSize: 20 }}>&#128722;</span>
          <span style={styles.cartBadge}>{cartCount}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div style={styles.drawerOverlay} onClick={() => setShowCart(false)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h2 style={{ margin: 0, color: THEME.accent, fontSize: 22 }}>Your Order</h2>
              <button style={styles.closeBtn} onClick={() => setShowCart(false)}>&times;</button>
            </div>
            {cart.length === 0 ? (
              <p style={{ color: THEME.textSecondary, textAlign: "center", padding: 24 }}>Cart is empty</p>
            ) : (
              <div style={styles.cartItems}>
                {cart.map((item) => (
                  <div key={item.name} style={styles.cartRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: THEME.text, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: THEME.textSecondary, fontSize: 13 }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div style={styles.qtyControls}>
                      <button style={styles.qtyBtn} onClick={() => updateQty(item.name, -1)}>-</button>
                      <span style={{ color: THEME.text, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateQty(item.name, 1)}>+</button>
                    </div>
                    <button style={styles.removeBtn} onClick={() => removeItem(item.name)}>&#10005;</button>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.cartFooterSection}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ color: THEME.text, fontSize: 18, fontWeight: 700 }}>Subtotal</span>
                <span style={{ color: THEME.accent, fontSize: 18, fontWeight: 700 }}>
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <input
                type="text"
                placeholder="Your name for the order"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={styles.nameInput}
              />
              <button
                onClick={handleCheckout}
                disabled={!customerName.trim() || cart.length === 0 || placing}
                style={{
                  ...styles.primaryBtn,
                  opacity: !customerName.trim() || cart.length === 0 || placing ? 0.5 : 1,
                  width: "100%",
                }}
              >
                {placing ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <a href="https://playgmg.com" target="_blank" rel="noopener noreferrer" style={{ color: THEME.textSecondary, textDecoration: "none", fontSize: 12 }}>
          Powered by GameMaster Guide
        </a>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    background: THEME.bg,
    minHeight: "100vh",
    color: THEME.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 80,
  },
  header: {
    textAlign: "center",
    padding: "32px 16px 16px",
  },
  drinkBanner: {
    margin: "0 16px 16px",
    padding: "16px 20px",
    background: THEME.card,
    borderRadius: 12,
    border: `1.5px solid ${THEME.accent}`,
    textAlign: "center",
  },
  tabsContainer: {
    padding: "0 8px",
    marginBottom: 12,
  },
  tabsScroll: {
    display: "flex",
    overflowX: "auto",
    gap: 8,
    padding: "4px 8px",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
  },
  tab: {
    flexShrink: 0,
    padding: "8px 14px",
    borderRadius: 20,
    border: `1px solid ${THEME.textSecondary}40`,
    background: "transparent",
    color: THEME.textSecondary,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabActive: {
    background: THEME.accent,
    color: THEME.bg,
    border: `1px solid ${THEME.accent}`,
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    padding: "0 12px",
  },
  menuCard: {
    background: THEME.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  foodImg: {
    width: "100%",
    height: 120,
    objectFit: "cover",
    display: "block",
  },
  placeholder: {
    width: "100%",
    height: 120,
    background: "#231a14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: "10px 12px 12px",
  },
  description: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    marginBottom: 8,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addBtn: {
    padding: "6px 16px",
    borderRadius: 8,
    border: `1px solid ${THEME.accent}`,
    background: "transparent",
    color: THEME.accent,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  qtyControls: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${THEME.accent}`,
    background: "transparent",
    color: THEME.accent,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cartFab: {
    position: "fixed",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    background: THEME.accent,
    color: THEME.bg,
    border: "none",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    background: "#e74c3c",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    width: 22,
    height: 22,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  drawer: {
    background: THEME.card,
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 20px 12px",
    borderBottom: `1px solid ${THEME.textSecondary}30`,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: THEME.textSecondary,
    fontSize: 28,
    cursor: "pointer",
  },
  cartItems: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 20px",
  },
  cartRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderBottom: `1px solid ${THEME.textSecondary}20`,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: THEME.textSecondary,
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
  },
  cartFooterSection: {
    padding: "16px 20px 24px",
    borderTop: `1px solid ${THEME.textSecondary}30`,
  },
  nameInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${THEME.textSecondary}60`,
    background: THEME.bg,
    color: THEME.text,
    fontSize: 15,
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
  },
  primaryBtn: {
    padding: "14px 28px",
    borderRadius: 12,
    border: "none",
    background: THEME.accent,
    color: THEME.bg,
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
  },
  footer: {
    textAlign: "center",
    padding: "40px 16px 24px",
  },
};
