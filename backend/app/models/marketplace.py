"""Marketplace tables — LGS partners, game pricing, inventory, purchases, transfers."""

import sqlite3

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _add_column(cur, table: str, column: str, col_type: str):
    """Add a column to a table if it doesn't already exist."""
    try:
        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table,)
        )
        if not cur.fetchone():
            return
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    except Exception:
        pass


def init_marketplace_tables():
    """Create all marketplace tables. Idempotent — safe to call on every startup."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # --- lgs_partners ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lgs_partners (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            contact_email TEXT NOT NULL UNIQUE,
            contact_phone TEXT,
            address TEXT,
            stripe_account_id TEXT UNIQUE,
            stripe_onboarding_complete INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            telegram_chat_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # --- lgs_game_pricing ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lgs_game_pricing (
            id TEXT PRIMARY KEY,
            lgs_id TEXT NOT NULL REFERENCES lgs_partners(id),
            game_id TEXT NOT NULL,
            retail_price_cents INTEGER NOT NULL,
            is_available INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL,
            UNIQUE(lgs_id, game_id)
        )
    """)

    # --- venue_game_inventory ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_game_inventory (
            id TEXT PRIMARY KEY,
            venue_id TEXT NOT NULL,
            lgs_id TEXT NOT NULL REFERENCES lgs_partners(id),
            game_id TEXT NOT NULL,
            stock_count INTEGER NOT NULL DEFAULT 0,
            restock_threshold INTEGER NOT NULL DEFAULT 1,
            total_sold INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            UNIQUE(venue_id, game_id)
        )
    """)

    # --- game_purchases ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS game_purchases (
            id TEXT PRIMARY KEY,
            venue_id TEXT NOT NULL,
            lgs_id TEXT NOT NULL REFERENCES lgs_partners(id),
            game_id TEXT NOT NULL,
            game_title TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_name TEXT,
            price_cents INTEGER NOT NULL,
            gmg_fee_cents INTEGER NOT NULL,
            lgs_payout_cents INTEGER NOT NULL,
            stripe_payment_intent_id TEXT NOT NULL UNIQUE,
            fulfillment_status TEXT NOT NULL DEFAULT 'pending',
            fulfilled_at TEXT,
            refunded_at TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # --- lgs_transfer_log ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lgs_transfer_log (
            id TEXT PRIMARY KEY,
            lgs_id TEXT NOT NULL REFERENCES lgs_partners(id),
            transfer_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            amount_cents INTEGER NOT NULL,
            stripe_transfer_id TEXT NOT NULL UNIQUE,
            stripe_invoice_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        )
    """)

    # --- Add marketplace columns to venues table ---
    _add_column(cur, "venues", "lgs_id", "TEXT")
    _add_column(cur, "venues", "subscription_tier", "TEXT NOT NULL DEFAULT 'starter'")
    _add_column(cur, "venues", "game_seat_limit", "INTEGER NOT NULL DEFAULT 10")
    _add_column(cur, "venues", "stripe_subscription_id", "TEXT")
    _add_column(cur, "venues", "stripe_customer_id", "TEXT")
    _add_column(cur, "venues", "subscription_status", "TEXT NOT NULL DEFAULT 'trialing'")
    _add_column(cur, "venues", "current_period_end", "TEXT")
    _add_column(cur, "venues", "purchases_enabled", "INTEGER NOT NULL DEFAULT 0")

    # --- Add marketplace columns to venue_games table ---
    _add_column(cur, "venue_games", "activated_at", "TEXT")
    _add_column(cur, "venue_games", "deactivated_at", "TEXT")

    # Backfill existing venue_games: set activated_at = added_at where null
    cur.execute("""
        UPDATE venue_games SET activated_at = added_at
        WHERE activated_at IS NULL AND is_active = 1
    """)

    conn.commit()
    conn.close()
    print("[GMG] Marketplace tables migration complete")
