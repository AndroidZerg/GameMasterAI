"""Publisher leads model — Supabase (publisher_leads table).

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
publisher outreach leads persist across Render deploys.

Note: the Supabase schema differs from legacy SQLite. first_name + last_name
are collapsed into contact_name, company maps to company_name, and games
maps to game_count (both are free-text).
"""

from app.services.supabase_client import get_admin_client


def init_publisher_leads_table():
    """No-op — publisher_leads table lives in Supabase."""
    return None


def create_publisher_lead(
    first_name: str, last_name: str, company: str,
    games: str, email: str, message: str,
) -> int:
    admin = get_admin_client()
    contact_name = " ".join(p for p in (first_name, last_name) if p).strip()
    result = admin.table("publisher_leads").insert({
        "company_name": company,
        "contact_name": contact_name,
        "email": email,
        "game_count": games,
        "message": message or "",
        "source": "landing-page",
    }).execute()
    return result.data[0]["id"] if result.data else 0


def get_all_publisher_leads() -> list[dict]:
    """Return all publisher leads, newest first."""
    admin = get_admin_client()
    result = (
        admin.table("publisher_leads")
        .select("contact_name,company_name,game_count,email,message,created_at")
        .order("id", desc=True)
        .execute()
    )
    rows = result.data or []
    out = []
    for r in rows:
        contact = (r.get("contact_name") or "").strip()
        if contact:
            parts = contact.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
        else:
            first_name = ""
            last_name = ""
        out.append({
            "first_name": first_name,
            "last_name": last_name,
            "company": r.get("company_name") or "",
            "games": r.get("game_count") or "",
            "email": r.get("email") or "",
            "message": r.get("message") or "",
            "submitted_at": r.get("created_at"),
        })
    return out
