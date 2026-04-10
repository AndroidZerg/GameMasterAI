"""Venue Platform — DB migrations.

Wave 4 (2026-04-10): All venue platform tables now live in Supabase Postgres
(venue_logos, venue_games, venue_menu_categories, venue_menu_items,
venue_analytics_daily, venue_analytics_hourly, venue_game_stats,
venue_top_questions). This module is retained as a no-op so ``main.py``'s
lifespan call site doesn't need to change.
"""


def run_migrations():
    """All venue platform tables now live in Supabase. No-op."""
    print("[GMAI] Venue platform migrations: skipped (Supabase)")
