#!/usr/bin/env python3
"""One-time migration of the old NewOasisUI SQLite state into PostgreSQL.

This preserves descriptions, short-lived list caches and model metadata from
NatCatPlatform-TPRe-with-Dashboard while making the new platform user the
owner of the imported records.  It is intentionally separate from startup so
the normal application never reads the old SQLite files.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

from psycopg2.extras import Json

from api.database import get_db_connection
from api.routes.oasis_ui import ensure_table


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite-dir", type=Path, required=True)
    parser.add_argument("--email", default="admin@natcat.local")
    args = parser.parse_args()

    metadata_db = args.sqlite_dir / "natcat-metadata.db"
    model_db = args.sqlite_dir / "model-meta.db"
    if not metadata_db.exists() or not model_db.exists():
        raise SystemExit(f"Expected natcat-metadata.db and model-meta.db under {args.sqlite_dir}")

    old_metadata = sqlite3.connect(metadata_db)
    old_metadata.row_factory = sqlite3.Row
    old_models = sqlite3.connect(model_db)
    old_models.row_factory = sqlite3.Row
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM auth.users WHERE lower(email)=lower(%s)", (args.email,))
            user = cursor.fetchone()
            if not user:
                raise SystemExit(f"Target user does not exist: {args.email}")
            user_id = user["id"]

            for row in old_metadata.execute("SELECT kind, oasis_id, description FROM oasis_descriptions"):
                cursor.execute(
                    """
                    INSERT INTO oasis_ui.descriptions (user_id, kind, oasis_id, description)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (user_id, kind, oasis_id) DO UPDATE
                    SET description=EXCLUDED.description, updated_at=NOW()
                    """,
                    (user_id, row["kind"], str(row["oasis_id"]), row["description"]),
                )

            for row in old_metadata.execute("SELECT kind, payload, synced_at FROM oasis_list_cache"):
                try:
                    payload = json.loads(row["payload"])
                except (TypeError, json.JSONDecodeError):
                    continue
                cursor.execute(
                    """
                    INSERT INTO oasis_ui.list_cache (user_id, kind, payload, synced_at)
                    VALUES (%s, %s, %s, %s::timestamptz)
                    ON CONFLICT (user_id, kind) DO UPDATE
                    SET payload=EXCLUDED.payload, synced_at=EXCLUDED.synced_at
                    """,
                    (user_id, row["kind"], Json(payload), row["synced_at"]),
                )

            for row in old_models.execute("SELECT * FROM oasis_model_metadata"):
                try:
                    model_payload = json.loads(row["model_payload"])
                except (TypeError, json.JSONDecodeError):
                    continue
                cursor.execute(
                    """
                    INSERT INTO oasis_ui.model_metadata
                      (oasis_model_id, model_payload, display_version, peril, region, description,
                       oasis_modified, metadata_updated_at, last_synced_at, needs_completion, needs_review)
                    VALUES (%s, %s, 'v0.0.1', %s, %s, %s, %s, NOW(), NOW(), %s, %s)
                    ON CONFLICT (oasis_model_id) DO UPDATE SET
                      peril=EXCLUDED.peril,
                      region=EXCLUDED.region,
                      description=EXCLUDED.description,
                      display_version='v0.0.1'
                    """,
                    (
                        str(row["oasis_model_id"]),
                        Json(model_payload),
                        row["peril"] or "",
                        row["region"] or "",
                        row["description"] or "",
                        row["oasis_modified"] or "",
                        bool(row["needs_completion"]),
                        bool(row["needs_review"]),
                    ),
                )

        conn.commit()
    finally:
        old_metadata.close()
        old_models.close()
        conn.close()

    print(f"Migrated old OasisUI state to PostgreSQL for {args.email} (user_id={user_id}).")


if __name__ == "__main__":
    main()
