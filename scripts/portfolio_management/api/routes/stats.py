#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Statistics API Routes
统计分析API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..database import get_db_connection

router = APIRouter()


@router.get("/summary")
def get_summary_stats():
    """Get overall portfolio summary statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Overall statistics
        cursor.execute("""
            SELECT
                COUNT(*) as total_policies,
                SUM(sum_insured) as total_tsi,
                SUM(total_sum_insured_gross) as total_gross,
                AVG(sum_insured) as avg_tsi,
                MAX(sum_insured) as max_tsi,
                MIN(sum_insured) as min_tsi,
                COUNT(DISTINCT region) as total_regions,
                COUNT(DISTINCT occupancy) as total_occupancy_types
            FROM portfolio.policies
        """)
        overall = dict(cursor.fetchone())

        # By region
        cursor.execute("""
            SELECT
                region,
                COUNT(*) as count,
                SUM(sum_insured) as tsi
            FROM portfolio.policies
            WHERE region IS NOT NULL
            GROUP BY region
            ORDER BY tsi DESC
            LIMIT 10
        """)
        by_region = [dict(row) for row in cursor.fetchall()]

        # By occupancy
        cursor.execute("""
            SELECT
                occupancy,
                COUNT(*) as count,
                SUM(sum_insured) as tsi
            FROM portfolio.policies
            WHERE occupancy IS NOT NULL
            GROUP BY occupancy
            ORDER BY tsi DESC
            LIMIT 10
        """)
        by_occupancy = [dict(row) for row in cursor.fetchall()]

        # By coverage
        cursor.execute("""
            SELECT
                coverage_name,
                COUNT(*) as count,
                SUM(sum_insured) as tsi
            FROM portfolio.policies
            WHERE coverage_name IS NOT NULL
            GROUP BY coverage_name
            ORDER BY tsi DESC
        """)
        by_coverage = [dict(row) for row in cursor.fetchall()]

        return {
            "overall": overall,
            "by_region": by_region,
            "by_occupancy": by_occupancy,
            "by_coverage": by_coverage
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/heatmap")
def get_heatmap_data(region: Optional[str] = None):
    """Get heatmap data for map visualization"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                latitude,
                longitude,
                sum_insured
            FROM portfolio.policies
            WHERE latitude IS NOT NULL
              AND longitude IS NOT NULL
              AND sum_insured IS NOT NULL
        """
        params = []

        if region:
            query += " AND region = %s"
            params.append(region)

        query += " ORDER BY sum_insured DESC LIMIT 10000"

        cursor.execute(query, params)
        points = cursor.fetchall()

        # Format as heatmap points
        max_intensity = max([float(p['sum_insured']) for p in points]) if points else 1

        heatmap_data = []
        for point in points:
            intensity = float(point['sum_insured']) / max_intensity
            heatmap_data.append({
                "lat": float(point['latitude']),
                "lng": float(point['longitude']),
                "intensity": intensity,
                "value": float(point['sum_insured'])
            })

        return {
            "data": heatmap_data,
            "total": len(heatmap_data)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/distribution/sum_insured")
def get_sum_insured_distribution(bins: int = Query(10, ge=5, le=50)):
    """Get sum insured distribution histogram"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            WITH ranges AS (
                SELECT
                    MIN(sum_insured) as min_val,
                    MAX(sum_insured) as max_val
                FROM portfolio.policies
                WHERE sum_insured IS NOT NULL
            )
            SELECT
                WIDTH_BUCKET(sum_insured, min_val, max_val, %s) as bucket,
                COUNT(*) as count,
                MIN(sum_insured) as range_start,
                MAX(sum_insured) as range_end
            FROM portfolio.policies, ranges
            WHERE sum_insured IS NOT NULL
            GROUP BY bucket
            ORDER BY bucket
        """, (bins,))

        distribution = [dict(row) for row in cursor.fetchall()]

        return {
            "data": distribution,
            "bins": bins
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/building_age")
def get_building_age_stats():
    """Get building age statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                CASE
                    WHEN year_built::integer < 1980 THEN 'Pre-1980'
                    WHEN year_built::integer >= 1980 AND year_built::integer < 2000 THEN '1980-1999'
                    WHEN year_built::integer >= 2000 AND year_built::integer < 2010 THEN '2000-2009'
                    WHEN year_built::integer >= 2010 THEN '2010+'
                    ELSE 'Unknown'
                END as age_group,
                COUNT(*) as count,
                SUM(sum_insured) as total_tsi
            FROM portfolio.policies
            WHERE year_built IS NOT NULL
            GROUP BY age_group
            ORDER BY age_group
        """)

        age_stats = [dict(row) for row in cursor.fetchall()]

        return {
            "data": age_stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()
