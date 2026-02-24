"""Static image serving for game covers and venue logos."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api", tags=["images"])

_IMAGES_DIR = Path(__file__).resolve().parents[4] / "content" / "images"
_VENUE_LOGOS_DIR = Path(__file__).resolve().parents[4] / "content" / "venue-logos"


@router.get("/images/{filename}")
async def get_image(filename: str):
    """Serve game cover images."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = _IMAGES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath, media_type="image/jpeg")


@router.get("/images/venue-logos/{filename}")
async def get_venue_logo(filename: str):
    """Serve venue logo images."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = _VENUE_LOGOS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Logo not found")
    return FileResponse(filepath, media_type="image/png")
