#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Query History API Routes
Risk Map 查询历史 API(FastAPI 常驻服务)

2026-08-20 改造:
  隔离维度从「浏览器 UUID (clientId)」改为「登录用户 (user_id)」。
  鉴权走 httpOnly JWT cookie,Depends(get_current_user) 直接解析。

链路:前端 queryHistory.ts -> Next.js route -> 本服务 /api/query-history -> PostgreSQL。
表逻辑与 scripts/portfolio_management/query_history_store.py 保持一致。
"""

from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import Json, RealDictCursor
from pydantic import BaseModel, Field

from ..auth_utils import CurrentUser, get_current_user
from ..database import get_db_connection

router = APIRouter()

VALID_QUERY_TYPES = {"point", "area", "portfolio"}


class QueryHistoryCreate(BaseModel):
    """前端 POST 时的 payload。不再含 clientId —— 后端从登录态注入。"""

    queryType: str
    label: str
    region: str | None = None
    geometry: Dict[str, Any]
    summary: Dict[str, Any] = Field(default_factory=dict)
    result: Any
    # username / clientId 字段如前端还传,会被忽略(只信任登录态)


def ensure_table(conn) -> None:
    """Create the query history schema/table/index if not present (idempotent)."""
    with conn.cursor() as cursor:
        cursor.execute("CREATE SCHEMA IF NOT EXISTS risk_map")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS risk_map.query_history (
                id BIGSERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL
                    REFERENCES auth.users(id) ON DELETE CASCADE,
                client_id VARCHAR(64),
                username VARCHAR(120),
                query_type VARCHAR(20) NOT NULL
                    CHECK (query_type IN ('point', 'area', 'portfolio')),
                label TEXT NOT NULL,
                region VARCHAR(32),
                geometry JSONB NOT NULL,
                summary JSONB NOT NULL DEFAULT '{}'::jsonb,
                result JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_query_history_user_created '
            'ON risk_map.query_history (user_id, created_at DESC)'
        )
    conn.commit()


@router.post("", status_code=201)
def create_record(
    payload: QueryHistoryCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Create a new query history record owned by current_user."""
    if payload.queryType not in VALID_QUERY_TYPES:
        raise HTTPException(
            status_code=400,
            detail="queryType must be one of: point, area, portfolio",
        )
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                '''
                INSERT INTO risk_map.query_history
                    (user_id, username, query_type, label, region, geometry, summary, result)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
                ''',
                (
                    current_user.id,
                    current_user.email,
                    payload.queryType,
                    payload.label,
                    payload.region,
                    Json(payload.geometry),
                    Json(payload.summary),
                    Json(payload.result),
                ),
            )
            record = dict(cursor.fetchone())
        conn.commit()
        return record
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("")
def list_records(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List query history records for the current user (newest first)."""
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                '''
                SELECT id, username, query_type, label, region, geometry, summary, created_at
                FROM risk_map.query_history
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                ''',
                (current_user.id, limit, offset),
            )
            records = [dict(row) for row in cursor.fetchall()]
            cursor.execute(
                'SELECT COUNT(*) AS total FROM risk_map.query_history WHERE user_id = %s',
                (current_user.id,),
            )
            total = cursor.fetchone()['total']
        return {"records": records, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{record_id}")
def get_record(
    record_id: int,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Get a single query history record owned by current_user. 404 if not theirs."""
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                '''
                SELECT id, username, query_type, label, region, geometry, summary, result, created_at
                FROM risk_map.query_history
                WHERE user_id = %s AND id = %s
                ''',
                (current_user.id, record_id),
            )
            record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Query history record not found")
        return dict(record)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{record_id}")
def delete_record(
    record_id: int,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Delete a single query history record owned by current_user. 404 if not theirs."""
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor() as cursor:
            cursor.execute(
                'DELETE FROM risk_map.query_history WHERE user_id = %s AND id = %s',
                (current_user.id, record_id),
            )
            deleted = cursor.rowcount > 0
        conn.commit()
        if not deleted:
            raise HTTPException(status_code=404, detail="Query history record not found")
        return {"deleted": deleted}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()