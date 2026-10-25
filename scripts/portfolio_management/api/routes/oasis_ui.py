"""PostgreSQL persistence used by the native OasisUI pages.

The Oasis API remains the source of truth for Oasis resources.  This router
stores only the platform-owned descriptions, list cache and model metadata so
the Next.js UI can load quickly without bringing the old SQLite databases
along during the migration.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import Json, RealDictCursor
from pydantic import BaseModel, Field

from ..auth_utils import CurrentUser, get_current_user, require_admin
from ..database import get_db_connection

router = APIRouter()


class DescriptionPayload(BaseModel):
    id: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="", max_length=10000)


class CachePayload(BaseModel):
    data: Any
    syncedAt: str


class ModelMetadataPayload(BaseModel):
    peril: str = Field(default="", max_length=255)
    region: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=10000)


def ensure_table(conn) -> None:
    with conn.cursor() as cursor:
        cursor.execute("CREATE SCHEMA IF NOT EXISTS oasis_ui")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS oasis_ui.descriptions (
                user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                kind VARCHAR(20) NOT NULL CHECK (kind IN ('portfolio', 'analysis')),
                oasis_id VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (user_id, kind, oasis_id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS oasis_ui.list_cache (
                user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                kind VARCHAR(20) NOT NULL CHECK (kind IN ('portfolios', 'analyses')),
                payload JSONB NOT NULL,
                synced_at TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (user_id, kind)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS oasis_ui.model_metadata (
                oasis_model_id VARCHAR(255) PRIMARY KEY,
                model_payload JSONB NOT NULL,
                display_version VARCHAR(64) NOT NULL DEFAULT 'v0.0.1',
                peril VARCHAR(255) NOT NULL DEFAULT '',
                region VARCHAR(255) NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                oasis_modified TEXT NOT NULL DEFAULT '',
                metadata_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                needs_completion BOOLEAN NOT NULL DEFAULT TRUE,
                needs_review BOOLEAN NOT NULL DEFAULT FALSE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS oasis_ui.model_metadata_sync (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                synced_at TIMESTAMPTZ NOT NULL
            )
            """
        )
    conn.commit()


def _kind(kind: str, allowed: set[str]) -> str:
    if kind not in allowed:
        raise HTTPException(status_code=400, detail="Invalid Oasis UI data kind")
    return kind


def _with_table():
    conn = get_db_connection()
    ensure_table(conn)
    return conn


@router.get("/metadata/{kind}")
def list_descriptions(
    kind: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _kind(kind, {"portfolio", "analysis"})
    conn = _with_table()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT oasis_id, description FROM oasis_ui.descriptions WHERE user_id=%s AND kind=%s",
                (current_user.id, kind),
            )
            descriptions = {str(row["oasis_id"]): row["description"] for row in cursor.fetchall()}
        return {"kind": kind, "descriptions": descriptions}
    finally:
        conn.close()


@router.put("/metadata/{kind}")
def save_description(
    kind: str,
    payload: DescriptionPayload,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _kind(kind, {"portfolio", "analysis"})
    conn = _with_table()
    try:
        with conn.cursor() as cursor:
            if payload.description.strip():
                cursor.execute(
                    """
                    INSERT INTO oasis_ui.descriptions (user_id, kind, oasis_id, description)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (user_id, kind, oasis_id) DO UPDATE
                    SET description=EXCLUDED.description, updated_at=NOW()
                    """,
                    (current_user.id, kind, payload.id.strip(), payload.description.strip()),
                )
            else:
                cursor.execute(
                    "DELETE FROM oasis_ui.descriptions WHERE user_id=%s AND kind=%s AND oasis_id=%s",
                    (current_user.id, kind, payload.id.strip()),
                )
        conn.commit()
        return {"kind": kind, "id": payload.id.strip(), "description": payload.description.strip()}
    finally:
        conn.close()


@router.get("/cache/{kind}")
def get_cache(
    kind: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _kind(kind, {"portfolios", "analyses"})
    conn = _with_table()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT payload, synced_at FROM oasis_ui.list_cache WHERE user_id=%s AND kind=%s",
                (current_user.id, kind),
            )
            row = cursor.fetchone()
        if not row:
            return {"kind": kind, "data": None, "syncedAt": None}
        return {"kind": kind, "data": row["payload"], "syncedAt": row["synced_at"].isoformat()}
    finally:
        conn.close()


@router.put("/cache/{kind}")
def save_cache(
    kind: str,
    payload: CachePayload,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _kind(kind, {"portfolios", "analyses"})
    conn = _with_table()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO oasis_ui.list_cache (user_id, kind, payload, synced_at)
                VALUES (%s, %s, %s, %s::timestamptz)
                ON CONFLICT (user_id, kind) DO UPDATE
                SET payload=EXCLUDED.payload, synced_at=EXCLUDED.synced_at
                """,
                (current_user.id, kind, Json(payload.data), payload.syncedAt),
            )
        conn.commit()
        return {"kind": kind, "data": payload.data, "syncedAt": payload.syncedAt}
    finally:
        conn.close()


@router.delete("/cache/{kind}")
def delete_cache(
    kind: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _kind(kind, {"portfolios", "analyses"})
    conn = _with_table()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM oasis_ui.list_cache WHERE user_id=%s AND kind=%s",
                (current_user.id, kind),
            )
        conn.commit()
        return {"kind": kind, "deleted": True}
    finally:
        conn.close()


@router.get("/models")
def get_models(_: Annotated[CurrentUser, Depends(get_current_user)]):
    conn = _with_table()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM oasis_ui.model_metadata ORDER BY oasis_model_id")
            rows = cursor.fetchall()
            cursor.execute("SELECT synced_at FROM oasis_ui.model_metadata_sync WHERE id=1")
            state = cursor.fetchone()
        models = []
        for row in rows:
            model = dict(row["model_payload"])
            model["display_version"] = row["display_version"] or "v0.0.1"
            model["metadata"] = {
                "oasis_model_id": row["oasis_model_id"],
                "display_version": model["display_version"],
                "peril": row["peril"],
                "region": row["region"],
                "description": row["description"],
                "oasis_modified": row["oasis_modified"],
                "metadata_updated_at": row["metadata_updated_at"].isoformat(),
                "needs_completion": row["needs_completion"],
                "needs_review": row["needs_review"],
            }
            models.append(model)
        return {"models": models, "syncedAt": state["synced_at"].isoformat() if state else None}
    finally:
        conn.close()


@router.put("/models/sync")
def sync_models(
    payload: dict[str, Any],
    _: Annotated[CurrentUser, Depends(get_current_user)],
):
    models = payload.get("models")
    if not isinstance(models, list):
        raise HTTPException(status_code=400, detail="models must be a list")
    now = payload.get("syncedAt")
    if not isinstance(now, str) or not now:
        raise HTTPException(status_code=400, detail="syncedAt is required")
    conn = _with_table()
    try:
        with conn.cursor() as cursor:
            ids = [str(model.get("id")) for model in models if isinstance(model, dict) and model.get("id") is not None]
            if ids:
                cursor.execute("DELETE FROM oasis_ui.model_metadata WHERE NOT (oasis_model_id = ANY(%s))", (ids,))
            else:
                cursor.execute("DELETE FROM oasis_ui.model_metadata")
            for model in models:
                if not isinstance(model, dict) or model.get("id") is None:
                    continue
                model_id = str(model["id"])
                defaults = model.get("metadataDefaults") if isinstance(model.get("metadataDefaults"), dict) else {}
                cursor.execute("SELECT peril, region, description, oasis_modified, metadata_updated_at, needs_review FROM oasis_ui.model_metadata WHERE oasis_model_id=%s", (model_id,))
                existing = cursor.fetchone()
                peril = (existing["peril"] if existing else None) or str(defaults.get("peril", ""))
                region = (existing["region"] if existing else None) or str(defaults.get("region", ""))
                description = (existing["description"] if existing else None) or str(defaults.get("description", ""))
                modified = str(model.get("modified") or "")
                was_updated = bool(existing and existing["oasis_modified"] and modified and existing["oasis_modified"] != modified)
                needs_completion = not peril.strip() or not region.strip() or not description.strip()
                cursor.execute(
                    """
                    INSERT INTO oasis_ui.model_metadata
                      (oasis_model_id, model_payload, display_version, peril, region, description,
                       oasis_modified, metadata_updated_at, last_synced_at, needs_completion, needs_review)
                    VALUES (%s, %s, 'v0.0.1', %s, %s, %s, %s, NOW(), %s::timestamptz, %s, %s)
                    ON CONFLICT (oasis_model_id) DO UPDATE SET
                      model_payload=EXCLUDED.model_payload, display_version='v0.0.1',
                      peril=EXCLUDED.peril, region=EXCLUDED.region, description=EXCLUDED.description,
                      oasis_modified=EXCLUDED.oasis_modified, last_synced_at=EXCLUDED.last_synced_at,
                      needs_completion=EXCLUDED.needs_completion,
                      needs_review=(oasis_ui.model_metadata.needs_review OR EXCLUDED.needs_review)
                    """,
                    (model_id, Json({k: v for k, v in model.items() if k != "metadataDefaults"}), peril, region, description, modified, now, needs_completion, was_updated or bool(existing and existing["needs_review"])),
                )
            cursor.execute(
                "INSERT INTO oasis_ui.model_metadata_sync (id, synced_at) VALUES (1, %s::timestamptz) ON CONFLICT (id) DO UPDATE SET synced_at=EXCLUDED.synced_at",
                (now,),
            )
        conn.commit()
    finally:
        conn.close()
    return get_models(_)


@router.get("/models/{model_id}")
def get_model_metadata(model_id: str, _: Annotated[CurrentUser, Depends(get_current_user)]):
    conn = _with_table()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM oasis_ui.model_metadata WHERE oasis_model_id=%s", (model_id,))
            row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Model metadata not found")
        return {"metadata": {"oasis_model_id": row["oasis_model_id"], "display_version": row["display_version"], "peril": row["peril"], "region": row["region"], "description": row["description"], "oasis_modified": row["oasis_modified"], "metadata_updated_at": row["metadata_updated_at"].isoformat(), "needs_completion": row["needs_completion"], "needs_review": row["needs_review"]}}
    finally:
        conn.close()


@router.put("/models/{model_id}")
def update_model_metadata(
    model_id: str,
    payload: ModelMetadataPayload,
    _: Annotated[CurrentUser, Depends(require_admin)],
):
    conn = _with_table()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE oasis_ui.model_metadata
                SET peril=%s, region=%s, description=%s, metadata_updated_at=NOW(),
                    needs_completion=%s, needs_review=FALSE
                WHERE oasis_model_id=%s
                """,
                (payload.peril.strip(), payload.region.strip(), payload.description.strip(), not (payload.peril.strip() and payload.region.strip() and payload.description.strip()), model_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Model metadata not found")
        conn.commit()
    finally:
        conn.close()
    return get_model_metadata(model_id, _)
