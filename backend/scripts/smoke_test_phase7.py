"""Phase 7 — comprehensive smoke test of every Wave 1 path against TestClient.

Run with env vars set:
  SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAI_JWT_SECRET, DB_PATH
"""
import sys

from fastapi.testclient import TestClient

import app.main
client = TestClient(app.main.app)

PASS = 0
FAIL = 0


def check(label, ok):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  + {label}")
    else:
        FAIL += 1
        print(f"  X {label}")


def section(name):
    print(f"\n--- {name} ---")


with client:
    # ── Health ──
    section("Health")
    r = client.get("/health")
    check("health 200", r.status_code == 200)
    check("health ok", r.json().get("status") == "ok")

    # ── Auth login: by email (super_admin) ──
    section("Auth: super_admin login by email")
    r = client.post("/api/auth/login", json={"email": "admin@playgmg.com", "password": "watress2"})
    check("admin login 200", r.status_code == 200)
    admin_token = r.json().get("token", "")
    check("admin token present", bool(admin_token))
    check("admin role super_admin", r.json().get("role") == "super_admin")

    # ── Auth login: by venue_id (Shall We Play) — passed in 'email' field ──
    section("Auth: venue login by venue_id (in email field)")
    r = client.post("/api/auth/login", json={"email": "shallweplay", "password": "gmg2026"})
    check("shallweplay login 200", r.status_code == 200)
    swp_token = r.json().get("token", "")
    check("swp token present", bool(swp_token))

    # ── Auth login: by username (Shall We Play) ──
    section("Auth: login by username (in email field)")
    r = client.post("/api/auth/login", json={"email": "swp", "password": "gmg2026"})
    check("swp username login 200", r.status_code == 200)

    # ── Thai house login ──
    section("Auth: thaihouse login")
    r = client.post("/api/auth/login", json={"email": "thaihouse", "password": "gmai2026"})
    check("thaihouse login 200", r.status_code == 200)

    # ── Meetup login blocked when toggle off ──
    section("Auth: meetup blocked when toggle off")
    r = client.post("/api/auth/login", json={"email": "meetup@playgmg.com", "password": "bgninhenderson"})
    check("meetup blocked (403 or 200 if toggle on)", r.status_code in (200, 403))

    # ── Wrong password 401 ──
    section("Auth: wrong password")
    r = client.post("/api/auth/login", json={"email": "admin@playgmg.com", "password": "wrong"})
    check("wrong pw 401", r.status_code == 401)

    # ── Token verify ──
    section("Auth: token verify")
    r = client.post("/api/auth/verify", headers={"Authorization": f"Bearer {admin_token}"})
    check("verify 200", r.status_code == 200)
    check("verify role admin", r.json().get("role") == "super_admin")

    # ── Guest auth (GET with venue= query) ──
    section("Auth: guest")
    r = client.get("/api/auth/guest", params={"venue": "shallweplay"})
    check("guest 200", r.status_code == 200)
    check("guest token present", bool(r.json().get("token")))
    check("guest role", r.json().get("role") == "guest")

    # ── Magic-link join: invalid key 401 ──
    section("Auth: magic-link join (invalid key)")
    r = client.get("/api/auth/join", params={"key": "invalid-key-xyz"})
    check("magic link 401 invalid key", r.status_code == 401)

    # ── Convention signup (idempotent) ──
    section("Auth: convention signup")
    r = client.post("/api/auth/signup", json={"email": "smoke-test-conv@example.com"})
    check("convention signup 200", r.status_code == 200)
    check("convention signup -> dicetowerwest", r.json().get("venue_id") == "dicetowerwest")
    check("convention signup role", r.json().get("role") == "convention")

    # ── Stonemaier signup (separate endpoint) ──
    section("Auth: stonemaier signup")
    r = client.post(
        "/api/auth/signup/stonemaier",
        json={"first_name": "SmokeTest", "email": "smoke-test-sm@example.com"},
    )
    check("stonemaier signup 200", r.status_code == 200)

    # ── Admin: list venues ──
    section("Admin: venues list")
    r = client.get("/api/admin/venues", headers={"Authorization": f"Bearer {admin_token}"})
    check("admin venues 200", r.status_code == 200)
    venues_data = r.json()
    venues_list = venues_data if isinstance(venues_data, list) else venues_data.get("venues", [])
    check("admin venues non-empty", len(venues_list) > 0)
    print(f"    venue count: {len(venues_list)}")

    # ── Admin: list signups ──
    section("Admin: signups list")
    r = client.get("/api/admin/signups", headers={"Authorization": f"Bearer {admin_token}"})
    check("admin signups 200", r.status_code == 200)
    sg = r.json()
    print(f"    signup count: {sg.get('count') if isinstance(sg, dict) else len(sg)}")

    # ── Admin: meetup toggle GET ──
    section("Admin: meetup toggle GET")
    r = client.get("/api/admin/meetup-toggle", headers={"Authorization": f"Bearer {admin_token}"})
    check("meetup toggle 200", r.status_code == 200)
    check("meetup toggle has meetup_enabled", "meetup_enabled" in r.json())

    # ── Admin: clear-recent-ts (public) ──
    section("Admin: clear-recent-ts public")
    r = client.get("/api/admin/clear-recent-ts")
    check("clear-recent-ts 200", r.status_code == 200)
    check("has clear_recent_ts", "clear_recent_ts" in r.json())

    # ── Admin: clear-recent POST (super_admin) ──
    section("Admin: clear-recent POST")
    r = client.post("/api/admin/clear-recent", headers={"Authorization": f"Bearer {admin_token}"})
    check("clear-recent POST 200", r.status_code == 200)

    # ── Admin: collection GET ──
    section("Admin: collection GET")
    r = client.get(
        "/api/admin/collection",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"venue_id": "shallweplay"},
    )
    check("admin collection 200", r.status_code == 200)

    # ── Home config: GET /me with auth (admin -> global) ──
    section("Home config: GET /me admin")
    r = client.get("/api/home-config/me", headers={"Authorization": f"Bearer {admin_token}"})
    check("home /me admin 200", r.status_code == 200)
    check("admin venue_key=global", r.json().get("venue_key") == "global")

    # ── Home config: GET /me anon ──
    section("Home config: GET /me anon")
    r = client.get("/api/home-config/me")
    check("home /me anon 200", r.status_code == 200)

    # ── Home config: GET /global ──
    section("Home config: GET /global")
    r = client.get("/api/home-config/global", headers={"Authorization": f"Bearer {admin_token}"})
    check("home /global 200", r.status_code == 200)

    # ── Home config: PUT global staff picks then GET ──
    section("Home config: PUT global staff-picks")
    r = client.put(
        "/api/home-config/global/staff-picks",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"game_ids": ["scythe", "wingspan"]},
    )
    check("PUT staff-picks 200", r.status_code == 200)
    r = client.get("/api/home-config/global", headers={"Authorization": f"Bearer {admin_token}"})
    picks = r.json().get("staff_picks", [])
    check("staff-picks readback contains scythe", "scythe" in picks)
    check("staff-picks readback contains wingspan", "wingspan" in picks)

    # ── Home config: PUT global GOTD ──
    section("Home config: PUT global GOTD")
    r = client.put(
        "/api/home-config/global/gotd",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"game_id": "scythe", "mode": "manual"},
    )
    check("PUT gotd 200", r.status_code == 200)

    # ── Home config: keys (super admin) ──
    section("Home config: GET /keys")
    r = client.get("/api/home-config/keys", headers={"Authorization": f"Bearer {admin_token}"})
    check("home keys 200", r.status_code == 200)
    print(f"    configured keys: {r.json().get('keys')}")

    # ── Games endpoint ──
    section("Games: GET /api/games")
    r = client.get("/api/games", headers={"Authorization": f"Bearer {admin_token}"})
    check("games 200", r.status_code == 200)
    games_data = r.json()
    games_list = games_data if isinstance(games_data, list) else games_data.get("games", [])
    check("games non-empty", len(games_list) > 0)
    print(f"    game count: {len(games_list)}")

    # ── Venue collection ──
    section("Venue: GET /api/venue")
    r = client.get("/api/venue", headers={"Authorization": f"Bearer {swp_token}"})
    check("venue 200", r.status_code == 200)


print(f"\n=== Smoke test: {PASS} passed, {FAIL} failed ===")
sys.exit(0 if FAIL == 0 else 1)
