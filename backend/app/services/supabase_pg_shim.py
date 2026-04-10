"""Supabase Postgres compat shim — drop-in replacement for libsql/sqlite3.

Gives the legacy Turso-era code a sqlite3-compatible cursor API backed by a
single Supabase ``exec_sql`` RPC. Routes and models that used to call
``get_analytics_db()``/``get_menu_db()`` etc. from ``app.services.turso`` keep
working unchanged — only their import target changes (via ``turso.py`` which
now re-exports the shim's ``get_pg_db``).

Design notes
------------
* **One RPC, many statements.** We call ``public.exec_sql(text)`` which runs
  any SQL statement and returns the result rows as ``json``. The RPC returns
  ``json`` (not ``jsonb``) on purpose — JSONB normalizes key order
  (alphabetical-by-length), which would break positional row access
  (``r[0]``, ``r[1]``, ...) used by legacy sqlite3/libsql callers. Each
  execute is its own auto-commit transaction. Atomic multi-row counters
  must use a dedicated RPC (see ``get_next_order_number`` in ``turso.py``).

* **Inline-literal params.** ``execute(sql, params)`` walks the SQL and
  replaces ``?`` placeholders with safely-escaped literals. This avoids the
  Postgres $1/$2 type-coercion problem when going through a single text RPC.

* **SQLite→Postgres dialect translation.** Regex-based rewrites handle the
  handful of SQLite-isms the codebase uses: ``json_extract``,
  ``datetime('now')``, ``date('now')``, ``date('now', '-N days')``,
  ``strftime``, ``INSERT OR IGNORE``, and ``venue_orders``→``thai_house_orders``.
  DDL statements (``CREATE TABLE``, ``CREATE INDEX``, ``ALTER TABLE``) are
  no-ops because every Wave-2 target table already exists in Supabase.

* **Leading-whitespace strip.** We ``lstrip()`` the final SQL before
  dispatching it — the PL/pgSQL RPC uses ``ltrim()`` which only strips
  spaces, so a leading ``\\n`` (from Python multi-line string literals)
  would misclassify the query and silently return an empty array.

* **Auto-RETURNING on INSERT.** The shim appends ``RETURNING *`` to any
  ``INSERT`` that doesn't already have a ``RETURNING`` clause, captures the
  first row's ``id`` into ``cursor.lastrowid``, and intercepts the legacy
  ``SELECT last_insert_rowid()`` query to return that cached id.

* **JSONB column re-serialization.** JSONB column *values* inside a row
  come back from supabase-py already parsed into Python dicts/lists. Legacy
  Turso-era callers expect string payloads they can ``json.loads()`` (e.g.
  ``toggles``, ``items``, ``payload``), so the shim re-serializes dict/list
  values to JSON strings before returning them.
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, datetime
from typing import Any, Iterable

from app.services.supabase_client import get_admin_client

logger = logging.getLogger(__name__)


# ── SQL dialect translation ──────────────────────────────────────

_DDL_PREFIXES = (
    "create table",
    "create index",
    "create unique index",
    "create view",
    "alter table",
    "drop table",
    "drop index",
    "pragma",
)


def _is_ddl(sql: str) -> bool:
    s = sql.lstrip().lower()
    return any(s.startswith(p) for p in _DDL_PREFIXES)


# Regex rules applied in order.
_TRANSLATIONS: list[tuple[re.Pattern, str]] = [
    # json_extract(col, '$.key')  →  (col->>'key')
    (re.compile(r"json_extract\(\s*(\w+)\s*,\s*'\$\.(\w+)'\s*\)"), r"(\1->>'\2')"),
    # datetime('now')  →  now()
    (re.compile(r"datetime\(\s*'now'\s*\)"), "now()"),
    # date('now', '-N days'|'-N day')  →  (CURRENT_DATE - interval 'N days')
    (
        re.compile(r"date\(\s*'now'\s*,\s*'\-(\d+)\s*days?'\s*\)"),
        r"(CURRENT_DATE - interval '\1 days')",
    ),
    # date('now')  →  CURRENT_DATE
    (re.compile(r"date\(\s*'now'\s*\)"), "CURRENT_DATE"),
    # date(col)  →  (col)::date   (bare column, not the two forms above)
    (re.compile(r"\bdate\(\s*(\w+)\s*\)"), r"(\1)::date"),
    # strftime('%Y-%m-%d', col)  →  to_char(col::timestamptz, 'YYYY-MM-DD')
    (
        re.compile(r"strftime\(\s*'%Y-%m-%d'\s*,\s*(\w+)\s*\)"),
        r"to_char(\1::timestamptz, 'YYYY-MM-DD')",
    ),
    # strftime('%Y-%m', col)
    (
        re.compile(r"strftime\(\s*'%Y-%m'\s*,\s*(\w+)\s*\)"),
        r"to_char(\1::timestamptz, 'YYYY-MM')",
    ),
    # strftime('%H', col)  →  EXTRACT(hour FROM col::timestamptz)::text
    # (codebase always wraps in CAST AS INTEGER, so int cast is fine)
    (
        re.compile(r"strftime\(\s*'%H'\s*,\s*(\w+)\s*\)"),
        r"EXTRACT(hour FROM \1::timestamptz)",
    ),
    # strftime('%w', col)  →  EXTRACT(dow FROM col::timestamptz)
    (
        re.compile(r"strftime\(\s*'%w'\s*,\s*(\w+)\s*\)"),
        r"EXTRACT(dow FROM \1::timestamptz)",
    ),
    # Boolean column literals: SQLite stores booleans as INTEGER 0/1, but
    # Wave 4 Supabase schema uses real BOOLEAN for is_active/is_featured/
    # is_priority/is_available/is_eighty_sixed. PG rejects ``col = 1`` on
    # a boolean column, so rewrite those literals in place.
    (
        re.compile(
            r"\b(is_active|is_featured|is_priority|is_available|is_eighty_sixed)\s*=\s*1\b"
        ),
        r"\1 = TRUE",
    ),
    (
        re.compile(
            r"\b(is_active|is_featured|is_priority|is_available|is_eighty_sixed)\s*=\s*0\b"
        ),
        r"\1 = FALSE",
    ),
    # SET is_active = 1 → SET is_active = TRUE (inside UPDATE/INSERT value lists)
    # Covered by the same rules above since they are general equality forms.
    # INSERT OR IGNORE INTO  →  INSERT INTO (plus ON CONFLICT DO NOTHING appended)
    (re.compile(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", re.IGNORECASE), "INSERT INTO"),
    # INSERT OR REPLACE INTO  →  INSERT INTO (seeding paths only, not hit at runtime)
    (re.compile(r"\bINSERT\s+OR\s+REPLACE\s+INTO\b", re.IGNORECASE), "INSERT INTO"),
    # Turso venue_orders table was renamed to thai_house_orders in Supabase
    (re.compile(r"\bvenue_orders\b"), "thai_house_orders"),
]


def _translate_sqlite_to_pg(sql: str) -> str:
    """Apply all SQLite→Postgres dialect translations."""
    out = sql
    had_or_ignore = bool(re.search(r"\bINSERT\s+OR\s+IGNORE\b", out, re.IGNORECASE))
    for pattern, repl in _TRANSLATIONS:
        out = pattern.sub(repl, out)
    if had_or_ignore and "on conflict" not in out.lower():
        out = out.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"
    return out


# ── Param inlining ───────────────────────────────────────────────


def _escape_literal(val: Any) -> str:
    """Convert a Python value to a Postgres-safe SQL literal."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return repr(val)
    if isinstance(val, (bytes, bytearray, memoryview)):
        raw = bytes(val).hex()
        return f"'\\x{raw}'::bytea"
    if isinstance(val, datetime):
        return "'" + val.isoformat().replace("'", "''") + "'::timestamptz"
    if isinstance(val, date):
        return "'" + val.isoformat() + "'::date"
    if isinstance(val, (dict, list)):
        s = json.dumps(val).replace("'", "''")
        return f"'{s}'::jsonb"
    # Fallback — string
    s = str(val).replace("'", "''")
    return f"'{s}'"


def _inline_params(sql: str, params: Iterable[Any]) -> str:
    """Replace ``?`` placeholders in ``sql`` with escaped literals, honoring
    single-quoted string literals and double-quoted identifiers so we don't
    mistake a ``?`` inside a string for a placeholder."""
    if not params:
        return sql
    params_iter = iter(params)
    out: list[str] = []
    i = 0
    n = len(sql)
    in_single = False
    in_double = False
    while i < n:
        ch = sql[i]
        if in_single:
            if ch == "'":
                # Escaped '' stays inside the literal
                if i + 1 < n and sql[i + 1] == "'":
                    out.append("''")
                    i += 2
                    continue
                in_single = False
            out.append(ch)
            i += 1
            continue
        if in_double:
            if ch == '"':
                if i + 1 < n and sql[i + 1] == '"':
                    out.append('""')
                    i += 2
                    continue
                in_double = False
            out.append(ch)
            i += 1
            continue
        if ch == "'":
            in_single = True
            out.append(ch)
            i += 1
            continue
        if ch == '"':
            in_double = True
            out.append(ch)
            i += 1
            continue
        if ch == "?":
            try:
                val = next(params_iter)
            except StopIteration as exc:
                raise ValueError(
                    f"Not enough params for SQL: {sql!r}"
                ) from exc
            out.append(_escape_literal(val))
            i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


# ── Cursor / Connection ──────────────────────────────────────────


class _DictRow(dict):
    """Dict that also supports integer index access (like ``sqlite3.Row``)."""

    __slots__ = ("_cols",)

    def __init__(self, cols: list[str], values: list[Any]):
        super().__init__(zip(cols, values))
        self._cols = cols

    def __getitem__(self, key):
        if isinstance(key, int):
            return super().__getitem__(self._cols[key])
        return super().__getitem__(key)

    def keys(self):  # type: ignore[override]
        return list(self._cols)

    def __iter__(self):
        return iter(super().values())

    def __len__(self):
        return len(self._cols)


class _Cursor:
    """Per-execute cursor that buffers the RPC result rows."""

    def __init__(
        self,
        rows: list[_DictRow],
        lastrowid: int | None,
        rowcount: int,
    ):
        self._rows = rows
        self._idx = 0
        self.lastrowid = lastrowid or 0
        self.rowcount = rowcount
        if rows:
            self.description = [(c, None, None, None, None, None, None) for c in rows[0]._cols]
        else:
            self.description = None

    def fetchone(self) -> _DictRow | None:
        if self._idx >= len(self._rows):
            return None
        row = self._rows[self._idx]
        self._idx += 1
        return row

    def fetchall(self) -> list[_DictRow]:
        remaining = self._rows[self._idx :]
        self._idx = len(self._rows)
        return remaining

    def __iter__(self):
        return iter(self._rows[self._idx :])

    def close(self):
        self._rows = []


class SupabasePGShim:
    """sqlite3/libsql-compatible connection backed by the Supabase exec_sql RPC."""

    def __init__(self):
        self._client = get_admin_client()
        self._last_insert_id: int = 0

    # ---- lifecycle ------------------------------------------------
    def close(self):
        # Nothing to close — supabase-py manages its own session.
        pass

    def commit(self):
        # Every exec_sql call is auto-committed. No-op.
        pass

    def rollback(self):
        # Cannot roll back across auto-commits. No-op — used only in
        # defensive except-branches in legacy code.
        pass

    def cursor(self):
        # Legacy callers sometimes go ``db.cursor().execute(...)``. Our
        # ``execute`` already returns a cursor, so we expose *self* here and
        # forward ``.execute`` to make that pattern still work.
        return self

    # ---- core execute ---------------------------------------------
    def execute(self, sql: str, params: Iterable[Any] | None = None) -> _Cursor:
        # Legacy Turso init/DDL is a no-op — tables already exist in Supabase.
        if _is_ddl(sql):
            return _Cursor([], None, 0)

        # ``SELECT last_insert_rowid()`` — short-circuit to cached id.
        if re.match(r"\s*select\s+last_insert_rowid\s*\(\s*\)", sql, re.IGNORECASE):
            cols = ["last_insert_rowid()"]
            rows = [_DictRow(cols, [self._last_insert_id])]
            return _Cursor(rows, self._last_insert_id, 0)

        translated = _translate_sqlite_to_pg(sql)
        final_sql = _inline_params(translated, list(params or ()))

        # Strip leading whitespace (newlines/tabs). The exec_sql RPC uses
        # PL/pgSQL's ltrim() which only strips spaces — a leading \n makes
        # it misclassify the query and silently return an empty array.
        final_sql = final_sql.lstrip()

        # Auto-append RETURNING * on INSERT so we can capture lastrowid.
        lower = final_sql.lower()
        is_insert = lower.startswith("insert ")
        if is_insert and " returning " not in lower:
            final_sql = final_sql.rstrip().rstrip(";") + " RETURNING *"

        try:
            resp = self._client.rpc("exec_sql", {"query": final_sql}).execute()
        except Exception as exc:
            logger.error("Supabase exec_sql failed: %s\nSQL: %s", exc, final_sql)
            raise

        data = resp.data if hasattr(resp, "data") else resp
        if data is None:
            data = []
        if not isinstance(data, list):
            # ``exec_sql`` returns a json array; supabase-py surfaces it as
            # the list itself. Fall back if wrapped.
            data = [data]

        # data is a list of dicts (each row). Build _DictRow objects preserving
        # column order from the first row. ``exec_sql`` returns ``json`` (not
        # ``jsonb``) so SELECT column order is preserved in each row — this
        # is required for positional access (``r[0]``, ``r[1]``, ...) used by
        # legacy sqlite3/libsql callers. JSONB column values inside a row
        # come back already parsed into Python dicts/lists — re-serialize
        # them to JSON strings so legacy code that calls ``json.loads`` on
        # e.g. ``toggles`` / ``items`` / ``payload`` keeps working unchanged.
        rows: list[_DictRow] = []
        if data and isinstance(data[0], dict):
            cols = list(data[0].keys())
            for r in data:
                values = []
                for c in cols:
                    v = r.get(c)
                    if isinstance(v, (dict, list)):
                        v = json.dumps(v)
                    values.append(v)
                rows.append(_DictRow(cols, values))

        # Update lastrowid from first returned row's id (if present).
        if is_insert and rows and "id" in rows[0]:
            try:
                self._last_insert_id = int(rows[0]["id"])
            except (TypeError, ValueError):
                pass

        return _Cursor(rows, self._last_insert_id, len(rows))


# ── Singleton ────────────────────────────────────────────────────

_SHIM: SupabasePGShim | None = None


def get_pg_db() -> SupabasePGShim:
    """Return the singleton Supabase-backed compat connection.

    Drop-in replacement for the old ``get_analytics_db()`` / ``get_menu_db()``
    / ``get_drink_club_db()`` / ``get_swp_rental_db()`` helpers.
    """
    global _SHIM
    if _SHIM is None:
        _SHIM = SupabasePGShim()
        logger.info("Supabase PG shim initialized (project=%s)", os.getenv("SUPABASE_URL", "")[:48])
    return _SHIM


def get_next_order_number_rpc(venue_id: str = "meetup") -> int:
    """Atomic per-venue order counter increment via dedicated RPC."""
    client = get_admin_client()
    resp = client.rpc("increment_order_number", {"p_venue_id": venue_id}).execute()
    data = resp.data if hasattr(resp, "data") else resp
    if isinstance(data, list) and data:
        return int(data[0])
    if isinstance(data, int):
        return data
    if isinstance(data, dict) and "increment_order_number" in data:
        return int(data["increment_order_number"])
    raise RuntimeError(f"Unexpected increment_order_number response: {data!r}")
