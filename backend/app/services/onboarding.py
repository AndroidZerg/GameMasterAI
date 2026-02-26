"""Onboarding service — DB operations for the 5-step venue setup wizard."""

import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Step 1: Venue Info ────────────────────────────────────────────

def save_venue_info(
    venue_id: str,
    venue_name: str,
    address: str,
    city: str,
    state: str,
    zip_code: str,
    phone: str,
    contact_name: str,
    hours_json: dict,
) -> dict:
    """Update venue info and advance onboarding_step to at least 1."""
    conn = _get_conn()
    conn.execute(
        """UPDATE venues
           SET venue_name = ?, address = ?, city = ?, state = ?, zip_code = ?,
               phone = ?, contact_name = ?, hours_json = ?,
               onboarding_step = MAX(COALESCE(onboarding_step, 0), 1)
           WHERE venue_id = ?""",
        (venue_name, address, city, state, zip_code, phone, contact_name,
         json.dumps(hours_json), venue_id),
    )
    conn.commit()
    conn.close()
    return {"success": True, "venue_id": venue_id}


# ── Step 2: Logo Upload ──────────────────────────────────────────

def save_logo(venue_id: str, logo_data: bytes, content_type: str) -> dict:
    """Store logo blob in venue_logos table."""
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO venue_logos (venue_id, logo_data, content_type, uploaded_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(venue_id) DO UPDATE SET
             logo_data = excluded.logo_data,
             content_type = excluded.content_type,
             uploaded_at = excluded.uploaded_at""",
        (venue_id, logo_data, content_type, now),
    )
    conn.execute(
        """UPDATE venues
           SET onboarding_step = MAX(COALESCE(onboarding_step, 0), 2)
           WHERE venue_id = ?""",
        (venue_id,),
    )
    conn.commit()
    conn.close()
    return {
        "success": True,
        "logo_url": f"/api/v1/venues/{venue_id}/logo",
    }


def get_logo(venue_id: str) -> Optional[dict]:
    """Retrieve logo blob + content_type for a venue."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT logo_data, content_type FROM venue_logos WHERE venue_id = ?",
        (venue_id,),
    ).fetchone()
    conn.close()
    if row:
        return {"logo_data": row["logo_data"], "content_type": row["content_type"]}
    return None


# ── Step 3: Game Collection ───────────────────────────────────────

def get_game_catalog() -> list[dict]:
    """Return all games for the onboarding game picker."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT game_id, title, complexity FROM games ORDER BY title"
    ).fetchall()
    conn.close()
    return [
        {
            "id": r["game_id"],
            "title": r["title"],
            "complexity": r["complexity"],
        }
        for r in rows
    ]


def save_game_collection(
    venue_id: str,
    owned_game_ids: list[str],
    priority_game_ids: list[str],
) -> dict:
    """Save owned games + priority selections for the venue."""
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()

    # Clear existing venue_games for this venue, then re-insert
    conn.execute("DELETE FROM venue_games WHERE venue_id = ?", (venue_id,))
    for gid in owned_game_ids:
        is_priority = 1 if gid in priority_game_ids else 0
        conn.execute(
            """INSERT INTO venue_games (venue_id, game_id, is_active, is_priority, added_at)
               VALUES (?, ?, 1, ?, ?)""",
            (venue_id, gid, is_priority, now),
        )

    # Also update venue_collections for compatibility
    conn.execute("DELETE FROM venue_collections WHERE venue_id = ?", (venue_id,))
    for gid in owned_game_ids:
        conn.execute(
            """INSERT OR IGNORE INTO venue_collections (venue_id, game_id, added_at)
               VALUES (?, ?, ?)""",
            (venue_id, gid, now),
        )

    conn.execute(
        """UPDATE venues
           SET onboarding_step = MAX(COALESCE(onboarding_step, 0), 3)
           WHERE venue_id = ?""",
        (venue_id,),
    )
    conn.commit()
    conn.close()

    # Auto-set GOTD to first priority game
    if priority_game_ids:
        try:
            from app.services.admin_config import set_featured
            set_featured(venue_id, {"mode": "manual", "game_id": priority_game_ids[0]})
        except Exception:
            pass  # Non-critical — don't fail onboarding

    return {"success": True, "saved": len(owned_game_ids)}


# ── Step 4: Menu Setup ───────────────────────────────────────────

def save_menu(venue_id: str, categories: list[dict]) -> dict:
    """Save menu categories and items. Replaces existing menu."""
    conn = _get_conn()

    # Clear existing menu for this venue
    conn.execute(
        "DELETE FROM venue_menu_items WHERE venue_id = ?", (venue_id,)
    )
    conn.execute(
        "DELETE FROM venue_menu_categories WHERE venue_id = ?", (venue_id,)
    )

    now = datetime.now(timezone.utc).isoformat()
    total_items = 0

    for sort_order, cat in enumerate(categories):
        cur = conn.execute(
            """INSERT INTO venue_menu_categories (venue_id, name, sort_order, is_active, created_at)
               VALUES (?, ?, ?, 1, ?)""",
            (venue_id, cat["name"], sort_order, now),
        )
        cat_id = cur.lastrowid

        for item_order, item in enumerate(cat.get("items", [])):
            price_dollars = item.get("price_dollars", 0)
            price_cents = int(round(float(price_dollars) * 100))
            is_available = 1 if item.get("is_available", True) else 0
            conn.execute(
                """INSERT INTO venue_menu_items
                   (venue_id, category_id, name, description, price_cents,
                    is_available, sort_order, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (venue_id, cat_id, item["name"], item.get("description", ""),
                 price_cents, is_available, item_order, now, now),
            )
            total_items += 1

    conn.execute(
        """UPDATE venues
           SET onboarding_step = MAX(COALESCE(onboarding_step, 0), 4)
           WHERE venue_id = ?""",
        (venue_id,),
    )
    conn.commit()
    conn.close()
    return {"success": True, "saved": total_items}


# ── Step 5: Complete ──────────────────────────────────────────────

def complete_onboarding(venue_id: str) -> dict:
    """Mark onboarding as complete."""
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """UPDATE venues
           SET onboarding_step = 6,
               onboarding_completed_at = ?,
               status = CASE WHEN status = 'prospect' THEN 'active' ELSE status END
           WHERE venue_id = ?""",
        (now, venue_id),
    )
    conn.commit()
    conn.close()
    return {"success": True, "completed": True, "completed_at": now}


# ── Progress ──────────────────────────────────────────────────────

def get_onboarding_progress(venue_id: str) -> dict:
    """Get current onboarding step and venue info for resume logic."""
    conn = _get_conn()
    row = conn.execute(
        """SELECT venue_id, venue_name, address, city, state, zip_code,
                  phone, contact_name, hours_json, onboarding_step,
                  onboarding_completed_at
           FROM venues WHERE venue_id = ?""",
        (venue_id,),
    ).fetchone()
    conn.close()
    if not row:
        return {"onboarding_step": 0}
    return {
        "venue_id": row["venue_id"],
        "venue_name": row["venue_name"],
        "address": row["address"] or "",
        "city": row["city"] or "",
        "state": row["state"] or "",
        "zip_code": row["zip_code"] or "",
        "phone": row["phone"] or "",
        "contact_name": row["contact_name"] or "",
        "hours_json": json.loads(row["hours_json"]) if row["hours_json"] else {},
        "onboarding_step": row["onboarding_step"] or 0,
        "onboarding_completed_at": row["onboarding_completed_at"],
    }


def get_venue_games(venue_id: str) -> dict:
    """Get owned + priority game IDs for a venue."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT game_id, is_priority FROM venue_games WHERE venue_id = ? AND is_active = 1",
        (venue_id,),
    ).fetchall()
    conn.close()
    owned = [r["game_id"] for r in rows]
    priority = [r["game_id"] for r in rows if r["is_priority"]]
    return {"owned_game_ids": owned, "priority_game_ids": priority}


def get_venue_menu(venue_id: str) -> list[dict]:
    """Get menu categories + items for a venue."""
    conn = _get_conn()
    cats = conn.execute(
        "SELECT * FROM venue_menu_categories WHERE venue_id = ? ORDER BY sort_order",
        (venue_id,),
    ).fetchall()
    result = []
    for cat in cats:
        items = conn.execute(
            """SELECT name, description, price_cents, is_available
               FROM venue_menu_items WHERE category_id = ? ORDER BY sort_order""",
            (cat["id"],),
        ).fetchall()
        result.append({
            "name": cat["name"],
            "items": [
                {
                    "name": it["name"],
                    "description": it["description"],
                    "price_dollars": it["price_cents"] / 100,
                    "is_available": bool(it["is_available"]),
                }
                for it in items
            ],
        })
    conn.close()
    return result
