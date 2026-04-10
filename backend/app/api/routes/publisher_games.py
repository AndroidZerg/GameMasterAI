"""Publisher Portal — game onboarding routes (create, upload, submit, review)."""

import re
from datetime import datetime, timezone
from typing import Optional, List

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.api.routes.publisher_auth import get_current_publisher
from app.services.supabase_client import get_admin_client

router = APIRouter(tags=["publisher-games"])

# Telegram — same GMG leads bot used elsewhere
_TG_BOT_TOKEN = "8535000205:AAEf2rJhVD89Qzx08Jxmalxu41PuQ1fpwR4"
_TG_CHAT_ID = "6236947695"

# Allowed asset types and image MIME types
_ALLOWED_ASSET_TYPES = {
    "cover_art", "component_render", "setup_photo",
    "rule_diagram", "promo_image", "other",
}
_IMAGE_MIME_TYPES = {
    "image/png", "image/jpeg", "image/jpg",
    "image/svg+xml", "image/webp",
}
_MAX_RULEBOOK_BYTES = 50 * 1024 * 1024  # 50MB
_MAX_ASSET_BYTES = 20 * 1024 * 1024     # 20MB


def _send_telegram(text: str):
    try:
        httpx.post(
            f"https://api.telegram.org/bot{_TG_BOT_TOKEN}/sendMessage",
            data={"chat_id": _TG_CHAT_ID, "text": text, "parse_mode": "Markdown"},
            timeout=10,
        )
    except Exception:
        pass


def _slugify(text: str) -> str:
    """Convert title to URL-safe slug: lowercase, hyphens, no special chars."""
    s = (text or "").lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s-]+", "-", s).strip("-")
    return s or "untitled"


def _verify_game_owner(admin, game_id: str, publisher_id: str) -> dict:
    """Fetch a game and verify it belongs to the publisher. Raises 404/403."""
    result = admin.table("publisher_games").select("*").eq("id", game_id).execute()
    if not result.data:
        raise HTTPException(404, "Game not found")
    game = result.data[0]
    if game["publisher_id"] != publisher_id:
        raise HTTPException(403, "Not your game")
    return game


# ── Request Models ──────────────────────────────────────────────

class CreateGameRequest(BaseModel):
    title: str
    game_id: Optional[str] = None
    player_count_min: Optional[int] = None
    player_count_max: Optional[int] = None
    player_count_recommended: Optional[int] = None
    play_time_min: Optional[int] = None
    play_time_max: Optional[int] = None
    complexity: Optional[str] = None
    categories: Optional[List[str]] = None
    msrp_cents: Optional[int] = None
    wholesale_cents: Optional[int] = None
    upc: Optional[str] = None
    bgg_url: Optional[str] = None
    description: Optional[str] = None


class UpdateGameRequest(BaseModel):
    title: Optional[str] = None
    player_count_min: Optional[int] = None
    player_count_max: Optional[int] = None
    player_count_recommended: Optional[int] = None
    play_time_min: Optional[int] = None
    play_time_max: Optional[int] = None
    complexity: Optional[str] = None
    categories: Optional[List[str]] = None
    msrp_cents: Optional[int] = None
    wholesale_cents: Optional[int] = None
    upc: Optional[str] = None
    bgg_url: Optional[str] = None
    description: Optional[str] = None
    demo_units: Optional[int] = None
    sale_units: Optional[int] = None
    onboarding_step: Optional[int] = None
    status: Optional[str] = None


class SubmitGameRequest(BaseModel):
    demo_units: int = 1
    sale_units: int = 0


class GuideReviewRequest(BaseModel):
    action: str  # "approved" | "revision_requested"
    feedback: Optional[str] = None


# ── Routes: Create / List / Get / Update ────────────────────────

@router.post("/games")
async def create_game(body: CreateGameRequest, request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()

    if not body.title or not body.title.strip():
        raise HTTPException(400, "Title is required")

    game_slug = body.game_id or _slugify(body.title)
    msrp = body.msrp_cents or 0
    wholesale = body.wholesale_cents if body.wholesale_cents is not None else (msrp // 2)

    now = datetime.now(timezone.utc).isoformat()
    data = {
        "publisher_id": publisher["id"],
        "game_id": game_slug,
        "title": body.title.strip(),
        "player_count_min": body.player_count_min,
        "player_count_max": body.player_count_max,
        "player_count_recommended": body.player_count_recommended,
        "play_time_min": body.play_time_min,
        "play_time_max": body.play_time_max,
        "complexity": body.complexity,
        "categories": body.categories or [],
        "msrp_cents": msrp,
        "wholesale_cents": wholesale,
        "upc": body.upc,
        "bgg_url": body.bgg_url,
        "description": body.description,
        "status": "onboarding",
        "onboarding_step": 1,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = admin.table("publisher_games").insert(data).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to create game: {e}")

    return result.data[0] if result.data else data


@router.get("/games")
async def list_games(request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()

    result = (
        admin.table("publisher_games")
        .select("*")
        .eq("publisher_id", publisher["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/games/{game_id}")
async def get_game(game_id: str, request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    game = _verify_game_owner(admin, game_id, publisher["id"])

    try:
        assets = admin.table("publisher_assets").select("*").eq("game_id", game_id).execute()
        game["assets"] = assets.data or []
    except Exception:
        game["assets"] = []

    return game


@router.patch("/games/{game_id}")
async def update_game(game_id: str, body: UpdateGameRequest, request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    _verify_game_owner(admin, game_id, publisher["id"])

    updates = {}
    for field in (
        "title", "player_count_min", "player_count_max", "player_count_recommended",
        "play_time_min", "play_time_max", "complexity", "categories",
        "msrp_cents", "wholesale_cents", "upc", "bgg_url", "description",
        "demo_units", "sale_units", "onboarding_step", "status",
    ):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    if not updates:
        result = admin.table("publisher_games").select("*").eq("id", game_id).execute()
        return result.data[0] if result.data else {}

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = admin.table("publisher_games").update(updates).eq("id", game_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to update game: {e}")

    return result.data[0] if result.data else updates


# ── Routes: File Uploads ────────────────────────────────────────

@router.post("/games/{game_id}/upload-rulebook")
async def upload_rulebook(
    game_id: str,
    request: Request,
    file: UploadFile = File(...),
):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    _verify_game_owner(admin, game_id, publisher["id"])

    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(400, "Rulebook must be a PDF")

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_RULEBOOK_BYTES:
        raise HTTPException(400, "Rulebook exceeds 50MB limit")
    if not file_bytes:
        raise HTTPException(400, "Empty file")

    storage_path = f"{publisher['user_id']}/{game_id}/rulebook.pdf"

    try:
        admin.storage.from_("publisher-rulebooks").upload(
            storage_path,
            file_bytes,
            {"content-type": "application/pdf", "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(500, f"Storage upload failed: {e}")

    # Remove any prior rulebook record for this game so we keep one row per file slot
    try:
        admin.table("publisher_assets").delete().eq("game_id", game_id).eq("asset_type", "rulebook_pdf").execute()
    except Exception:
        pass

    asset_data = {
        "publisher_id": publisher["id"],
        "game_id": game_id,
        "asset_type": "rulebook_pdf",
        "filename": file.filename or "rulebook.pdf",
        "storage_path": storage_path,
        "mime_type": "application/pdf",
        "file_size_bytes": len(file_bytes),
        "description": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = admin.table("publisher_assets").insert(asset_data).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to record asset: {e}")

    return result.data[0] if result.data else asset_data


@router.post("/games/{game_id}/upload-assets")
async def upload_assets(
    game_id: str,
    request: Request,
    files: List[UploadFile] = File(...),
    asset_type: str = Form(...),
    description: Optional[str] = Form(None),
):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    _verify_game_owner(admin, game_id, publisher["id"])

    if asset_type not in _ALLOWED_ASSET_TYPES:
        raise HTTPException(400, f"Invalid asset_type. Must be one of: {sorted(_ALLOWED_ASSET_TYPES)}")

    # Cover art is single-slot; replace any prior cover_art record
    if asset_type == "cover_art":
        try:
            admin.table("publisher_assets").delete().eq("game_id", game_id).eq("asset_type", "cover_art").execute()
        except Exception:
            pass

    created = []
    now = datetime.now(timezone.utc).isoformat()

    for file in files:
        if file.content_type not in _IMAGE_MIME_TYPES:
            raise HTTPException(400, f"{file.filename}: must be PNG, JPG, SVG, or WebP")

        file_bytes = await file.read()
        if len(file_bytes) > _MAX_ASSET_BYTES:
            raise HTTPException(400, f"{file.filename}: exceeds 20MB limit")
        if not file_bytes:
            continue

        # Sanitize filename to safe storage segment
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "asset")
        storage_path = f"{publisher['user_id']}/{game_id}/{asset_type}_{safe_name}"

        try:
            admin.storage.from_("publisher-assets").upload(
                storage_path,
                file_bytes,
                {"content-type": file.content_type, "upsert": "true"},
            )
        except Exception as e:
            raise HTTPException(500, f"Storage upload failed for {file.filename}: {e}")

        asset_data = {
            "publisher_id": publisher["id"],
            "game_id": game_id,
            "asset_type": asset_type,
            "filename": file.filename or safe_name,
            "storage_path": storage_path,
            "mime_type": file.content_type,
            "file_size_bytes": len(file_bytes),
            "description": description,
            "created_at": now,
        }

        try:
            result = admin.table("publisher_assets").insert(asset_data).execute()
            if result.data:
                created.append(result.data[0])
            else:
                created.append(asset_data)
        except Exception as e:
            raise HTTPException(500, f"Failed to record asset: {e}")

    return created


@router.delete("/games/{game_id}/assets/{asset_id}")
async def delete_asset(game_id: str, asset_id: str, request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    _verify_game_owner(admin, game_id, publisher["id"])

    asset_res = admin.table("publisher_assets").select("*").eq("id", asset_id).execute()
    if not asset_res.data:
        raise HTTPException(404, "Asset not found")
    asset = asset_res.data[0]

    if asset["publisher_id"] != publisher["id"] or asset["game_id"] != game_id:
        raise HTTPException(403, "Not your asset")

    bucket = "publisher-rulebooks" if asset["asset_type"] == "rulebook_pdf" else "publisher-assets"
    try:
        admin.storage.from_(bucket).remove([asset["storage_path"]])
    except Exception:
        pass  # storage cleanup failure shouldn't block DB delete

    try:
        admin.table("publisher_assets").delete().eq("id", asset_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to delete asset: {e}")

    return {"ok": True}


# ── Routes: Submit & Review ─────────────────────────────────────

@router.post("/games/{game_id}/submit")
async def submit_game(game_id: str, body: SubmitGameRequest, request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    game = _verify_game_owner(admin, game_id, publisher["id"])

    # Validate required assets
    assets_res = admin.table("publisher_assets").select("asset_type").eq("game_id", game_id).execute()
    asset_types = {a["asset_type"] for a in (assets_res.data or [])}

    if "rulebook_pdf" not in asset_types:
        raise HTTPException(400, "Rulebook PDF is required before submitting")
    if "cover_art" not in asset_types:
        raise HTTPException(400, "Cover art is required before submitting")

    if body.demo_units < 1:
        raise HTTPException(400, "At least 1 demo unit is required")
    if body.sale_units < 0:
        raise HTTPException(400, "Sale units cannot be negative")

    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "status": "in_review",
        "guide_status": "not_started",
        "onboarding_step": 5,
        "demo_units": body.demo_units,
        "sale_units": body.sale_units,
        "guide_submitted_at": now,
        "updated_at": now,
    }

    try:
        result = admin.table("publisher_games").update(updates).eq("id", game_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to submit game: {e}")

    asset_count = len(assets_res.data or [])
    msrp_dollars = (game.get("msrp_cents") or 0) / 100
    _send_telegram(
        "\U0001f3ae *New game submitted for review!*\n\n"
        f"*Publisher:* {publisher.get('company_name', 'Unknown')}\n"
        f"*Game:* {game.get('title')}\n"
        f"*MSRP:* ${msrp_dollars:.2f}\n"
        f"*Units:* {body.demo_units} demo + {body.sale_units} sale\n"
        f"*Assets:* {asset_count} files uploaded\n\n"
        "Review at playgmg.com/admin/dashboard \u2192 Publishers tab"
    )

    return result.data[0] if result.data else updates


@router.post("/games/{game_id}/guide-review")
async def submit_guide_review(game_id: str, body: GuideReviewRequest, request: Request):
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    game = _verify_game_owner(admin, game_id, publisher["id"])

    if body.action not in ("approved", "revision_requested"):
        raise HTTPException(400, "action must be 'approved' or 'revision_requested'")

    if game.get("guide_status") != "ready_for_review":
        raise HTTPException(400, "Guide is not ready for review yet")

    now = datetime.now(timezone.utc).isoformat()

    try:
        admin.table("publisher_guide_reviews").insert({
            "publisher_game_id": game_id,
            "reviewer": "publisher",
            "action": body.action,
            "feedback": body.feedback or "",
            "created_at": now,
        }).execute()
    except Exception:
        pass  # review log failure is non-fatal

    updates = {
        "guide_status": body.action,
        "guide_reviewed_at": now,
        "guide_feedback": body.feedback or "",
        "updated_at": now,
    }
    if body.action == "approved":
        updates["status"] = "live"

    try:
        result = admin.table("publisher_games").update(updates).eq("id", game_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to record review: {e}")

    company = publisher.get("company_name", "Publisher")
    title = game.get("title", "their game")
    if body.action == "approved":
        _send_telegram(f"\u2705 *{company}* approved the guide for *{title}* \u2014 game is now LIVE")
    else:
        feedback_text = body.feedback or "(no notes)"
        _send_telegram(f"\U0001f4dd *{company}* requested revisions for *{title}*:\n{feedback_text}")

    return result.data[0] if result.data else updates
