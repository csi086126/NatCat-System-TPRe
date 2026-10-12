"""执行 generated_reports 表的迁移"""
from pathlib import Path
import os
import sys
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

MIGRATION_FILE = Path(__file__).with_name('2026-08-20_add_reports_table.sql')


def main():
    print(f"=== Migration: {MIGRATION_FILE.name} ===")
    with psycopg2.connect(**DB_CONFIG) as conn:
        sql = MIGRATION_FILE.read_text(encoding='utf-8')
        with conn.cursor() as cursor:
            cursor.execute(sql)
        conn.commit()

        # 验证
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema='risk_map' AND table_name='generated_reports'
                ORDER BY ordinal_position
            """)
            cols = cursor.fetchall()
            print(f"\n[generated_reports] {len(cols)} cols:")
            for c in cols:
                print(f"  - {c[0]:<22} {c[1]:<25} nullable={c[2]}")
            cursor.execute("""
                SELECT indexname FROM pg_indexes
                WHERE schemaname='risk_map' AND tablename='generated_reports'
                  AND indexname NOT LIKE '%_pkey'
            """)
            idx = [r[0] for r in cursor.fetchall()]
            print(f"\n[indexes] {idx}")

    print("\nMigration complete [OK]")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Migration failed [ERR]: {e}", file=sys.stderr)
        sys.exit(1)