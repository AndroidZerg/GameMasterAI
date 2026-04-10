"""Cleanup stale venues from Supabase — keep only the real venues + system accounts.

Run once to purge convention-created venue rows (conv-*, sm-*, rental-*).
Equivalent to the /api/v1/admin/cleanup-stale-venues endpoint.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.venue_service import get_all_venues, delete_venue

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
    rows = get_all_venues()
    print(f"Total venues in Supabase: {len(rows)}")

    to_delete = []
    for r in rows:
        vid = r.get("venue_id")
        vname = r.get("venue_name")
        role = r.get("role")
        email = r.get("email")
        if vid not in KEEP_VENUE_IDS:
            to_delete.append((vid, vname, role, email))
            print(f"  DELETE: {vid} ({vname}, role={role}, email={email})")
        else:
            print(f"  KEEP:   {vid} ({vname}, role={role})")

    if not to_delete:
        print("\nNo stale venues to delete.")
        return

    print(f"\nDeleting {len(to_delete)} stale venues...")
    for vid, _vname, _role, _email in to_delete:
        delete_venue(vid)

    print("Done. Stale venues purged from Supabase.")

    # Verify
    remaining = get_all_venues()
    print(f"\nRemaining venues: {len(remaining)}")
    for r in remaining:
        print(f"  {r.get('venue_id')}")


if __name__ == "__main__":
    cleanup()
