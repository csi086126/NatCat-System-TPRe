-- ============================================================
-- Authentication Schema (PostgreSQL 15 + PostGIS)
-- 用户系统 schema,与 portfolio schema 解耦
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- ====== 用户表 ======
CREATE TABLE IF NOT EXISTS auth.users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,           -- bcrypt 哈希
    display_name    VARCHAR(100),                   -- 显示名(可选)
    organization    VARCHAR(255),                   -- 单位(可选,用于按组织统计)
    role            VARCHAR(20) NOT NULL DEFAULT 'user',  -- user | admin
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active | pending_verification | suspended
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,  -- 是否通过邮箱验证
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

-- 兼容旧表:缺少 organization 列时补上(idempotent)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS organization VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON auth.users (status);
CREATE INDEX IF NOT EXISTS idx_users_organization ON auth.users (organization);

-- ====== 邮箱验证 token 表 ======
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           VARCHAR(255) UNIQUE NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON auth.email_verifications (token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON auth.email_verifications (user_id);

-- ====== 密码设置/重置 token 表 ======
-- 用途 1:管理员开账户后,首次设置密码(admin 生成的链接给用户)
-- 用途 2:忘记密码流程(后续扩展)
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           VARCHAR(255) UNIQUE NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON auth.password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON auth.password_reset_tokens (user_id);

-- ====== 自动更新 updated_at ======
CREATE OR REPLACE FUNCTION auth.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_touch_updated_at ON auth.users;
CREATE TRIGGER trg_users_touch_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auth.touch_updated_at();

-- ====== 初始 admin 用户(密码:ChangeMe@2026,可登录后立即改) ======
-- bcrypt 哈希由 scripts/portfolio_management/api/auth_utils.py 生成。
-- 占位哈希对应明文 "ChangeMe@2026" — 部署后必须立即改。
INSERT INTO auth.users (email, password_hash, display_name, role, email_verified, status)
VALUES (
    'admin@natcat.local',
    '$2b$12$placeholder.hash.will.be.replaced.by.bootstrap.script.on.first.run',
    'Platform Admin',
    'admin',
    TRUE,
    'active'
)
ON CONFLICT (email) DO NOTHING;