"""
测试PostgreSQL连接
"""
import psycopg2
from dotenv import load_dotenv
import os
import sys
import io

# Set UTF-8 encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load environment variables
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

print("=" * 60)
print("PostgreSQL Connection Test")
print("=" * 60)
print()
print(f"Host: {DB_CONFIG['host']}")
print(f"Port: {DB_CONFIG['port']}")
print(f"Database: {DB_CONFIG['database']}")
print(f"User: {DB_CONFIG['user']}")
print()

try:
    # Try to connect
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(**DB_CONFIG)
    print("Connection successful!")
    print()

    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"PostgreSQL version:")
    print(f"  {version[:80]}...")
    print()

    # Check PostGIS
    cursor.execute("SELECT PostGIS_version();")
    postgis_version = cursor.fetchone()[0]
    print(f"PostGIS version: {postgis_version}")
    print()

    # Check if schema exists
    cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'portfolio';")
    schema_exists = cursor.fetchone()

    if schema_exists:
        print("Schema 'portfolio' exists")

        # Check tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'portfolio'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()

        if tables:
            print(f"\nExisting tables in 'portfolio' schema:")
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM portfolio.{table[0]};")
                count = cursor.fetchone()[0]
                print(f"  - {table[0]}: {count:,} records")
        else:
            print("\nNo tables found in 'portfolio' schema")
            print("Need to run schema.sql")
    else:
        print("Schema 'portfolio' does not exist")
        print("Need to run schema.sql")

    cursor.close()
    conn.close()

    print()
    print("=" * 60)
    print("Database is ready!")
    print("=" * 60)

except psycopg2.OperationalError as e:
    print(f"Connection failed: {e}")
    print()
    print("Possible issues:")
    print("  1. PostgreSQL service is not running")
    print("  2. Database 'natcat_platform' does not exist")
    print("  3. Wrong credentials in .env file")
    print()
    print("To fix:")
    print("  1. Start PostgreSQL service")
    print("  2. Create database: psql -U postgres -c \"CREATE DATABASE natcat_platform;\"")
    print("  3. Check .env file credentials")

except Exception as e:
    print(f"Error: {e}")
