#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zone Accumulations API Routes
分区累积统计API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..database import get_db_connection

router = APIRouter()


@router.get("/")
def get_zones(
    order_by: str = Query("total_sum_insured", regex="^(total_sum_insured|policy_count|region)$")
):
    """
    Get all zone accumulations

    Parameters:
    - order_by: Sort field (total_sum_insured, policy_count, region)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = f"""
            SELECT
                region,
                total_sum_insured,
                total_sum_insured_gross,
                policy_count,
                avg_sum_insured,
                occupancy_breakdown,
                coverage_breakdown,
                construction_breakdown,
                max_single_risk,
                concentration_ratio,
                earliest_policy_start,
                latest_policy_end
            FROM portfolio.zone_accumulations
            ORDER BY {order_by} DESC
        """

        cursor.execute(query)
        zones = cursor.fetchall()

        result = [dict(row) for row in zones]

        return {
            "data": result,
            "total": len(result)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/{region}")
def get_zone(region: str):
    """Get zone accumulation for a specific region"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM portfolio.zone_accumulations
            WHERE region = %s
        """, (region,))

        zone = cursor.fetchone()

        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")

        return dict(zone)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/{region}/policies")
def get_zone_policies(
    region: str,
    limit: int = Query(1000, le=10000),
    offset: int = 0
):
    """Get all policies in a specific zone"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get policies
        cursor.execute("""
            SELECT
                policy_id, address, sum_insured,
                occupancy, construction_class,
                coverage_name, event_name,
                latitude, longitude
            FROM portfolio.policies
            WHERE region = %s
            ORDER BY sum_insured DESC
            LIMIT %s OFFSET %s
        """, (region, limit, offset))

        policies = cursor.fetchall()

        # Get total count
        cursor.execute("""
            SELECT COUNT(*)
            FROM portfolio.policies
            WHERE region = %s
        """, (region,))

        total_count = cursor.fetchone()['count']

        return {
            "data": [dict(row) for row in policies],
            "total": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/limits/monitoring")
def get_limit_monitoring():
    """Get zone limit monitoring view"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM portfolio.v_limit_monitoring
            ORDER BY utilization DESC
        """)

        limits = cursor.fetchall()

        return {
            "data": [dict(row) for row in limits]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()
