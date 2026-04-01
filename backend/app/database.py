"""
CareSync — Turso database layer (HTTP API via httpx)

Uses Turso's /v2/pipeline HTTP API directly — no compiled extensions,
no Python version constraints. httpx is already a project dependency.

If TURSO_DATABASE_URL is not set, all operations are silently no-ops
(useful for local dev where you don't need persistence).
"""

import json
import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_DDL_STATEMENTS = [
    """CREATE TABLE IF NOT EXISTS hl7_messages (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_message  TEXT    NOT NULL,
        message_type TEXT    NOT NULL,
        parsed_json  TEXT    NOT NULL,
        fhir_bundle  TEXT,
        ai_explanation TEXT,
        created_at   TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )""",
    """CREATE TABLE IF NOT EXISTS care_gaps (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id     TEXT NOT NULL,
        gap_type       TEXT NOT NULL,
        description    TEXT NOT NULL,
        severity       TEXT DEFAULT 'medium',
        condition_code TEXT,
        last_checked   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        resolved       INTEGER DEFAULT 0
    )""",
    "CREATE INDEX IF NOT EXISTS idx_care_gaps_patient ON care_gaps(patient_id)",
    """CREATE TABLE IF NOT EXISTS ai_query_log (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        natural_query TEXT NOT NULL,
        fhir_query    TEXT NOT NULL,
        result_count  INTEGER,
        created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )""",
]


# ── Turso HTTP client ──────────────────────────────────────────────────────────

def _turso_http_url() -> str | None:
    url = settings.TURSO_DATABASE_URL
    if not url:
        return None
    return url.replace("libsql://", "https://") + "/v2/pipeline"


def _arg(value: Any) -> dict:
    if value is None:
        return {"type": "null"}
    if isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    return {"type": "text", "value": str(value)}


async def _pipeline(statements: list[dict]) -> list[dict]:
    """POST a batch of statements to Turso's pipeline endpoint."""
    url = _turso_http_url()
    if not url:
        return []

    requests = [{"type": "execute", "stmt": s} for s in statements]
    requests.append({"type": "close"})

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.TURSO_AUTH_TOKEN}",
                "Content-Type": "application/json",
            },
            json={"requests": requests},
        )
        res.raise_for_status()
        return res.json().get("results", [])


async def _execute(sql: str, args: list[Any] | None = None) -> list[dict] | None:
    """Execute a single statement and return rows."""
    stmt: dict = {"sql": sql}
    if args:
        stmt["args"] = [_arg(v) for v in args]
    results = await _pipeline([stmt])
    if not results:
        return None
    first = results[0]
    if first.get("type") != "ok":
        raise RuntimeError(f"Turso error: {first}")
    result = first["response"]["result"]
    cols = [c["name"] for c in result.get("cols", [])]
    rows = []
    for raw_row in result.get("rows", []):
        rows.append({cols[i]: cell.get("value") for i, cell in enumerate(raw_row)})
    return rows


# ── Public API ─────────────────────────────────────────────────────────────────

async def init_db() -> None:
    if not _turso_http_url():
        logger.warning("TURSO_DATABASE_URL not set — DB persistence disabled.")
        return
    try:
        await _pipeline([{"sql": s} for s in _DDL_STATEMENTS])
        logger.info("Turso tables ready.")
    except Exception as exc:
        logger.warning("DB init skipped: %s", exc)


async def log_hl7_message(
    raw: str,
    message_type: str,
    parsed: dict,
    fhir_bundle: dict | None = None,
    ai_explanation: str | None = None,
) -> None:
    try:
        await _execute(
            "INSERT INTO hl7_messages (raw_message, message_type, parsed_json, fhir_bundle, ai_explanation) "
            "VALUES (?, ?, ?, ?, ?)",
            [raw, message_type, json.dumps(parsed),
             json.dumps(fhir_bundle) if fhir_bundle else None, ai_explanation],
        )
    except Exception as exc:
        logger.debug("hl7 log skipped: %s", exc)


async def log_ai_query(natural_query: str, fhir_query: str, result_count: int = 0) -> None:
    try:
        await _execute(
            "INSERT INTO ai_query_log (natural_query, fhir_query, result_count) VALUES (?, ?, ?)",
            [natural_query, fhir_query, result_count],
        )
    except Exception as exc:
        logger.debug("ai query log skipped: %s", exc)


async def get_hl7_history(limit: int = 20) -> list[dict]:
    try:
        rows = await _execute(
            "SELECT id, message_type, parsed_json, created_at "
            "FROM hl7_messages ORDER BY id DESC LIMIT ?",
            [limit],
        )
        return [
            {"id": r["id"], "message_type": r["message_type"],
             "parsed": json.loads(r["parsed_json"]), "created_at": r["created_at"]}
            for r in (rows or [])
        ]
    except Exception as exc:
        logger.debug("hl7 history skipped: %s", exc)
        return []
