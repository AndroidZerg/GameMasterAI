"""Contacts model — Supabase (contacts table).

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
demo-request leads persist across Render deploys.
"""

from app.services.supabase_client import get_admin_client


def init_contacts_table():
    """No-op — contacts table lives in Supabase."""
    return None


def create_contact(name: str, venue_name: str, email: str, message: str) -> int:
    admin = get_admin_client()
    result = admin.table("contacts").insert({
        "name": name,
        "venue_name": venue_name,
        "email": email,
        "message": message,
    }).execute()
    return result.data[0]["id"] if result.data else 0


def get_all_contacts() -> list[dict]:
    """Return all contacts, newest first."""
    admin = get_admin_client()
    result = (
        admin.table("contacts")
        .select("name,venue_name,email,message,created_at")
        .order("id", desc=True)
        .execute()
    )
    rows = result.data or []
    return [
        {
            "name": r.get("name") or "",
            "venue": r.get("venue_name") or "",
            "email": r.get("email") or "",
            "message": r.get("message") or "",
            "submitted_at": r.get("created_at"),
        }
        for r in rows
    ]
