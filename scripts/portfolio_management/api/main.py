#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Portfolio Management FastAPI Application
RESTful API服务
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os

from .routes import policies, zones, events, stats, query_history, auth, reports
from .auth_utils import ensure_auth_schema
from .database import get_db_connection

# 锁定 .env 路径为脚本相对位置,避免依赖启动时 CWD。
# override=False 保证外部环境变量优先于 .env(容器/生产场景可控)。
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Bootstrap auth + query-history schemas at startup (best-effort)."""
    try:
        conn = get_db_connection()
        ensure_auth_schema(conn)
        conn.close()
    except Exception as e:
        print(f"[Auth] Could not ensure auth schema at startup: {e}")
    try:
        conn = get_db_connection()
        query_history.ensure_table(conn)
        conn.close()
    except Exception as e:
        print(f"[Query History] Could not ensure table at startup: {e}")
    try:
        conn = get_db_connection()
        reports.ensure_table(conn)
        conn.close()
    except Exception as e:
        print(f"[Reports] Could not ensure table at startup: {e}")
    yield


# Create FastAPI app
app = FastAPI(
    title="Portfolio Management API",
    description="API for TPHK portfolio management, zone accumulations, and risk analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
# 通过 ALLOWED_ORIGINS(逗号分隔)配置允许的 origin;未配置时本地开发可用 ALLOWED_ORIGINS=*。
# 生产环境必须显式列出域名,避免跨域访问失控。
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    ["*"] if allowed_origins_env.strip() == "*"
    else [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/")
def read_root():
    """API health check"""
    return {
        "status": "ok",
        "message": "Portfolio Management API is running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    """Database health check"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(policies.router, prefix="/api/policies", tags=["Policies"])
app.include_router(zones.router, prefix="/api/zones", tags=["Zone Accumulations"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])
app.include_router(query_history.router, prefix="/api/query-history", tags=["Query History"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


if __name__ == "__main__":
    import os
    import uvicorn
    uvicorn.run(
        "scripts.portfolio_management.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("FASTAPI_PORT", "8765")),
        reload=True
    )
