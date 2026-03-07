import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchVenueShop } from "../../services/api";
import PurchaseModal from "./PurchaseModal";

// Cache shop data per venue to avoid re-fetching on every game view
const shopCache = { venueId: null, data: null, fetchedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function BuyGameButton({ gameId, gameTitle }) {
  const { venueId, role } = useAuth();
  const [shopGame, setShopGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!venueId) { setLoading(false); return; }

    // Don't show to admin/staff roles
    if (["venue_admin", "super_admin", "lgs_admin"].includes(role)) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (shopCache.venueId === venueId && shopCache.data && (now - shopCache.fetchedAt) < CACHE_TTL) {
      const match = shopCache.data.games?.find((g) => g.game_id === gameId);
      setShopGame(match || null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchVenueShop(venueId)
      .then((data) => {
        if (!mounted.current) return;
        shopCache.venueId = venueId;
        shopCache.data = data;
        shopCache.fetchedAt = Date.now();
        const match = data.games?.find((g) => g.game_id === gameId);
        setShopGame(match || null);
      })
      .catch(() => {
        if (!mounted.current) return;
        setShopGame(null);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, [venueId, gameId, role]);

  // Don't render for admins
  if (["venue_admin", "super_admin", "lgs_admin"].includes(role)) return null;
  // Still loading
  if (loading) return null;
  // Not available in shop
  if (!shopGame) return null;

  const inStock = shopGame.in_stock;
  const priceStr = `$${(shopGame.price_cents / 100).toFixed(2)}`;

  return (
    <>
      <button
        onClick={() => inStock && setShowModal(true)}
        disabled={!inStock}
        style={{
          padding: "5px 14px",
          borderRadius: 8,
          border: "none",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: inStock ? "pointer" : "default",
          background: inStock ? "#22c55e" : "#374151",
          color: inStock ? "#fff" : "#6b7280",
          whiteSpace: "nowrap",
          opacity: inStock ? 1 : 0.7,
        }}
      >
        {inStock ? `Buy ${priceStr}` : "Out of Stock"}
      </button>

      {showModal && (
        <PurchaseModal
          venueId={venueId}
          gameId={gameId}
          gameTitle={gameTitle || shopGame.title}
          priceCents={shopGame.price_cents}
          complexity={shopGame.complexity}
          playerCount={shopGame.player_count}
          onClose={() => setShowModal(false)}
          onPurchaseComplete={() => {
            // Invalidate cache so stock updates
            shopCache.fetchedAt = 0;
          }}
        />
      )}
    </>
  );
}
