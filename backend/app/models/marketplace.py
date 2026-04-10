"""Marketplace tables — LGS partners, game pricing, inventory, purchases, transfers.

Wave 4 (2026-04-10): All marketplace tables now live in Supabase Postgres.
Retained as a no-op so ``main.py``'s lifespan call site doesn't need to change.
Tables: lgs_partners, lgs_game_pricing, venue_game_inventory, game_purchases,
lgs_transfer_log — all created with RLS policies by the migration script.
"""


def init_marketplace_tables():
    """All marketplace tables now live in Supabase. No-op."""
    print("[GMG] Marketplace tables: skipped (Supabase)")
