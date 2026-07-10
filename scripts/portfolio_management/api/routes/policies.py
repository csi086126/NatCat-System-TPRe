#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Policies API Routes
保单查询API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..database import get_db_connection

router = APIRouter()


@router.get("/")
def get_policies(
    region: Optional[str] = None,
    occupancy: Optional[str] = None,
    coverage_name: Optional[str] = None,
    event_name: Optional[str] = None,
    min_sum_insured: Optional[float] = None,
    max_sum_insured: Optional[float] = None,
    limit: int = Query(1000, le=10000),
    offset: int = 0
):
    """
    Get policies with optional filters

    Parameters:
    - region: Filter by Hong Kong district
    - occupancy: Filter by occupancy type
    - coverage_name: Filter by coverage type
    - event_name: Filter by event name
    - min_sum_insured: Minimum sum insured
    - max_sum_insured: Maximum sum insured
    - limit: Maximum number of results (default 1000, max 10000)
    - offset: Pagination offset
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Build query
    query = """
        SELECT
            id, policy_id, address, region,
            sum_insured, total_sum_insured_gross,
            occupancy, construction_class,
            floors, year_built,
            coverage_name, event_name,
            latitude, longitude,
            policy_start, policy_end
        FROM portfolio.policies
        WHERE 1=1
    """
    params = []

    if region:
        query += " AND region = %s"
        params.append(region)

    if occupancy:
        query += " AND occupancy = %s"
        params.append(occupancy)

    if coverage_name:
        query += " AND coverage_name = %s"
        params.append(coverage_name)

    if event_name:
        query += " AND event_name = %s"
        params.append(event_name)

    if min_sum_insured is not None:
        query += " AND sum_insured >= %s"
        params.append(min_sum_insured)

    if max_sum_insured is not None:
        query += " AND sum_insured <= %s"
        params.append(max_sum_insured)

    query += " ORDER BY sum_insured DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    try:
        cursor.execute(query, params)
        policies = cursor.fetchall()

        # Convert to list of dicts
        result = [dict(row) for row in policies]

        # Get total count
        count_query = "SELECT COUNT(*) FROM portfolio.policies WHERE 1=1"
        cursor.execute(count_query)
        total_count = cursor.fetchone()['count']

        return {
            "data": result,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/{policy_id}")
def get_policy(policy_id: str):
    """Get a single policy by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM portfolio.policies
            WHERE policy_id = %s
        """, (policy_id,))

        policy = cursor.fetchone()

        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")

        return dict(policy)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/geojson/all")
def get_policies_geojson(
    region: Optional[str] = None,
    limit: int = Query(5000, le=50000)
):
    """
    Get policies as GeoJSON for map visualization
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            policy_id, address, region,
            sum_insured, occupancy,
            latitude, longitude
        FROM portfolio.policies
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """
    params = []

    if region:
        query += " AND region = %s"
        params.append(region)

    query += " ORDER BY sum_insured DESC LIMIT %s"
    params.append(limit)

    try:
        cursor.execute(query, params)
        policies = cursor.fetchall()

        # Build GeoJSON
        features = []
        for policy in policies:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(policy['longitude']), float(policy['latitude'])]
                },
                "properties": {
                    "policy_id": policy['policy_id'],
                    "address": policy['address'],
                    "region": policy['region'],
                    "sum_insured": float(policy['sum_insured']) if policy['sum_insured'] else 0,
                    "occupancy": policy['occupancy']
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()
