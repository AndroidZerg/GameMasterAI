"""Static image serving for game covers and venue logos."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api", tags=["images"])

_IMAGES_DIR = Path(__file__).resolve().parents[4] / "content" / "images"
_VENUE_LOGOS_DIR = Path(__file__).resolve().parents[4] / "content" / "venue-logos"
_MENU_IMAGES_DIR = Path(__file__).resolve().parents[4] / "content" / "images" / "menu"


@router.get("/images/venue-logos/{filename}")
async def get_venue_logo(filename: str):
    """Serve venue logo images."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = _VENUE_LOGOS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Logo not found")
    return FileResponse(filepath, media_type="image/png")


@router.get("/images/menu/{filename}")
async def get_menu_image(filename: str):
    """Serve menu food photos with caching."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = _MENU_IMAGES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    suffix = filepath.suffix.lower()
    media = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
             "webp": "image/webp"}.get(suffix.lstrip("."), "image/jpeg")
    return FileResponse(filepath, media_type=media,
                        headers={"Cache-Control": "public, max-age=86400"})


@router.get("/images/{game_id}/{filename}")
async def get_step_image(game_id: str, filename: str):
    """Serve teaching-mode step images from content/images/{game_id}/."""
    if ".." in game_id or "/" in game_id or "\\" in game_id:
        raise HTTPException(status_code=400, detail="Invalid game_id")
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = _IMAGES_DIR / game_id / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    suffix = filepath.suffix.lower()
    media = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
             "webp": "image/webp", "gif": "image/gif"}.get(suffix.lstrip("."), "image/jpeg")
    return FileResponse(filepath, media_type=media)


@router.get("/images/{filename}")
async def get_image(filename: str):
    """Serve game cover images."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = _IMAGES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath, media_type="image/jpeg")
