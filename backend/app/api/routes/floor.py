"""Floor plan management — tables and zones for Thai House dashboard."""

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional

from app.services.turso import get_menu_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["floor"])

STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")


def _verify_pin(pin: Optional[str]):
    if not pin or pin != STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


@router.get("/floor")
async def get_floor(x_staff_pin: Optional[str] = Header(None)):
    """Return all tables and zones."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    table_rows = db.execute(
        "SELECT id, num, x, y, w, h, type, seats, label, zone FROM floor_tables ORDER BY num"
    ).fetchall()
    tables = [
        {"id": r[0], "num": r[1], "x": r[2], "y": r[3], "w": r[4], "h": r[5],
         "type": r[6], "seats": r[7], "label": r[8], "zone": r[9]}
        for r in table_rows
    ]

    zone_rows = db.execute(
        "SELECT id, label, x, y, w, h, color, is_entrance FROM floor_zones ORDER BY id"
    ).fetchall()
    zones = [
        {"id": r[0], "label": r[1], "x": r[2], "y": r[3], "w": r[4], "h": r[5],
         "color": r[6], "is_entrance": bool(r[7])}
        for r in zone_rows
    ]

    return {"tables": tables, "zones": zones}


class TableData(BaseModel):
    id: Optional[int] = None
    num: int
    x: float
    y: float
    w: float = 90
    h: float = 50
    type: str = "table"
    seats: int = 4
    label: str = "Table"
    zone: str = ""


@router.put("/floor/tables")
async def bulk_update_tables(tables: List[TableData],
                             x_staff_pin: Optional[str] = Header(None)):
    """Bulk update all table positions/properties."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    db.execute("DELETE FROM floor_tables")
    for t in tables:
        db.execute(
            """INSERT INTO floor_tables (num, x, y, w, h, type, seats, label, zone)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (t.num, t.x, t.y, t.w, t.h, t.type, t.seats, t.label, t.zone)
        )
    db.commit()
    return {"success": True, "count": len(tables)}


class ZoneData(BaseModel):
    id: Optional[int] = None
    label: str
    x: float
    y: float
    w: float
    h: float
    color: str = "#2a3025"
    is_entrance: bool = False


@router.put("/floor/zones")
async def bulk_update_zones(zones: List[ZoneData],
                            x_staff_pin: Optional[str] = Header(None)):
    """Bulk update all zones."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    db.execute("DELETE FROM floor_zones")
    for z in zones:
        db.execute(
            """INSERT INTO floor_zones (label, x, y, w, h, color, is_entrance)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (z.label, z.x, z.y, z.w, z.h, z.color, 1 if z.is_entrance else 0)
        )
    db.commit()
    return {"success": True, "count": len(zones)}


@router.post("/floor/tables")
async def add_table(table: TableData,
                    x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        """INSERT INTO floor_tables (num, x, y, w, h, type, seats, label, zone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (table.num, table.x, table.y, table.w, table.h,
         table.type, table.seats, table.label, table.zone)
    )
    db.commit()
    row = db.execute("SELECT last_insert_rowid()").fetchone()
    return {"success": True, "id": row[0]}


@router.delete("/floor/tables/{table_id}")
async def delete_table(table_id: int,
                       x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute("DELETE FROM floor_tables WHERE id = ?", (table_id,))
    db.commit()
    return {"success": True}


@router.post("/floor/zones")
async def add_zone(zone: ZoneData,
                   x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        """INSERT INTO floor_zones (label, x, y, w, h, color, is_entrance)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (zone.label, zone.x, zone.y, zone.w, zone.h,
         zone.color, 1 if zone.is_entrance else 0)
    )
    db.commit()
    row = db.execute("SELECT last_insert_rowid()").fetchone()
    return {"success": True, "id": row[0]}


@router.delete("/floor/zones/{zone_id}")
async def delete_zone(zone_id: int,
                      x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute("DELETE FROM floor_zones WHERE id = ?", (zone_id,))
    db.commit()
    return {"success": True}


class PartyUpdate(BaseModel):
    party_size: int


@router.post("/floor/tables/{table_id}/party")
async def update_party(table_id: int, req: PartyUpdate,
                       x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        "UPDATE floor_tables SET seats = ? WHERE id = ?",
        (req.party_size, table_id)
    )
    db.commit()
    return {"success": True}
