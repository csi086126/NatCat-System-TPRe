-- 2026-08-20 Query History 改为按登录用户隔离
--
-- 背景:
--   旧设计按浏览器 UUID (client_id) 隔离,清缓存/换电脑/多用户共用电脑都会丢历史或串历史。
--   改为按 auth.users.id (user_id) 隔离。
--
-- 旧表里只有开发期间的少量测试数据,直接 truncate。

BEGIN;

-- 1. 清空旧数据
TRUNCATE TABLE risk_map.query_history;

-- 2. 加 user_id 列,NOT NULL + 外键到 auth.users(用户被删则历史一起删)
ALTER TABLE risk_map.query_history
    ADD COLUMN user_id INTEGER NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. client_id 列降级 nullable(后续可彻底删除,本次先保留兼容旧脚本)
ALTER TABLE risk_map.query_history
    ALTER COLUMN client_id DROP NOT NULL;

-- 4. 索引按 user_id ��
DROP INDEX IF EXISTS risk_map.idx_query_history_client_created;
CREATE INDEX IF NOT EXISTS idx_query_history_user_created
    ON risk_map.query_history (user_id, created_at DESC);

COMMIT;

-- 验证:
--   \d risk_map.query_history
-- 应该看到:
--   - user_id integer NOT NULL (FK -> auth.users.id)
--   - client_id character varying(64) (nullable)
--   - idx_query_history_user_created (user_id, created_at DESC)