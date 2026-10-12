#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reports API Routes
Risk Map 报告生成 API(后端 PDF + OSS 存储)。

链路:前端 riskmap/page.tsx -> Next.js route(/api/risk-map/reports/*) -> 本服务 -> OSS。

行为:
  - POST /api/reports/{point|area|portfolio} 立刻创建 pending 记录,FastAPI BackgroundTasks
    后台异步生成 PDF + 上传 OSS + 更新状态。前端拿到 report_id 后轮询详情。
  - GET /api/reports 列出当前用户所有报告(按 user_id 隔离)。
  - GET /api/reports/{id} 详情。
  - POST /api/reports/{id}/download 重新签 OSS URL(默认 24h,过期自动续)。
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from psycopg2.extras import Json, RealDictCursor
from pydantic import BaseModel, Field

from ..auth_utils import CurrentUser, get_current_user
from ..database import get_db_connection
# 绝对导入 — 与生产 uvicorn scripts.portfolio_management.api.main:app 一致
from pdf_service.area_report import render_area_pdf
from pdf_service.oss_uploader import (
    build_object_key,
    generate_signed_url,
    is_configured,
    upload_pdf,
)
from pdf_service.point_report import render_point_pdf
from pdf_service.portfolio_report import render_portfolio_pdf

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_REPORT_TYPES = {"point", "area", "portfolio"}


# ==================== Schemas ====================
class PointReportRequest(BaseModel):
    asset: Dict[str, Any]
    flood: Dict[str, Any]
    label: str = "Single point flood risk assessment"
    # 可选:用户在地图上画的 terrain profile。BFF 透传,后端在 PDF 加一个
    # 「Terrain Profile」小节(若为空则跳过, 保持向后兼容)。
    profile: Dict[str, Any] | None = None


class AreaReportRequest(BaseModel):
    result: Dict[str, Any]
    label: str = "Area flood risk assessment"
    # 同上 — area 模式也可能包含 profile。
    profile: Dict[str, Any] | None = None


class PortfolioReportRequest(BaseModel):
    locations: List[Dict[str, Any]] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(default_factory=dict)
    label: str = "Portfolio flood risk assessment"


# ==================== Schema bootstrap ====================
def ensure_table(conn) -> None:
    """Create the reports schema/table/index if not present (idempotent)."""
    with conn.cursor() as cursor:
        cursor.execute("CREATE SCHEMA IF NOT EXISTS risk_map")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS risk_map.generated_reports (
                id BIGSERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL
                    REFERENCES auth.users(id) ON DELETE CASCADE,
                report_type VARCHAR(20) NOT NULL
                    CHECK (report_type IN ('point', 'area', 'portfolio')),
                label TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
                oss_object_key VARCHAR(512),
                file_size_bytes BIGINT,
                error_message TEXT,
                input_params JSONB NOT NULL,
                summary JSONB,
                requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                started_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                download_count INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_generated_reports_user_status "
            "ON risk_map.generated_reports (user_id, status, requested_at DESC)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_generated_reports_object_key "
            "ON risk_map.generated_reports (oss_object_key)"
        )
    conn.commit()


def _check_oss_or_503() -> None:
    """OSS 未配置 → 503(让前端降级 jsPDF fallback)。"""
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="OSS not configured. Frontend will fall back to client-side PDF.",
        )


def _insert_pending_report(
    cursor, user_id: int, email: str, report_type: str, label: str, params: Dict[str, Any]
) -> int:
    cursor.execute(
        """
        INSERT INTO risk_map.generated_reports
            (user_id, report_type, label, status, input_params)
        VALUES (%s, %s, %s, 'pending', %s)
        RETURNING id
        """,
        (user_id, report_type, label, Json(params)),
    )
    return cursor.fetchone()[0]


# ==================== 后台任务 ====================
def _generate_point_task(report_id: int, params: Dict[str, Any]) -> None:
    """后台生成单点 PDF 并上传 OSS。"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports "
                "SET status='generating', started_at=NOW() WHERE id=%s",
                (report_id,),
            )
        conn.commit()

        pdf_bytes = render_point_pdf(
            params["asset"],
            params["flood"],
            params.get("profile"),
        )
        object_key = _select_object_key(conn, report_id)
        if not object_key:
            object_key = build_object_key(_select_user_id(conn, report_id), "point", report_id)
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE risk_map.generated_reports SET oss_object_key=%s WHERE id=%s",
                    (object_key, report_id),
                )
            conn.commit()
        upload_pdf(object_key, pdf_bytes)

        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports "
                "SET status='ready', file_size_bytes=%s, completed_at=NOW() WHERE id=%s",
                (len(pdf_bytes), report_id),
            )
        conn.commit()
        logger.info(f"point report #{report_id} ready ({len(pdf_bytes)} bytes)")
    except Exception as e:
        logger.exception(f"point report #{report_id} failed: {e}")
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE risk_map.generated_reports SET status='failed', "
                    "error_message=%s, completed_at=NOW() WHERE id=%s",
                    (str(e)[:500], report_id),
                )
            conn.commit()
        except Exception:
            conn.rollback()
    finally:
        conn.close()


def _generate_area_task(report_id: int, params: Dict[str, Any]) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports SET status='generating', started_at=NOW() WHERE id=%s",
                (report_id,),
            )
        conn.commit()
        pdf_bytes = render_area_pdf(params["result"])
        object_key = _select_object_key(conn, report_id)
        if not object_key:
            object_key = build_object_key(_select_user_id(conn, report_id), "area", report_id)
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE risk_map.generated_reports SET oss_object_key=%s WHERE id=%s",
                    (object_key, report_id),
                )
            conn.commit()
        upload_pdf(object_key, pdf_bytes)
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports SET status='ready', file_size_bytes=%s, "
                "completed_at=NOW() WHERE id=%s",
                (len(pdf_bytes), report_id),
            )
        conn.commit()
        logger.info(f"area report #{report_id} ready ({len(pdf_bytes)} bytes)")
    except Exception as e:
        logger.exception(f"area report #{report_id} failed: {e}")
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE risk_map.generated_reports SET status='failed', "
                    "error_message=%s, completed_at=NOW() WHERE id=%s",
                    (str(e)[:500], report_id),
                )
            conn.commit()
        except Exception:
            conn.rollback()
    finally:
        conn.close()


def _generate_portfolio_task(report_id: int, params: Dict[str, Any]) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports SET status='generating', started_at=NOW() WHERE id=%s",
                (report_id,),
            )
        conn.commit()
        pdf_bytes = render_portfolio_pdf(params["locations"], params.get("meta", {}))
        object_key = _select_object_key(conn, report_id)
        if not object_key:
            object_key = build_object_key(_select_user_id(conn, report_id), "portfolio", report_id)
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE risk_map.generated_reports SET oss_object_key=%s WHERE id=%s",
                    (object_key, report_id),
                )
            conn.commit()
        upload_pdf(object_key, pdf_bytes)
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports SET status='ready', file_size_bytes=%s, "
                "completed_at=NOW() WHERE id=%s",
                (len(pdf_bytes), report_id),
            )
        conn.commit()
        logger.info(f"portfolio report #{report_id} ready ({len(pdf_bytes)} bytes)")
    except Exception as e:
        logger.exception(f"portfolio report #{report_id} failed: {e}")
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE risk_map.generated_reports SET status='failed', "
                    "error_message=%s, completed_at=NOW() WHERE id=%s",
                    (str(e)[:500], report_id),
                )
            conn.commit()
        except Exception:
            conn.rollback()
    finally:
        conn.close()


def _select_object_key(conn, report_id: int) -> str | None:
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT oss_object_key FROM risk_map.generated_reports WHERE id=%s",
            (report_id,),
        )
        row = cursor.fetchone()
        return row[0] if row else None


def _select_user_id(conn, report_id: int) -> int:
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT user_id FROM risk_map.generated_reports WHERE id=%s",
            (report_id,),
        )
        row = cursor.fetchone()
        return row[0] if row else 0


# ==================== Endpoints ====================
@router.post("/point", status_code=202)
def create_point_report(
    payload: PointReportRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _check_oss_or_503()
    conn = get_db_connection()
    try:
        ensure_table(conn)
        # 把 profile 一起持久化 — 后台任务用它渲染额外章节。
        params = {"asset": payload.asset, "flood": payload.flood}
        if payload.profile:
            params["profile"] = payload.profile
        with conn.cursor() as cursor:
            report_id = _insert_pending_report(
                cursor,
                current_user.id,
                current_user.email,
                "point",
                payload.label,
                params,
            )
        conn.commit()
        background_tasks.add_task(_generate_point_task, report_id, params)
        return {"report_id": report_id, "status": "pending", "report_type": "point"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/area", status_code=202)
def create_area_report(
    payload: AreaReportRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _check_oss_or_503()
    conn = get_db_connection()
    try:
        ensure_table(conn)
        # profile 可选 — 与 point 模式对称。
        params: Dict[str, Any] = {"result": payload.result}
        if payload.profile:
            params["profile"] = payload.profile
        with conn.cursor() as cursor:
            report_id = _insert_pending_report(
                cursor, current_user.id, current_user.email, "area", payload.label, params
            )
        conn.commit()
        background_tasks.add_task(_generate_area_task, report_id, params)
        return {"report_id": report_id, "status": "pending", "report_type": "area"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/portfolio", status_code=202)
def create_portfolio_report(
    payload: PortfolioReportRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _check_oss_or_503()
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor() as cursor:
            report_id = _insert_pending_report(
                cursor,
                current_user.id,
                current_user.email,
                "portfolio",
                payload.label,
                {"locations": payload.locations, "meta": payload.meta},
            )
        conn.commit()
        background_tasks.add_task(
            _generate_portfolio_task,
            report_id,
            {"locations": payload.locations, "meta": payload.meta},
        )
        return {"report_id": report_id, "status": "pending", "report_type": "portfolio"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("")
def list_reports(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """列出当前用户的所有报告(按 requested_at 倒序)。"""
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, report_type, label, status, oss_object_key,
                       file_size_bytes, error_message, summary,
                       requested_at, started_at, completed_at, download_count
                FROM risk_map.generated_reports
                WHERE user_id = %s
                ORDER BY requested_at DESC
                LIMIT %s OFFSET %s
                """,
                (current_user.id, limit, offset),
            )
            records = [dict(row) for row in cursor.fetchall()]
            cursor.execute(
                "SELECT COUNT(*) AS total FROM risk_map.generated_reports WHERE user_id=%s",
                (current_user.id,),
            )
            total = cursor.fetchone()["total"]
        # JSONB 字段 → 原生 dict
        for r in records:
            if r.get("summary") is not None and not isinstance(r["summary"], dict):
                r["summary"] = json.loads(r["summary"]) if isinstance(r["summary"], str) else r["summary"]
        return {"reports": records, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{report_id}")
def get_report(
    report_id: int,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """报告详情(含 status / 进度 / 错误信息)。"""
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, report_type, label, status, oss_object_key,
                       file_size_bytes, error_message, input_params, summary,
                       requested_at, started_at, completed_at, download_count
                FROM risk_map.generated_reports
                WHERE user_id = %s AND id = %s
                """,
                (current_user.id, report_id),
            )
            record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Report not found")
        record = dict(record)
        if record.get("input_params") is not None and not isinstance(record["input_params"], dict):
            record["input_params"] = json.loads(record["input_params"]) if isinstance(record["input_params"], str) else record["input_params"]
        if record.get("summary") is not None and not isinstance(record["summary"], dict):
            record["summary"] = json.loads(record["summary"]) if isinstance(record["summary"], str) else record["summary"]
        return record
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/{report_id}/download")
def download_report(
    report_id: int,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """
    重新签 OSS 临时 URL 并返回。
    必须确认是当前用户的报告(防越权)。
    """
    _check_oss_or_503()
    conn = get_db_connection()
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT id, report_type, label, status, oss_object_key "
                "FROM risk_map.generated_reports WHERE user_id=%s AND id=%s",
                (current_user.id, report_id),
            )
            record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Report not found")
        if record["status"] != "ready":
            raise HTTPException(
                status_code=409,
                detail=f"Report not ready (status: {record['status']})",
            )
        if not record["oss_object_key"]:
            raise HTTPException(status_code=500, detail="Report missing OSS object key")

        filename = f"{record['report_type']}_report_{record['id']}.pdf"
        url, expires_at = generate_signed_url(record["oss_object_key"], filename)

        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE risk_map.generated_reports SET download_count = download_count + 1 "
                "WHERE id=%s",
                (report_id,),
            )
        conn.commit()

        return {
            "report_id": report_id,
            "download_url": url,
            "expires_at": expires_at.isoformat(),
            "filename": filename,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()