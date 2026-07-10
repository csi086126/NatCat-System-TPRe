"""
修复share_percentage字段精度问题
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

print("Fixing share_percentage field precision...")

# Drop and recreate with correct precision
cursor.execute("""
    ALTER TABLE portfolio.policies
    ALTER COLUMN 承保份額 TYPE NUMERIC(7,2);
""")

cursor.execute("""
    ALTER TABLE portfolio.policies
    ALTER COLUMN share_percentage TYPE NUMERIC(7,2);
""")

conn.commit()
cursor.close()
conn.close()

print("Fixed! Now share_percentage can hold values up to 99999.99")
