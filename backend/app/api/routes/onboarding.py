"""Onboarding router — venue setup wizard endpoints (5 steps)."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.auth import get_current_venue
from app.services.onboarding import (
    save_venue_info,
    save_logo,
    get_logo,
    get_game_catalog,
    save_game_collection,
    save_menu,
    complete_onboarding,
    get_onboarding_progress,
    get_venue_games,
    get_venue_menu,
)

# No prefix — routes use full paths so we can serve logo at /api/v1/venues/{id}/logo
router = APIRouter(tags=["onboarding"])

_PREFIX = "/api/v1/onboarding"


# ── Pydantic models ──────────────────────────────────────────────

class Step1Body(BaseModel):
    venue_name: str
    address: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    phone: str = ""
    contact_name: str = ""
    hours_json: dict = {}


class Step3Body(BaseModel):
    owned_game_ids: list[str]
    priority_game_ids: list[str] = Field(default_factory=list, max_length=20)


class MenuItem(BaseModel):
    name: str
    description: str = ""
    price_dollars: float
    is_available: bool = True


class MenuCategory(BaseModel):
    name: str
    items: list[MenuItem] = []


class Step4Body(BaseModel):
    categories: list[MenuCategory]


# ── Health ────────────────────────────────────────────────────────

@router.get(f"{_PREFIX}/health")
def health():
    return {"status": "ok", "router": "onboarding"}


# ── Progress (resume logic) ──────────────────────────────────────

@router.get(f"{_PREFIX}/progress")
async def progress(venue=Depends(get_current_venue)):
    """Get current onboarding state for resume."""
    data = get_onboarding_progress(venue["venue_id"])
    data["games"] = get_venue_games(venue["venue_id"])
    data["menu"] = get_venue_menu(venue["venue_id"])
    return data


# ── Step 1: Venue Info ────────────────────────────────────────────

@router.post(f"{_PREFIX}/step/1")
async def step1(body: Step1Body, venue=Depends(get_current_venue)):
    return save_venue_info(
        venue_id=venue["venue_id"],
        venue_name=body.venue_name,
        address=body.address,
        city=body.city,
        state=body.state,
        zip_code=body.zip_code,
        phone=body.phone,
        contact_name=body.contact_name,
        hours_json=body.hours_json,
    )


# ── Step 2: Logo Upload ──────────────────────────────────────────

@router.post(f"{_PREFIX}/step/2/logo")
async def step2_logo(
    file: UploadFile = File(...),
    venue=Depends(get_current_venue),
):
    allowed = {"image/png", "image/jpeg", "image/webp"}
    ct = file.content_type or ""
    if ct not in allowed:
        raise HTTPException(400, f"Invalid file type: {ct}. Allowed: PNG, JPG, WEBP")

    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum 2MB.")

    return save_logo(venue["venue_id"], data, ct)


# ── Step 3: Game Collection ──────────────────────────────────────

@router.get(f"{_PREFIX}/games")
async def games_catalog(venue=Depends(get_current_venue)):
    """Return full game catalog for the game picker."""
    return get_game_catalog()


@router.post(f"{_PREFIX}/step/3")
async def step3(body: Step3Body, venue=Depends(get_current_venue)):
    if len(body.priority_game_ids) > 20:
        raise HTTPException(400, "Maximum 20 priority games allowed.")
    owned_set = set(body.owned_game_ids)
    for pid in body.priority_game_ids:
        if pid not in owned_set:
            raise HTTPException(400, f"Priority game '{pid}' must be in owned list.")
    return save_game_collection(
        venue["venue_id"], body.owned_game_ids, body.priority_game_ids,
    )


# ── Step 4: Menu ─────────────────────────────────────────────────

@router.post(f"{_PREFIX}/step/4")
async def step4(body: Step4Body, venue=Depends(get_current_venue)):
    cats = [
        {
            "name": c.name,
            "items": [
                {
                    "name": it.name,
                    "description": it.description,
                    "price_dollars": it.price_dollars,
                    "is_available": it.is_available,
                }
                for it in c.items
            ],
        }
        for c in body.categories
    ]
    return save_menu(venue["venue_id"], cats)


# ── Step 5: Complete ─────────────────────────────────────────────

@router.post(f"{_PREFIX}/complete")
async def complete(venue=Depends(get_current_venue)):
    return complete_onboarding(venue["venue_id"])


# ── Logo serving (public, different URL namespace) ───────────────

@router.get("/api/v1/venues/{venue_id}/logo")
async def serve_logo(venue_id: str):
    """Serve venue logo as binary image. Public endpoint, cached 24h."""
    result = get_logo(venue_id)
    if not result:
        raise HTTPException(404, "No logo found")
    return Response(
        content=result["logo_data"],
        media_type=result["content_type"],
        headers={"Cache-Control": "max-age=86400"},
    )
