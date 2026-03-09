import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE, fetchPublicMenu, placePublicOrder, verifyDrinkClub, lookupLoyalty, redeemLoyaltyPublic } from "../services/api";

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
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [placing, setPlacing] = useState(false);

  // Table number from QR code
  const [tableNumber, setTableNumber] = useState(null);

  // Customization modal
  const [customizeItem, setCustomizeItem] = useState(null);
  const [customizeSelections, setCustomizeSelections] = useState({}); // { toggleId: optionName }
  const [itemNotes, setItemNotes] = useState("");

  // Drink club
  const [drinkClub, setDrinkClub] = useState(null); // { found, status, redeemed_this_week, ... }
  const [drinkClubLoading, setDrinkClubLoading] = useState(false);
  const [claimedDrinkName, setClaimedDrinkName] = useState(null); // set after checkout with DC item

  // Loyalty
  const [loyaltyData, setLoyaltyData] = useState(null);
  const loyaltyTimerRef = useRef(null);

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

  // Debounced loyalty lookup when phone changes
  useEffect(() => {
    if (loyaltyTimerRef.current) clearTimeout(loyaltyTimerRef.current);
    const clean = customerPhone.replace(/\D/g, '');
    if (clean.length < 7) { setLoyaltyData(null); return; }
    loyaltyTimerRef.current = setTimeout(() => {
      lookupLoyalty(clean)
        .then((data) => setLoyaltyData(data))
        .catch(() => setLoyaltyData(null));
    }, 600);
    return () => { if (loyaltyTimerRef.current) clearTimeout(loyaltyTimerRef.current); };
  }, [customerPhone]);

  // Resolve toggle definitions for an item
  const getItemToggles = useCallback((item) => {
    if (!item.toggles || !menu?.toggles) return [];
    return item.toggles
      .map((tid) => menu.toggles.find((t) => t.id === tid))
      .filter(Boolean);
  }, [menu]);

  // Calculate upcharge for selected customizations (supports multi-select arrays)
  const calcUpcharge = useCallback((toggleDefs, selections) => {
    let up = 0;
    for (const tog of toggleDefs) {
      const sel = selections[tog.id];
      if (Array.isArray(sel)) {
        for (const name of sel) {
          const opt = tog.options.find((o) => o.name === name);
          if (opt?.upcharge) up += opt.upcharge;
        }
      } else if (sel) {
        const opt = tog.options.find((o) => o.name === sel);
        if (opt?.upcharge) up += opt.upcharge;
      }
    }
    return up;
  }, []);

  const addToCart = useCallback((item, customizations, notes, upcharge) => {
    setCart((prev) => {
      // Composite key from customization values
      const custKey = Object.values(customizations || {}).join("|");
      const key = `${item.name}|${custKey}`;
      const existing = prev.find((c) => c._key === key);
      if (existing) {
        return prev.map((c) =>
          c._key === key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        _key: key,
        name: item.name,
        price: item.price + (upcharge || 0),
        quantity: 1,
        customizations: customizations && Object.keys(customizations).length > 0 ? customizations : null,
        notes: notes || null,
        is_drink_club: false,
      }];
    });
  }, []);

  const handleAddToCart = useCallback((item) => {
    const toggleDefs = getItemToggles(item);
    const hasToggles = toggleDefs.length > 0;
    const hasNotes = item.allows_modifications;
    if (hasToggles || hasNotes) {
      setCustomizeItem(item);
      // Pre-select first option for required toggles, default sweetness to 100%
      const defaults = {};
      for (const tog of toggleDefs) {
        if (tog.multi_select) {
          defaults[tog.id] = []; // multi-select starts empty
        } else if (tog.id === "sweetness") {
          defaults[tog.id] = "100%";
        } else if (tog.required && tog.options.length > 0) {
          defaults[tog.id] = tog.options[0].name;
        }
      }
      setCustomizeSelections(defaults);
      setItemNotes("");
      return;
    }
    addToCart(item, {}, null, 0);
  }, [addToCart, getItemToggles]);

  const handleCustomizeConfirm = useCallback(() => {
    if (!customizeItem) return;
    const toggleDefs = getItemToggles(customizeItem);
    const upcharge = calcUpcharge(toggleDefs, customizeSelections);
    addToCart(customizeItem, customizeSelections, itemNotes.trim() || null, upcharge);
    setCustomizeItem(null);
  }, [customizeItem, customizeSelections, itemNotes, addToCart, getItemToggles, calcUpcharge]);

  const addDrinkClubItem = useCallback((drinkName, originalPrice) => {
    setCart((prev) => {
      // Only one drink club item allowed
      if (prev.some((c) => c.is_drink_club)) return prev;
      const key = `__dc__${drinkName}`;
      return [...prev, {
        _key: key,
        name: drinkName,
        price: 0,
        originalPrice: originalPrice || 4.50,
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
      const dcItem = cart.find((c) => c.is_drink_club);
      const dcPhone = localStorage.getItem("thaihouse_dc_phone");
      // Strip _key from items for API
      const items = cart.map(({ _key, ...rest }) => rest);
      const res = await placePublicOrder("thaihouse", {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        items,
        total: Math.round(cartTotal * 100) / 100,
        table_number: tableNumber,
        drink_club_phone: dcItem ? dcPhone : undefined,
      });
      if (dcItem) {
        setClaimedDrinkName(dcItem.name);
        // Update banner state to claimed
        setDrinkClub((prev) => prev ? { ...prev, redeemed_this_week: true, redemption: { drink_name: dcItem.name } } : prev);
      }
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
  const photoItems = activeSection?.items.filter((i) => i.image || i.gallery_image_id) || [];
  const compactItems = activeSection?.items.filter((i) => !i.image && !i.gallery_image_id) || [];

  if (orderPlaced) {
    // Calculate next Monday for countdown
    const nextMondayCountdown = (() => {
      if (!claimedDrinkName) return null;
      const now = new Date();
      // Next Monday 00:00 PT (UTC-8)
      const pt = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
      const daysUntilMon = (8 - pt.getDay()) % 7 || 7;
      const nextMon = new Date(pt);
      nextMon.setDate(pt.getDate() + daysUntilMon);
      nextMon.setHours(0, 0, 0, 0);
      const diff = nextMon - pt;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return { d, h, m, date: nextMon };
    })();

    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          {claimedDrinkName ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 16, animation: "celebratePop 0.6s ease-out" }}>
                &#127881;
              </div>
              <h1 style={{ color: "#27ae60", fontSize: 26, margin: "0 0 8px", animation: "celebratePop 0.6s ease-out 0.1s both" }}>
                Drink Club Drink Claimed!
              </h1>
              <p style={{ color: THEME.text, fontSize: 18, margin: "0 0 4px", animation: "celebratePop 0.6s ease-out 0.2s both" }}>
                {claimedDrinkName} &mdash; on us this week.
              </p>
              {nextMondayCountdown && (
                <p style={{ color: THEME.textSecondary, fontSize: 14, margin: "12px 0 24px", animation: "confettiDrop 0.5s ease-out 0.4s both" }}>
                  Next free drink: {nextMondayCountdown.d}d {nextMondayCountdown.h}h {nextMondayCountdown.m}m
                </p>
              )}
              <div style={{ color: THEME.textSecondary, fontSize: 14, marginBottom: 24, animation: "confettiDrop 0.5s ease-out 0.5s both" }}>
                Order #{orderNumber} placed
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
              <h1 style={{ color: THEME.accent, fontSize: 28, margin: "0 0 12px" }}>
                Order #{orderNumber} Placed!
              </h1>
              <p style={{ color: THEME.text, fontSize: 18, margin: "0 0 32px" }}>
                Your server will be with you shortly.
              </p>
            </>
          )}
          <button
            onClick={() => {
              setOrderPlaced(false);
              setOrderNumber(null);
              setCustomerName("");
              setCustomerPhone("");
              setClaimedDrinkName(null);
            }}
            style={styles.primaryBtn}
          >
            Place Another Order
          </button>
          <style>{`
            @keyframes celebratePop {
              0% { transform: scale(0.5); opacity: 0; }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes confettiDrop {
              0% { transform: translateY(-20px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}</style>
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
        hasDrinkClubInCart={cart.some((c) => c.is_drink_club)}
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
                          src={item.gallery_image_id
                            ? `${API_BASE}/api/public/menu-images/${item.gallery_image_id}/thumb`
                            : `${API_BASE}/api/images/menu/${item.image}-thumb.jpg`}
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
      {customizeItem && (() => {
        const toggleDefs = getItemToggles(customizeItem);
        const upcharge = calcUpcharge(toggleDefs, customizeSelections);
        const itemTotal = customizeItem.price + upcharge;
        return (
          <div style={styles.drawerOverlay} onClick={() => setCustomizeItem(null)}>
            <div style={styles.customizeModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.drawerHeader}>
                <h2 style={{ margin: 0, color: THEME.accent, fontSize: 20 }}>
                  {customizeItem.name}
                </h2>
                <button style={styles.closeBtn} onClick={() => setCustomizeItem(null)}>&times;</button>
              </div>

              <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
                {/* Dynamic toggles */}
                {toggleDefs.map((tog) => (
                  <div key={tog.id} style={{ marginBottom: 20 }}>
                    <div style={{ color: THEME.text, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
                      {tog.name} {tog.required && <span style={{ color: THEME.textSecondary, fontWeight: 400, fontSize: 12 }}>(required)</span>}
                      {tog.multi_select && <span style={{ color: THEME.textSecondary, fontWeight: 400, fontSize: 12 }}> (select multiple)</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {tog.options.map((opt) => {
                        const isMulti = tog.multi_select;
                        const sel = customizeSelections[tog.id];
                        const isSelected = isMulti
                          ? (Array.isArray(sel) && sel.includes(opt.name))
                          : sel === opt.name;
                        return (
                          <button
                            key={opt.name}
                            onClick={() => {
                              if (isMulti) {
                                setCustomizeSelections((prev) => {
                                  const arr = Array.isArray(prev[tog.id]) ? prev[tog.id] : [];
                                  return {
                                    ...prev,
                                    [tog.id]: isSelected
                                      ? arr.filter((n) => n !== opt.name)
                                      : [...arr, opt.name],
                                  };
                                });
                              } else {
                                setCustomizeSelections((prev) => ({ ...prev, [tog.id]: opt.name }));
                              }
                            }}
                            style={{
                              ...styles.proteinBtn,
                              ...(isSelected ? styles.proteinBtnActive : {}),
                              minHeight: 44,
                            }}
                          >
                            {opt.name}
                            {opt.upcharge > 0 && (
                              <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>+${opt.upcharge.toFixed(2)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Notes */}
                {(customizeItem.allows_modifications || toggleDefs.length > 0) && (
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
                )}
              </div>

              <div style={{ padding: "12px 20px 20px" }}>
                <button onClick={handleCustomizeConfirm} style={{ ...styles.primaryBtn, width: "100%" }}>
                  Add to Order - ${itemTotal.toFixed(2)}
                  {upcharge > 0 && <span style={{ fontSize: 12, marginLeft: 4 }}>(+${upcharge.toFixed(2)})</span>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

            {/* Name & Phone — prominent, above cart items */}
            <div style={{ padding: "12px 20px 0" }}>
              <input
                type="text"
                placeholder="Your Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  ...styles.nameInput,
                  border: customerName.trim()
                    ? `2px solid ${THEME.accent}`
                    : `2px solid ${THEME.accent}90`,
                  boxShadow: !customerName.trim() ? `0 0 10px ${THEME.accent}30` : 'none',
                  fontSize: 16,
                }}
              />
              <input
                type="tel"
                placeholder="Phone # for loyalty rewards (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ ...styles.nameInput, marginBottom: 4 }}
              />
              {/* Loyalty lookup result */}
              {loyaltyData?.found ? (
                <div style={{ padding: "10px 14px", background: "#27ae6015", borderRadius: 10,
                  border: "1px solid #27ae6040", marginBottom: 10 }}>
                  <div style={{ color: "#27ae60", fontWeight: 700, fontSize: 14 }}>
                    Welcome back, {loyaltyData.name}!
                  </div>
                  <div style={{ color: THEME.text, fontSize: 13, marginTop: 2 }}>
                    You have <strong style={{ color: THEME.accent }}>{loyaltyData.points}</strong> points
                    &middot; {loyaltyData.visits} visit{loyaltyData.visits !== 1 ? "s" : ""}
                  </div>
                  {loyaltyData.all_rewards?.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {loyaltyData.all_rewards.map((r) => {
                        const canRedeem = loyaltyData.points >= r.points_required;
                        return (
                          <button
                            key={r.id}
                            disabled={!canRedeem}
                            onClick={async () => {
                              if (!canRedeem) return;
                              try {
                                const res = await redeemLoyaltyPublic(customerPhone.replace(/\D/g, ''), r.id);
                                setLoyaltyData((prev) => prev ? {
                                  ...prev,
                                  points: res.points_remaining,
                                  available_rewards: prev.all_rewards.filter((rw) => rw.points_required <= res.points_remaining),
                                } : prev);
                                alert(`Redeemed: ${r.description}! ${res.points_remaining} points remaining.`);
                              } catch (err) {
                                alert("Redeem failed: " + err.message);
                              }
                            }}
                            style={{
                              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                              cursor: canRedeem ? "pointer" : "default",
                              border: canRedeem ? "1px solid #27ae60" : `1px solid ${THEME.textSecondary}40`,
                              background: canRedeem ? "#27ae6015" : "transparent",
                              color: canRedeem ? "#27ae60" : THEME.textSecondary,
                              minHeight: 36,
                            }}
                          >
                            {r.description} ({r.points_required} pts)
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 8 }}>
                  Earn 1 point per $10 spent. 10 points = free entr&#233;e or 1 month Cha Club!
                </div>
              )}
            </div>

            {/* Cart items */}
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
                      {(item.customizations || item.notes) && (
                        <div style={{ color: THEME.textSecondary, fontSize: 12, marginTop: 2 }}>
                          {[
                            ...(item.customizations
                              ? Object.entries(item.customizations).map(([k, v]) => {
                                  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
                                  return v;
                                })
                              : []),
                            item.notes,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div style={{ color: THEME.textSecondary, fontSize: 13 }}>
                        {item.is_drink_club ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ textDecoration: "line-through", color: THEME.textSecondary }}>
                              ${(item.originalPrice || 4.50).toFixed(2)}
                            </span>
                            <span style={{ color: "#4caf50", fontWeight: 700 }}>FREE</span>
                          </span>
                        ) : `$${(item.price * item.quantity).toFixed(2)}`}
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

            {/* Footer: subtotal + place order */}
            <div style={styles.cartFooterSection}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: THEME.text, fontSize: 18, fontWeight: 700 }}>Subtotal</span>
                <span style={{ color: THEME.accent, fontSize: 18, fontWeight: 700 }}>
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={!customerName.trim() || cart.length === 0 || placing}
                style={{
                  ...styles.primaryBtn,
                  width: "100%",
                  minHeight: 48,
                  background: customerName.trim() ? THEME.accent : `${THEME.accent}50`,
                  opacity: placing ? 0.7 : 1,
                }}
              >
                {placing ? "Placing Order..."
                  : !customerName.trim() ? "Enter your name to place order"
                  : `Place Order - $${cartTotal.toFixed(2)}`}
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
function DrinkClubBanner({ drinkClub, drinkClubLoading, onClaimDrink, beverages, hasDrinkClubInCart }) {
  const [showDrinkPicker, setShowDrinkPicker] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Live countdown timer for claimed state
  useEffect(() => {
    if (!drinkClub?.redeemed_this_week || !drinkClub?.week_start) return;
    const ws = new Date(drinkClub.week_start + "T00:00:00-08:00");
    const nextMonday = new Date(ws.getTime() + 7 * 86400000);

    const update = () => {
      const now = new Date();
      const diff = nextMonday - now;
      if (diff <= 0) {
        setCountdown("");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${d}d ${h}h ${m}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [drinkClub?.redeemed_this_week, drinkClub?.week_start]);

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

  // Drink club item already in cart
  if (hasDrinkClubInCart) {
    return (
      <div style={{ ...styles.drinkBanner, borderColor: "#27ae60" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#27ae60" }}>
          Drink Club drink in cart
        </div>
      </div>
    );
  }

  // Already claimed this week
  if (drinkClub.redeemed_this_week) {
    const redemptionDrink = drinkClub.redemption?.drink_name || "Specialty drink";
    return (
      <div style={{ ...styles.drinkBanner, borderColor: THEME.textSecondary + "60" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textSecondary, marginBottom: 4 }}>
          Drink Claimed!
        </div>
        <div style={{ color: THEME.textSecondary, fontSize: 13 }}>
          {redemptionDrink} {countdown && <>&middot; Next in: {countdown}</>}
        </div>
      </div>
    );
  }

  // Drink picker open — show specialty drinks with prices
  if (showDrinkPicker) {
    const SPECIALTY_DRINKS = [
      { name: "Thai Iced Tea", price: 4.50 },
      { name: "Thai Iced Coffee", price: 4.50 },
      { name: "Mango Smoothie", price: 5.50 },
      { name: "Coconut Smoothie", price: 5.50 },
      { name: "Taro Smoothie", price: 5.50 },
      { name: "Lychee Smoothie", price: 5.50 },
    ];

    // Use beverages from menu if available, else fallback
    const drinkOptions = beverages.length > 0
      ? beverages.map((b) => ({ name: b.name, price: b.price }))
      : SPECIALTY_DRINKS;

    return (
      <div style={{ ...styles.drinkBanner, borderColor: "#27ae60" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#27ae60", marginBottom: 12 }}>
          Choose Your Free Drink
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {drinkOptions.map((drink) => (
            <button
              key={drink.name}
              onClick={() => {
                onClaimDrink(drink.name, drink.price);
                setShowDrinkPicker(false);
              }}
              style={styles.drinkPickCard}
            >
              <span style={{ color: THEME.text, fontWeight: 600, fontSize: 14 }}>{drink.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ textDecoration: "line-through", color: THEME.textSecondary, fontSize: 13 }}>
                  ${drink.price.toFixed(2)}
                </span>
                <span style={{ color: "#4caf50", fontWeight: 700, fontSize: 14 }}>FREE</span>
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDrinkPicker(false)}
          style={{ background: "none", border: "none", color: THEME.textSecondary, fontSize: 12, marginTop: 10, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Drink available to claim
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
  drinkPickCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid #27ae6040`,
    background: THEME.bg,
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
    padding: "10px 16px",
    borderRadius: 20,
    border: `1px solid ${THEME.textSecondary}40`,
    background: "transparent",
    color: THEME.textSecondary,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    minHeight: 44,
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
    padding: "8px 16px",
    borderRadius: 8,
    border: `1px solid ${THEME.accent}`,
    background: "transparent",
    color: THEME.accent,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    flexShrink: 0,
    minHeight: 44,
    minWidth: 44,
  },
  qtyControls: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  qtyBtn: {
    width: 36,
    height: 36,
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
    minWidth: 44,
    minHeight: 44,
    padding: 0,
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
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
