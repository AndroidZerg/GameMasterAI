import { useState, useEffect } from "react";
import { fetchVenueMenu } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const MOCK_MENU = {
  venue_name: "Dice Tower West",
  categories: [
    {
      name: "Hot Drinks",
      icon: "☕",
      items: [
        { name: "Drip Coffee", price: 3.50, description: "House blend" },
        { name: "Latte", price: 5.00, description: "Espresso + steamed milk" },
        { name: "Cappuccino", price: 5.00, description: "Espresso + foam" },
        { name: "Hot Chocolate", price: 4.50, description: "Rich & creamy" },
        { name: "Chai Latte", price: 5.50, description: "Spiced tea latte" },
      ],
    },
    {
      name: "Cold Drinks",
      icon: "🧊",
      items: [
        { name: "Iced Coffee", price: 4.50, description: "Cold brew style" },
        { name: "Iced Tea", price: 3.50, description: "Black or green" },
        { name: "Lemonade", price: 4.00, description: "Fresh squeezed" },
        { name: "Smoothie", price: 6.50, description: "Berry or mango" },
      ],
    },
    {
      name: "Beer & Wine",
      icon: "🍺",
      items: [
        { name: "IPA Draft", price: 7.00, description: "Local craft" },
        { name: "Lager Draft", price: 6.00, description: "Light & crisp" },
        { name: "Hard Cider", price: 7.00, description: "Dry apple" },
        { name: "House Red Wine", price: 8.00, description: "Glass" },
        { name: "House White Wine", price: 8.00, description: "Glass" },
      ],
    },
    {
      name: "Food",
      icon: "🍕",
      items: [
        { name: "Flatbread Pizza", price: 12.00, description: "Margherita or pepperoni" },
        { name: "Loaded Nachos", price: 10.00, description: "Cheese, jalapeños, salsa" },
        { name: "Soft Pretzel", price: 7.00, description: "With beer cheese dip" },
        { name: "Chicken Tenders", price: 9.00, description: "With fries & ranch" },
        { name: "Grilled Cheese", price: 8.00, description: "Three cheese blend" },
      ],
    },
    {
      name: "Snacks",
      icon: "🍿",
      items: [
        { name: "Popcorn", price: 3.00, description: "Butter or white cheddar" },
        { name: "Trail Mix", price: 4.00, description: "Nuts, chocolate, dried fruit" },
        { name: "Cookies", price: 3.50, description: "Chocolate chip (2 pack)" },
        { name: "Brownie", price: 4.00, description: "Double chocolate" },
      ],
    },
    {
      name: "Specials",
      icon: "⭐",
      items: [
        { name: "Game Night Combo", price: 15.00, description: "Any drink + flatbread", badge: "Popular" },
        { name: "Meeple Milkshake", price: 7.00, description: "Vanilla or chocolate with meeple sprinkles", badge: "New" },
      ],
    },
  ],
};

export default function MenuPage({ embedded }) {
  const { isLoggedIn, venueName } = useAuth();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const data = await fetchVenueMenu();
        // Normalize: backend may use "sections" instead of "categories"
        if (!data.categories && data.sections) data.categories = data.sections;
        setMenu(data);
        setActiveCategory(data.categories?.[0]?.name || null);
        setLoading(false);
        return;
      } catch {}
      setMenu(MOCK_MENU);
      setActiveCategory(MOCK_MENU.categories[0]?.name || null);
      setLoading(false);
    };
    loadMenu();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <div style={{
          width: "32px", height: "32px", border: "3px solid var(--border)",
          borderTopColor: "var(--accent)", borderRadius: "50%",
          animation: "spinnerRotate 0.6s linear infinite",
          margin: "0 auto",
        }} />
        <p style={{ color: "var(--text-secondary)", marginTop: "12px" }}>Loading menu...</p>
      </div>
    );
  }

  if (!menu) return null;

  const activeCat = menu.categories.find((c) => c.name === activeCategory);

  return (
    <div style={{ padding: embedded ? "0 20px 40px" : "70px 20px 40px", maxWidth: "700px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.6rem", margin: 0, color: "var(--text-primary)", fontWeight: 800 }}>
          Menu
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
          {(isLoggedIn ? venueName : menu.venue_name) || "Our Offerings"}
        </p>
      </div>

      {/* Category tabs — horizontal scroll */}
      <div style={{
        display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px",
        marginBottom: "20px", scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
      }}>
        {menu.categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "999px",
              background: activeCategory === cat.name ? "var(--accent)" : "var(--bg-secondary)",
              color: activeCategory === cat.name ? "#fff" : "var(--text-secondary)",
              border: "1px solid " + (activeCategory === cat.name ? "transparent" : "var(--border)"),
              fontWeight: activeCategory === cat.name ? 700 : 400,
              fontSize: "0.9rem", cursor: "pointer", whiteSpace: "nowrap",
              scrollSnapAlign: "start", flexShrink: 0,
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Items */}
      {activeCat && (
        <div>
          {activeCat.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 16px", marginBottom: "8px",
                background: "var(--bg-secondary)", borderRadius: "12px",
                border: "1px solid var(--border)",
                animation: "fadeIn 0.2s ease-out",
                animationDelay: `${i * 0.03}s`,
                animationFillMode: "both",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1rem" }}>
                    {item.name}
                  </span>
                  {item.badge && (
                    <span style={{
                      fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px",
                      background: item.badge === "New" ? "#22c55e" : "var(--accent)",
                      color: "#fff", fontWeight: 700, textTransform: "uppercase",
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px", margin: 0 }}>
                    {item.description}
                  </p>
                )}
              </div>
              <span style={{
                fontWeight: 700, color: "var(--accent)", fontSize: "1.05rem",
                whiteSpace: "nowrap",
              }}>
                ${item.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p style={{
        textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary)",
        marginTop: "24px", padding: "0 20px",
      }}>
        Prices may vary. Ask your server for today's specials.
      </p>
    </div>
  );
}
