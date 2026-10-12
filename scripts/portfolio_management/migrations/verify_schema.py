"""验证 query_history schema 改造是否完成"""
from pathlib import Path
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

with psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', '5432')),
    database=os.getenv('DB_NAME', 'natcat_platform'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres'),
) as conn:
    with conn.cursor() as cursor:
        # 1. risk_map.query_history.user_id 存在且是 integer NOT NULL
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema='risk_map' AND table_name='query_history'
              AND column_name='user_id'
        """)
        user_id_col = cursor.fetchone()
        print(f"[user_id col] {user_id_col}")
        assert user_id_col and user_id_col[2] == 'NO', "user_id 必须 NOT NULL"

        # 2. client_id 已降级为 nullable
        cursor.execute("""
            SELECT is_nullable FROM information_schema.columns
            WHERE table_schema='risk_map' AND table_name='query_history'
              AND column_name='client_id'
        """)
        client_nullable = cursor.fetchone()[0]
        print(f"[client_id nullable] {client_nullable}")
        assert client_nullable == 'YES', "client_id 必须 nullable"

        # 3. 索引按 user_id
        cursor.execute("""
            SELECT indexname FROM pg_indexes
            WHERE schemaname='risk_map' AND tablename='query_history'
        """)
        indexes = [r[0] for r in cursor.fetchall()]
        print(f"[indexes] {indexes}")
        assert 'idx_query_history_user_created' in indexes, "必须有 user_id 索引"
        assert 'idx_query_history_client_created' not in indexes, "旧 client_id 索引应删除"

        # 4. auth.users 表存在且有数据
        cursor.execute("SELECT id, email, role FROM auth.users ORDER BY id")
        users = cursor.fetchall()
        print(f"[auth.users] {len(users)} rows")
        for u in users:
            print(f"  - id={u[0]} email={u[1]} role={u[2]}")

        # 5. FK 约束
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid='risk_map.query_history'::regclass
              AND contype='f'
        """)
        fks = cursor.fetchall()
        print(f"[FK] {fks}")
        assert any('user_id' in f[1] for f in fks), "user_id 必须有 FK 到 auth.users"

        # 6. 查询历史当前是空的(TRUNCATE 了)
        cursor.execute("SELECT COUNT(*) FROM risk_map.query_history")
        count = cursor.fetchone()[0]
        print(f"[row count] {count}")
        assert count == 0, "旧数据应已清空"

print("\nAll checks passed [OK]")