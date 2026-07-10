#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Initialization Script
执行Schema创建和PostGIS配置
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}


def create_database_if_not_exists():
    """Create database if it doesn't exist"""
    logger.info("=" * 60)
    logger.info("Checking if database exists...")
    logger.info("=" * 60)

    # Connect to default postgres database
    conn = psycopg2.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        database='postgres',
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password']
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    try:
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (DB_CONFIG['database'],)
        )
        exists = cursor.fetchone()

        if not exists:
            logger.info(f"Creating database: {DB_CONFIG['database']}")
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(DB_CONFIG['database'])
                )
            )
            logger.info(f"✓ Database '{DB_CONFIG['database']}' created successfully")
        else:
            logger.info(f"✓ Database '{DB_CONFIG['database']}' already exists")

    finally:
        cursor.close()
        conn.close()


def execute_schema():
    """Execute schema.sql file"""
    logger.info("=" * 60)
    logger.info("Executing database schema...")
    logger.info("=" * 60)

    # Read schema file
    schema_file = Path(__file__).parent / 'schema.sql'
    if not schema_file.exists():
        logger.error(f"Schema file not found: {schema_file}")
        return False

    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    # Connect to target database
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # Execute schema
        cursor.execute(schema_sql)
        conn.commit()
        logger.info("✓ Schema executed successfully")

        # Verify PostGIS extension
        cursor.execute("SELECT PostGIS_Version();")
        postgis_version = cursor.fetchone()[0]
        logger.info(f"✓ PostGIS version: {postgis_version}")

        # Check created tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'portfolio'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()

        logger.info("\n" + "=" * 60)
        logger.info("Created tables in 'portfolio' schema:")
        logger.info("=" * 60)
        for table in tables:
            logger.info(f"  - {table[0]}")

        return True

    except Exception as e:
        conn.rollback()
        logger.error(f"Error executing schema: {e}")
        return False

    finally:
        cursor.close()
        conn.close()


def verify_setup():
    """Verify database setup"""
    logger.info("\n" + "=" * 60)
    logger.info("Verifying database setup...")
    logger.info("=" * 60)

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # Check PostGIS
        cursor.execute("SELECT PostGIS_Full_Version();")
        postgis_info = cursor.fetchone()[0]
        logger.info(f"✓ PostGIS: {postgis_info[:100]}...")

        # Check schema
        cursor.execute("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name = 'portfolio';
        """)
        if cursor.fetchone():
            logger.info("✓ Schema 'portfolio' exists")

        # Check tables
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'portfolio';
        """)
        table_count = cursor.fetchone()[0]
        logger.info(f"✓ Total tables: {table_count}")

        # Check spatial indexes
        cursor.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'portfolio' AND indexname LIKE '%geom%';
        """)
        spatial_indexes = cursor.fetchall()
        logger.info(f"✓ Spatial indexes: {len(spatial_indexes)}")
        for idx in spatial_indexes:
            logger.info(f"  - {idx[0]}")

        # Check functions
        cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'portfolio';
        """)
        functions = cursor.fetchall()
        logger.info(f"✓ Functions: {len(functions)}")
        for func in functions:
            logger.info(f"  - {func[0]}")

        # Check views
        cursor.execute("""
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'portfolio';
        """)
        views = cursor.fetchall()
        logger.info(f"✓ Views: {len(views)}")
        for view in views:
            logger.info(f"  - {view[0]}")

        return True

    except Exception as e:
        logger.error(f"Verification error: {e}")
        return False

    finally:
        cursor.close()
        conn.close()


def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("Portfolio Management Database Initialization")
    logger.info("=" * 60)
    logger.info(f"Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    logger.info(f"Database: {DB_CONFIG['database']}")
    logger.info(f"User: {DB_CONFIG['user']}")
    logger.info("=" * 60)

    try:
        # Step 1: Create database if needed
        create_database_if_not_exists()

        # Step 2: Execute schema
        if not execute_schema():
            logger.error("Schema execution failed!")
            return 1

        # Step 3: Verify setup
        if not verify_setup():
            logger.error("Verification failed!")
            return 1

        logger.info("\n" + "=" * 60)
        logger.info("✅ Database initialization completed successfully!")
        logger.info("=" * 60)
        logger.info("\nNext steps:")
        logger.info("  1. Run geocoding: python data_processing/01_geocode_full.py")
        logger.info("  2. Load to database: python data_processing/02_load_to_db.py")
        logger.info("  3. Generate aggregations: python data_processing/03_aggregate.py")
        logger.info("=" * 60)

        return 0

    except Exception as e:
        logger.error(f"Initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
