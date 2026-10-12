import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import Json, RealDictCursor


load_dotenv(Path(__file__).with_name('.env'))

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
}


def ensure_table(connection):
    with connection.cursor() as cursor:
        cursor.execute('CREATE SCHEMA IF NOT EXISTS risk_map')
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS risk_map.query_history (
                id BIGSERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL
                    REFERENCES auth.users(id) ON DELETE CASCADE,
                client_id VARCHAR(64),
                username VARCHAR(120),
                query_type VARCHAR(20) NOT NULL CHECK (query_type IN ('point', 'area', 'portfolio')),
                label TEXT NOT NULL,
                region VARCHAR(32),
                geometry JSONB NOT NULL,
                summary JSONB NOT NULL DEFAULT '{}'::jsonb,
                result JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            '''
        )
        cursor.execute(
            'CREATE INDEX IF NOT EXISTS idx_query_history_user_created '
            'ON risk_map.query_history (user_id, created_at DESC)'
        )
    connection.commit()


def create_record(connection, payload):
    with connection.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            '''
            INSERT INTO risk_map.query_history
                (user_id, username, query_type, label, region, geometry, summary, result)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
            ''',
            (
                payload['userId'],
                payload.get('username'),
                payload['queryType'],
                payload['label'],
                payload.get('region'),
                Json(payload['geometry']),
                Json(payload.get('summary', {})),
                Json(payload['result']),
            ),
        )
        record = dict(cursor.fetchone())
    connection.commit()
    return record


def list_records(connection, user_id, limit, offset):
    with connection.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            '''
            SELECT id, username, query_type, label, region, geometry, summary, created_at
            FROM risk_map.query_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            ''',
            (user_id, limit, offset),
        )
        records = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            'SELECT COUNT(*) AS total FROM risk_map.query_history WHERE user_id = %s',
            (user_id,),
        )
        total = cursor.fetchone()['total']
    return {'records': records, 'total': total, 'limit': limit, 'offset': offset}


def get_record(connection, user_id, record_id):
    with connection.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            '''
            SELECT id, username, query_type, label, region, geometry, summary, result, created_at
            FROM risk_map.query_history
            WHERE user_id = %s AND id = %s
            ''',
            (user_id, record_id),
        )
        record = cursor.fetchone()
    return dict(record) if record else None


def delete_record(connection, user_id, record_id):
    with connection.cursor() as cursor:
        cursor.execute(
            'DELETE FROM risk_map.query_history WHERE user_id = %s AND id = %s',
            (user_id, record_id),
        )
        deleted = cursor.rowcount > 0
    connection.commit()
    return {'deleted': deleted}


def json_default(value):
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    raise TypeError(f'Cannot serialize {type(value).__name__}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['health', 'create', 'list', 'get', 'delete'])
    parser.add_argument('--user-id', type=int)
    parser.add_argument('--id', type=int)
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--offset', type=int, default=0)
    args = parser.parse_args()

    try:
        with psycopg2.connect(**DB_CONFIG) as connection:
            ensure_table(connection)
            if args.action == 'health':
                result = {'ok': True, 'database': DB_CONFIG['database']}
            elif args.action == 'create':
                result = create_record(connection, json.load(sys.stdin))
            elif args.action == 'list':
                result = list_records(connection, args.user_id, args.limit, args.offset)
            elif args.action == 'get':
                result = get_record(connection, args.user_id, args.id)
            else:
                result = delete_record(connection, args.user_id, args.id)
        print(json.dumps(result, default=json_default, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()