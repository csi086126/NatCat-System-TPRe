"""列出 PostgreSQL 里所有相关表 + 结构 + 记录数"""
from pathlib import Path
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', '5432')),
    database=os.getenv('DB_NAME', 'natcat_platform'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres'),
)

with conn.cursor() as cursor:
    cursor.execute("SELECT version()")
    print(f"=== DB Version ===\n{cursor.fetchone()[0]}\n")

    cursor.execute("""
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND schema_name NOT LIKE 'pg_%'
        ORDER BY schema_name
    """)
    schemas = [r[0] for r in cursor.fetchall()]
    print(f"=== Schemas ({len(schemas)}) ===")
    for s in schemas:
        print(f"  - {s}")

    # 表 + 字段(简化:列名 + 类型 + nullable)
    for schema in schemas:
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """, (schema,))
        tables = [r[0] for r in cursor.fetchall()]

        for table in tables:
            full = f"{schema}.{table}"
            print(f"\n  --- {full} ---")

            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """, (schema, table))
            for col_name, col_type, nullable in cursor.fetchall():
                tag = 'NULL' if nullable == 'YES' else 'NOT NULL'
                print(f"    {col_name:<32} {col_type:<30} {tag}")

            # PK
            cursor.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a
                  ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass AND i.indisprimary
            """, (full,))
            pks = [r[0] for r in cursor.fetchall()]
            if pks:
                print(f"    PK: ({', '.join(pks)})")

            # FK
            cursor.execute("""
                SELECT conname, pg_get_constraintdef(oid)
                FROM pg_constraint
                WHERE conrelid = %s::regclass AND contype = 'f'
            """, (full,))
            fk_rows = cursor.fetchall()
            for fk_row in fk_rows:
                if len(fk_row) >= 2:
                    print(f"    FK: {fk_row[0]} :: {fk_row[1]}")

            # 索引
            cursor.execute(f"""
                SELECT indexname FROM pg_indexes
                WHERE schemaname = '{schema}' AND tablename = '{table}'
                  AND indexname NOT LIKE '%_pkey'
            """)
            for idx_row in cursor.fetchall():
                print(f"    IDX: {idx_row[0]}")

            # 记录数
            cursor.execute(f'SELECT COUNT(*) FROM {full}')
            print(f"    ROWS: {cursor.fetchone()[0]}")

conn.close()
print("\n[OK]")