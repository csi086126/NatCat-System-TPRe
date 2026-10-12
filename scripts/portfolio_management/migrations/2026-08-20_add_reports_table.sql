-- 2026-08-20 新增 risk_map.generated_reports 表
--
-- 背景:
--   PDF 报告后端化(给客户用)。每份生成的报告留痕:
--   - 谁(user_id)请求的
--   - 什么类型(point/area/portfolio)
--   - 输入参数 JSONB(可重建/审计)
--   - OSS 对象 key + 摘要
--   - 状态机:pending → generating → ready / failed
--   - 下载次数(业务指标)

BEGIN;

CREATE TABLE IF NOT EXISTS risk_map.generated_reports (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(20) NOT NULL
        CHECK (report_type IN ('point', 'area', 'portfolio')),
    label TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
    oss_object_key VARCHAR(512),
    file_size_bytes BIGINT,
    error_message TEXT,
    input_params JSONB NOT NULL,
    summary JSONB,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    download_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_user_status
    ON risk_map.generated_reports (user_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_reports_object_key
    ON risk_map.generated_reports (oss_object_key);

COMMIT;

-- 验证:
--   \d risk_map.generated_reports
-- 应该看到:
--   - id, user_id (FK auth.users), report_type, label, status, oss_object_key, ...
--   - input_params / summary JSONB NOT NULL / nullable
--   - idx_generated_reports_user_status, idx_generated_reports_object_key