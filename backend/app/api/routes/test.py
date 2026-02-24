from fastapi import APIRouter
router = APIRouter()

@router.get("/api/test")
async def test_endpoint():
    return {"status": "ok", "track": "backend", "message": "Parallel sprint verified"}
