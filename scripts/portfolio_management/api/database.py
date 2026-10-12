#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database connection module
"""

import os
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# 锁定 .env 路径为脚本相对位置,避免依赖启动时 CWD。
# override=False 保证外部环境变量优先于 .env(容器/生产场景可控)。
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}


def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def get_cursor():
    """Get database cursor (context manager)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
