#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Portfolio Management FastAPI Application
RESTful API服务
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from dotenv import load_dotenv

from .routes import policies, zones, events, stats
from .database import get_db_connection

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Portfolio Management API",
    description="API for TPHK portfolio management, zone accumulations, and risk analysis",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development
        "http://localhost:3001",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
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
app.include_router(policies.router, prefix="/api/policies", tags=["Policies"])
app.include_router(zones.router, prefix="/api/zones", tags=["Zone Accumulations"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
