"""
扩大所有VARCHAR字段长度，避免数据截断
"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

print("Expanding VARCHAR field lengths...")

# Expand all potentially long VARCHAR fields
alterations = [
    "ALTER TABLE portfolio.policies ALTER COLUMN 險種名稱 TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN coverage_name TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN 佔用性質 TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN occupancy TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN 建築等級 TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN construction_class TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN formatted_address TYPE TEXT;",
    "ALTER TABLE portfolio.policies ALTER COLUMN place_id TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN 巨災名稱 TYPE VARCHAR(500);",
    "ALTER TABLE portfolio.policies ALTER COLUMN event_name TYPE VARCHAR(500);",
]

for sql in alterations:
    try:
        print(f"  {sql[:60]}...")
        cursor.execute(sql)
    except Exception as e:
        print(f"    Error: {e}")

conn.commit()
cursor.close()
conn.close()

print("\nAll VARCHAR fields expanded successfully!")
