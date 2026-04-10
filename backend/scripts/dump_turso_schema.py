"""Dump live Turso schema (tables, columns, row counts) for migration planning.

Uses Turso's HTTP API directly so it works on Python 3.13 where
libsql_experimental fails to build.

Env vars required:
    TURSO_DATABASE_URL (libsql://...)
    TURSO_AUTH_TOKEN
"""
from __future__ import annotations

import json
import os
import sys

import httpx

URL = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://")
TOKEN = os.environ["TURSO_AUTH_TOKEN"]
ENDPOINT = f"{URL}/v2/pipeline"


def _exec(sql: str, params: list | None = None) -> dict:
    body = {
        "requests": [
            {"type": "execute", "stmt": {"sql": sql, "args": params or []}},
            {"type": "close"},
        ]
    }
    r = httpx.post(
        ENDPOINT,
        headers={"Authorization": f"Bearer {TOKEN}"},
        json=body,
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["results"][0]["response"]["result"]


def _rows(result: dict) -> list[list]:
    """Flatten Turso's nested {type, value} cell format into plain values."""
    out = []
    for row in result.get("rows", []):
        out.append(
            [
                cell.get("value") if isinstance(cell, dict) else cell
                for cell in row
            ]
        )
    return out


def main() -> int:
    tables_result = _exec(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    table_names = [r[0] for r in _rows(tables_result)]

    print(f"=== TURSO SCHEMA DUMP ({len(table_names)} tables) ===\n")
    summary = []
    for name in table_names:
        try:
            info = _exec(f"PRAGMA table_info({name})")
            cols = _rows(info)
            count_result = _exec(f"SELECT COUNT(*) FROM {name}")
            count_rows = _rows(count_result)
            count = count_rows[0][0] if count_rows else 0
        except Exception as e:
            print(f"!! {name}: {e}")
            continue
        summary.append({"name": name, "rows": count, "columns": cols})
        print(f"TABLE: {name} ({count} rows)")
        for c in cols:
            # PRAGMA: cid, name, type, notnull, dflt_value, pk
            cid, cname, ctype, notnull, default, pk = c
            null_str = "NOT NULL" if notnull else "NULL"
            default_str = f" DEFAULT {default}" if default is not None else ""
            pk_str = " PK" if pk else ""
            print(f"  - {cname}: {ctype} {null_str}{default_str}{pk_str}")
        print()

    out_path = os.path.join(os.path.dirname(__file__), "turso_schema_snapshot.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"\nSchema written to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
