"""
One-time script to seed Turso with the current meetup.json menu data.
Run locally with Turso env vars set, or on first deploy (auto-seeds).

Usage:
    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... python tools/seed-menu-to-turso.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.turso import get_menu_db, init_menu_tables, seed_menu_from_json

print("Initializing menu tables...")
init_menu_tables()

db = get_menu_db()
count = db.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]

if count > 0:
    print(f"Menu tables already have {count} items. Skipping seed.")
    print("To force re-seed, clear the tables first:")
    print("  DELETE FROM menu_items; DELETE FROM menu_categories; DELETE FROM menu_toggles;")
else:
    print("Seeding from meetup.json...")
    seed_menu_from_json()

# Verify
cats = db.execute("SELECT COUNT(*) FROM menu_categories").fetchone()[0]
items = db.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
toggles = db.execute("SELECT COUNT(*) FROM menu_toggles").fetchone()[0]
print(f"\nResult: {cats} categories, {items} items, {toggles} toggles")
