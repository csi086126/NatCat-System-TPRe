"""
2026-08-20 一次性迁移执行器
- 读 .env,连 PostgreSQL
- 跑迁移 SQL(加 user_id 列 + 改索引)
- 输出迁移前后 schema 对比
"""
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
}

MIGRATION_FILE = Path(__file__).with_name('2026-08-20_query_history_user_isolation.sql')

def get_schema_snapshot(conn):
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'risk_map' AND table_name = 'query_history'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        cursor.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'risk_map' AND tablename = 'query_history'
        """)
        indexes = cursor.fetchall()
    return columns, indexes


def main():
    print(f"=== Migration: {MIGRATION_FILE.name} ===")
    print(f"Target: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    print()

    with psycopg2.connect(**DB_CONFIG) as conn:
        print("--- BEFORE ---")
        cols_before, idx_before = get_schema_snapshot(conn)
        for c in cols_before:
            print(f"  col: {c[0]:<12} {c[1]:<25} nullable={c[2]}")
        for i in idx_before:
            print(f"  idx: {i[0]} :: {i[1]}")
        print()

        sql = MIGRATION_FILE.read_text(encoding='utf-8')
        print("--- EXECUTING ---")
        with conn.cursor() as cursor:
            cursor.execute(sql)
        conn.commit()

        print("--- AFTER ---")
        cols_after, idx_after = get_schema_snapshot(conn)
        for c in cols_after:
            print(f"  col: {c[0]:<12} {c[1]:<25} nullable={c[2]}")
        for i in idx_after:
            print(f"  idx: {i[0]} :: {i[1]}")
        print()
        print("Migration complete [OK]")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Migration failed [ERR]: {e}", file=sys.stderr)
        sys.exit(1)