import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE, fetchPublicMenu, placePublicOrder, verifyDrinkClub } from "../services/api";

const THEME = {
  bg: "#1a1210",
  card: "#2a1f1a",
  accent: "#d4a843",
  text: "#f5f0e8",
  textSecondary: "#a89880",
  cardHover: "#352a22",
};

export default function ThaiHousePage() {
  const [searchParams] = useSearchParams();
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

  // Table number from QR code
  const [tableNumber, setTableNumber] = useState(null);

  // Customization modal
  const [customizeItem, setCustomizeItem] = useState(null);
  const [selectedProtein, setSelectedProtein] = useState("");
  const [spiceLevel, setSpiceLevel] = useState(3);
  const [itemNotes, setItemNotes] = useState("");

  // Drink club
  const [drinkClub, setDrinkClub] = useState(null); // { found, status, redeemed_this_week, ... }
  const [drinkClubLoading, setDrinkClubLoading] = useState(false);

  useEffect(() => {
    document.title = "Thai House Menu";

    // Read table number from URL
    const table = searchParams.get("table");
    if (table) setTableNumber(parseInt(table, 10) || null);

    fetchPublicMenu("thaihouse")
      .then((data) => { setMenu(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });

    // Check drink club status from stored phone
    const phone = localStorage.getItem("thaihouse_dc_phone");
    if (phone) {
      setDrinkClubLoading(true);
      verifyDrinkClub(phone)
        .then((data) => setDrinkClub(data))
        .catch(() => {})
        .finally(() => setDrinkClubLoading(false));
    }
  }, [searchParams]);

  const addToCart = useCallback((item, protein, spice, notes) => {
    setCart((prev) => {
      // Composite key: name|protein|spice allows same dish with different customizations
      const key = `${item.name}|${protein || ""}|${spice || ""}`;
      const existing = prev.find((c) => c._key === key);
      if (existing) {
        return prev.map((c) =>
          c._key === key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        _key: key,
        name: item.name,
        price: item.price,
        quantity: 1,
        protein: protein || null,
        spice_level: spice || null,
        notes: notes || null,
        is_drink_club: false,
      }];
    });
  }, []);

  const handleAddToCart = useCallback((item) => {
    // If item has customization options, open modal
    if (item.protein_options || item.spice_range) {
      setCustomizeItem(item);
      setSelectedProtein(item.protein_options ? item.protein_options[0] : "");
      setSpiceLevel(item.spice_range ? Math.ceil((item.spice_range[0] + item.spice_range[1]) / 2) : 3);
      setItemNotes("");
      return;
    }
    addToCart(item);
  }, [addToCart]);

  const handleCustomizeConfirm = useCallback(() => {
    if (!customizeItem) return;
    addToCart(
      customizeItem,
      selectedProtein || null,
      customizeItem.spice_range ? spiceLevel : null,
      itemNotes.trim() || null,
    );
    setCustomizeItem(null);
  }, [customizeItem, selectedProtein, spiceLevel, itemNotes, addToCart]);

  const addDrinkClubItem = useCallback((drinkName, drinkPrice) => {
    setCart((prev) => {
      const key = `__dc__${drinkName}`;
      if (prev.find((c) => c._key === key)) return prev; // only one drink club item
      return [...prev, {
        _key: key,
        name: drinkName,
        price: 0,
        quantity: 1,
        is_drink_club: true,
      }];
    });
  }, []);

  const updateQty = useCallback((key, delta) => {
    setCart((prev) =>
      prev.map((c) => c._key === key ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((key) => {
    setCart((prev) => prev.filter((c) => c._key !== key));
  }, []);

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = async () => {
    if (!customerName.trim() || cart.length === 0 || placing) return;
    setPlacing(true);
    try {
      // Strip _key from items for API
      const items = cart.map(({ _key, ...rest }) => rest);
      const res = await placePublicOrder("thaihouse", {
        customer_name: customerName.trim(),
        items,
        total: Math.round(cartTotal * 100) / 100,
        table_number: tableNumber,
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

  // Split items into photo items and compact items
  const photoItems = activeSection?.items.filter((i) => i.image) || [];
  const compactItems = activeSection?.items.filter((i) => !i.image) || [];

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
        {tableNumber && (
          <div style={styles.tableBadge}>Table {tableNumber}</div>
        )}
      </header>

      {/* Drink Club Banner */}
      <DrinkClubBanner
        drinkClub={drinkClub}
        drinkClubLoading={drinkClubLoading}
        onClaimDrink={addDrinkClubItem}
        beverages={sections.find((s) => s.name === "Beverages")?.items || []}
      />

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

          {/* Menu Items — Photo Grid + Compact List */}
          {activeSection && (
            <>
              {/* Photo items: 2-column grid */}
              {photoItems.length > 0 && (
                <div style={styles.grid}>
                  {photoItems.map((item) => {
                    const inCart = cart.find((c) => c.name === item.name);
                    return (
                      <div key={item.name} style={styles.menuCard}>
                        <img
                          src={`${API_BASE}/api/images/menu/${item.image}-thumb.jpg`}
                          alt={item.name}
                          style={styles.foodImg}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
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
                                <button style={styles.qtyBtn} onClick={() => updateQty(inCart._key, -1)}>-</button>
                                <span style={{ color: THEME.text, minWidth: 20, textAlign: "center" }}>{inCart.quantity}</span>
                                <button style={styles.qtyBtn} onClick={() => updateQty(inCart._key, 1)}>+</button>
                              </div>
                            ) : (
                              <button style={styles.addBtn} onClick={() => handleAddToCart(item)}>
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

              {/* Compact items: single-column list */}
              {compactItems.length > 0 && (
                <div style={styles.compactList}>
                  {compactItems.map((item) => {
                    const inCart = cart.find((c) => c.name === item.name);
                    return (
                      <div key={item.name} style={styles.compactRow}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.compactName}>{item.name}</div>
                          {item.description && (
                            <div style={styles.compactDesc}>{item.description}</div>
                          )}
                        </div>
                        <div style={styles.compactPrice}>${item.price.toFixed(2)}</div>
                        {inCart ? (
                          <div style={styles.qtyControls}>
                            <button style={styles.qtyBtn} onClick={() => updateQty(inCart._key, -1)}>-</button>
                            <span style={{ color: THEME.text, minWidth: 20, textAlign: "center" }}>{inCart.quantity}</span>
                            <button style={styles.qtyBtn} onClick={() => updateQty(inCart._key, 1)}>+</button>
                          </div>
                        ) : (
                          <button style={styles.addBtn} onClick={() => handleAddToCart(item)}>
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Customization Modal */}
      {customizeItem && (
        <div style={styles.drawerOverlay} onClick={() => setCustomizeItem(null)}>
          <div style={styles.customizeModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h2 style={{ margin: 0, color: THEME.accent, fontSize: 20 }}>
                {customizeItem.name}
              </h2>
              <button style={styles.closeBtn} onClick={() => setCustomizeItem(null)}>&times;</button>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              {/* Protein selection */}
              {customizeItem.protein_options && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: THEME.text, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
                    Protein
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {customizeItem.protein_options.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedProtein(p)}
                        style={{
                          ...styles.proteinBtn,
                          ...(selectedProtein === p ? styles.proteinBtnActive : {}),
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spice level */}
              {customizeItem.spice_range && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: THEME.text, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
                    Spice Level: {spiceLevel}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: THEME.textSecondary, fontSize: 13 }}>Mild</span>
                    <input
                      type="range"
                      min={customizeItem.spice_range[0]}
                      max={customizeItem.spice_range[1]}
                      value={spiceLevel}
                      onChange={(e) => setSpiceLevel(parseInt(e.target.value, 10))}
                      style={{ flex: 1, accentColor: THEME.accent }}
                    />
                    <span style={{ color: THEME.textSecondary, fontSize: 13 }}>Hot</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <div style={{ color: THEME.text, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
                  Special Instructions
                </div>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. No bean sprouts, extra spicy..."
                  rows={3}
                  style={styles.notesInput}
                />
              </div>
            </div>

            <div style={{ padding: "12px 20px 20px" }}>
              <button onClick={handleCustomizeConfirm} style={{ ...styles.primaryBtn, width: "100%" }}>
                Add to Order - ${customizeItem.price.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button style={styles.cartFab} onClick={() => setShowCart(true)}>
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
                  <div key={item._key} style={styles.cartRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: THEME.text, fontWeight: 600 }}>
                        {item.name}
                        {item.is_drink_club && (
                          <span style={{ color: "#27ae60", fontSize: 12, marginLeft: 6 }}>DRINK CLUB</span>
                        )}
                      </div>
                      {(item.protein || item.spice_level != null || item.notes) && (
                        <div style={{ color: THEME.textSecondary, fontSize: 12, marginTop: 2 }}>
                          {[
                            item.protein,
                            item.spice_level != null ? `Spice: ${item.spice_level}` : null,
                            item.notes,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div style={{ color: THEME.textSecondary, fontSize: 13 }}>
                        {item.is_drink_club ? "FREE" : `$${(item.price * item.quantity).toFixed(2)}`}
                      </div>
                    </div>
                    <div style={styles.qtyControls}>
                      <button style={styles.qtyBtn} onClick={() => updateQty(item._key, -1)}>-</button>
                      <span style={{ color: THEME.text, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateQty(item._key, 1)}>+</button>
                    </div>
                    <button style={styles.removeBtn} onClick={() => removeItem(item._key)}>&#10005;</button>
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

/* ── Drink Club Banner Component ── */
function DrinkClubBanner({ drinkClub, drinkClubLoading, onClaimDrink, beverages }) {
  const [showDrinkPicker, setShowDrinkPicker] = useState(false);

  if (drinkClubLoading) return null;

  // Not a member or not found
  if (!drinkClub || !drinkClub.found || drinkClub.status !== "active") {
    return (
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
    );
  }

  // Already claimed this week
  if (drinkClub.redeemed_this_week) {
    const redemptionDrink = drinkClub.redemption?.drink_name || "Specialty drink";
    // Calculate next Monday
    const ws = new Date(drinkClub.week_start + "T00:00:00-08:00");
    const nextMonday = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = nextMonday - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return (
      <div style={{ ...styles.drinkBanner, borderColor: THEME.textSecondary + "60" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textSecondary, marginBottom: 4 }}>
          Drink Claimed!
        </div>
        <div style={{ color: THEME.textSecondary, fontSize: 13 }}>
          {redemptionDrink} &middot; Next in: {days}d {hours}h
        </div>
      </div>
    );
  }

  // Drink available to claim
  if (showDrinkPicker) {
    const drinkOptions = beverages.length > 0
      ? beverages.map((b) => b.name)
      : ["Thai Iced Tea", "Thai Iced Coffee", "Coconut Water", "Mango Juice"];

    return (
      <div style={{ ...styles.drinkBanner, borderColor: "#27ae60" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#27ae60", marginBottom: 8 }}>
          Choose Your Free Drink
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {drinkOptions.map((name) => (
            <button
              key={name}
              onClick={() => {
                onClaimDrink(name);
                setShowDrinkPicker(false);
              }}
              style={styles.drinkPickBtn}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDrinkPicker(false)}
          style={{ background: "none", border: "none", color: THEME.textSecondary, fontSize: 12, marginTop: 8, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ ...styles.drinkBanner, borderColor: "#27ae60", cursor: "pointer" }}
      onClick={() => setShowDrinkPicker(true)}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: "#27ae60", marginBottom: 4 }}>
        Claim Your Free Drink
      </div>
      <div style={{ color: THEME.text, fontSize: 14 }}>
        Hi {drinkClub.name}! Tap to choose this week's drink.
      </div>
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
  tableBadge: {
    display: "inline-block",
    marginTop: 8,
    padding: "4px 16px",
    borderRadius: 20,
    background: THEME.accent,
    color: THEME.bg,
    fontWeight: 700,
    fontSize: 14,
  },
  drinkBanner: {
    margin: "0 16px 16px",
    padding: "16px 20px",
    background: THEME.card,
    borderRadius: 12,
    border: `1.5px solid ${THEME.accent}`,
    textAlign: "center",
  },
  drinkPickBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid #27ae6060`,
    background: "transparent",
    color: THEME.text,
    fontSize: 13,
    cursor: "pointer",
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
  /* Compact list styles */
  compactList: {
    padding: "8px 12px 0",
  },
  compactRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    background: THEME.card,
    borderRadius: 10,
    marginBottom: 8,
  },
  compactName: {
    fontWeight: 700,
    color: THEME.text,
    fontSize: 14,
  },
  compactDesc: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  compactPrice: {
    color: THEME.accent,
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
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
    flexShrink: 0,
  },
  qtyControls: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
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
  customizeModal: {
    background: THEME.card,
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "80vh",
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
  notesInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${THEME.textSecondary}60`,
    background: THEME.bg,
    color: THEME.text,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  proteinBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: `1px solid ${THEME.textSecondary}40`,
    background: "transparent",
    color: THEME.text,
    fontSize: 14,
    cursor: "pointer",
  },
  proteinBtnActive: {
    background: THEME.accent,
    color: THEME.bg,
    border: `1px solid ${THEME.accent}`,
    fontWeight: 700,
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
