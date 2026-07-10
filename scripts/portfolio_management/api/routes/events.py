#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Events API Routes
巨灾事件API
"""

from fastapi import APIRouter, HTTPException
from ..database import get_db_connection

router = APIRouter()


@router.get("/")
def get_events():
    """Get all catastrophic events"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                event_code,
                event_name,
                event_type,
                event_start_date,
                affected_regions,
                total_exposure,
                affected_policies_count
            FROM portfolio.events
            ORDER BY total_exposure DESC
        """)

        events = cursor.fetchall()

        return {
            "data": [dict(row) for row in events],
            "total": len(events)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/{event_code}")
def get_event(event_code: str):
    """Get a specific event by code"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM portfolio.events
            WHERE event_code = %s
        """, (event_code,))

        event = cursor.fetchone()

        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        return dict(event)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/{event_code}/policies")
def get_event_policies(event_code: str):
    """Get all policies affected by a specific event"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                policy_id, address, region,
                sum_insured, occupancy,
                latitude, longitude
            FROM portfolio.policies
            WHERE event_code = %s
            ORDER BY sum_insured DESC
        """, (event_code,))

        policies = cursor.fetchall()

        return {
            "data": [dict(row) for row in policies],
            "total": len(policies)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()
