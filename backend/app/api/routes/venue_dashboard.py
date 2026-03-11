"""Venue Dashboard router — analytics and management endpoints for venue owners."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_venue
from app.services.venue_analytics import (
    get_home_stats,
    get_analytics,
    get_library,
    update_game_flags,
    get_menu,
    update_menu_item,
    delete_menu_item,
    create_category,
    create_menu_item,
)

router = APIRouter(prefix="/api/v1/venue", tags=["venue"])

ALLOWED_ROLES = {"super_admin", "demo", "venue_admin"}


def _require_venue_role(venue: dict):
    if venue.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Venue admin access required")


# ── Health ──────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "router": "venue_dashboard"}


# ── Home ────────────────────────────────────────────────────────

@router.get("/home")
async def venue_home(venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    venue_id = venue["venue_id"]
    stats = get_home_stats(venue_id)
    return stats


# ── Analytics ───────────────────────────────────────────────────

@router.get("/analytics")
async def venue_analytics(days: int = 30, venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    if days not in (7, 30, 90):
        days = 30
    return get_analytics(venue["venue_id"], days)


# ── Library ─────────────────────────────────────────────────────

@router.get("/library")
async def venue_library(venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    return get_library(venue["venue_id"])


class GameFlagsUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_priority: Optional[bool] = None


@router.patch("/library/{game_id}")
async def update_library_game(game_id: str, body: GameFlagsUpdate, venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    ok = update_game_flags(venue["venue_id"], game_id, updates)
    if not ok:
        raise HTTPException(status_code=404, detail="Game not found in your library")
    return {"status": "ok"}


# ── Menu ────────────────────────────────────────────────────────

@router.get("/menu")
async def venue_menu(venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    return get_menu(venue["venue_id"])


class MenuItemUpdate(BaseModel):
    is_eighty_sixed: Optional[bool] = None
    is_available: Optional[bool] = None
    price_cents: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None


@router.patch("/menu/items/{item_id}")
async def patch_menu_item(item_id: int, body: MenuItemUpdate, venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    ok = update_menu_item(venue["venue_id"], item_id, updates)
    if not ok:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"status": "ok"}


class CategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


@router.post("/menu/categories")
async def add_category(body: CategoryCreate, venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    cat_id = create_category(venue["venue_id"], body.name, body.sort_order)
    return {"status": "ok", "id": cat_id}


class MenuItemCreate(BaseModel):
    name: str
    description: str = ""
    price_dollars: float = 0.0
    is_available: bool = True


@router.post("/menu/categories/{category_id}/items")
async def add_menu_item(category_id: int, body: MenuItemCreate, venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    price_cents = int(body.price_dollars * 100)
    try:
        item_id = create_menu_item(
            venue["venue_id"], category_id, body.name,
            body.description, price_cents, body.is_available,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"status": "ok", "id": item_id}


@router.delete("/menu/items/{item_id}")
async def remove_menu_item(item_id: int, venue: dict = Depends(get_current_venue)):
    _require_venue_role(venue)
    ok = delete_menu_item(venue["venue_id"], item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"status": "ok"}
