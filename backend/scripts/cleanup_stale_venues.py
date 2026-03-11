"""Cleanup stale venues from Turso — keep only the 3 real venues + system accounts.

Run once after deploy to purge convention-created venue rows (conv-*, sm-*, rental-*).
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.turso import get_venues_db

# Venue IDs to KEEP
KEEP_VENUE_IDS = {
    # Real venues
    "thaihouse",
    "shallweplay",
    "dicetowerwest",
    # System / admin accounts
    "admin",
    "demo-dicetower",
    "meetup",
    "meetup-admin",
    "playgmai-demo",
}


def cleanup():
    db = get_venues_db()

    # List all venues
    rows = db.execute("SELECT venue_id, venue_name, role, email FROM venues").fetchall()
    print(f"Total venues in Turso: {len(rows)}")

    to_delete = []
    for r in rows:
        vid = r[0] if isinstance(r, (list, tuple)) else r["venue_id"]
        vname = r[1] if isinstance(r, (list, tuple)) else r["venue_name"]
        role = r[2] if isinstance(r, (list, tuple)) else r["role"]
        email = r[3] if isinstance(r, (list, tuple)) else r["email"]
        if vid not in KEEP_VENUE_IDS:
            to_delete.append((vid, vname, role, email))
            print(f"  DELETE: {vid} ({vname}, role={role}, email={email})")
        else:
            print(f"  KEEP:   {vid} ({vname}, role={role})")

    if not to_delete:
        print("\nNo stale venues to delete.")
        return

    print(f"\nDeleting {len(to_delete)} stale venues...")

    for vid, vname, role, email in to_delete:
        # Delete venue collections
        db.execute("DELETE FROM venue_collections WHERE venue_id = ?", (vid,))
        # Delete the venue itself
        db.execute("DELETE FROM venues WHERE venue_id = ?", (vid,))

    db.commit()
    print("Done. Stale venues purged from Turso.")

    # Verify
    remaining = db.execute("SELECT venue_id FROM venues").fetchall()
    print(f"\nRemaining venues: {len(remaining)}")
    for r in remaining:
        vid = r[0] if isinstance(r, (list, tuple)) else r["venue_id"]
        print(f"  {vid}")


if __name__ == "__main__":
    cleanup()
