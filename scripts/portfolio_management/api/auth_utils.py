#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Authentication utilities:
- Password hashing (bcrypt)
- JWT token generation / verification
- Email verification (token generation, email send with SMTP mock fallback)
- Current user dependency (FastAPI)
"""

from __future__ import annotations

import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel


# ====== 配置 ======

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "24"))
COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "natcat_session")

# bcrypt cost factor (12 = ~250ms per hash on modern CPU)
BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

# Email verification
EMAIL_VERIFICATION_TTL_HOURS = int(os.getenv("EMAIL_VERIFICATION_TTL_HOURS", "24"))

# SMTP
# SMTP_MOCK=true (默认)时,把验证链接打���到 FastAPI stdout 而不真发邮件。
# 生产环境配 SMTP_HOST/USER/PASSWORD 后置为 false。
SMTP_MOCK = os.getenv("SMTP_MOCK", "true").lower() in ("true", "1", "yes")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "true").lower() in ("true", "1", "yes")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@natcat.local")
SENDER_NAME = os.getenv("SENDER_NAME", "NatCat Platform")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3004")

if not JWT_SECRET:
    # 开发兜底:仅当 JWT_SECRET 未设置且 env 标记 dev 时使用固定值。
    # 生产环境必须通过 .env 或容器 env 注入强随机密钥(>= 32 字节)。
    if os.getenv("NATCAT_ENV", "dev") == "dev":
        JWT_SECRET = "dev-only-insecure-secret-change-me-please-32b"
    else:
        raise RuntimeError(
            "JWT_SECRET 未配置。请在 .env 中设置至少 32 字节的随机字符串。"
        )


# ====== Password hashing ======

def hash_password(plain: str) -> str:
    """Generate a bcrypt hash. plain will be UTF-8 encoded."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time compare. Returns False on any decoding error."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ====== JWT tokens ======

class TokenPayload(BaseModel):
    sub: str          # user id (stringified)
    email: str
    role: str
    exp: int          # unix timestamp


def create_access_token(*, user_id: int, email: str, role: str) -> str:
    """Return a signed JWT for the given user."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=ACCESS_TOKEN_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> TokenPayload | None:
    """Verify signature & expiry. Returns None on any failure (never raises)."""
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenPayload(**decoded)
    except jwt.PyJWTError:
        return None


# ====== Current user dependency ======

# OAuth2PasswordBearer 仅用于 OpenAPI 文档生成(标注 /api/auth/login 接受 form)。
# 实际取 token 走 cookie,所以 auto_error=False,不强制 header。
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
)


class CurrentUser(BaseModel):
    id: int
    email: str
    role: str
    display_name: str | None = None


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> CurrentUser:
    """Resolve the current user from:
    1. Authorization: Bearer <jwt>  (header; useful for tooling / mobile clients)
    2. <COOKIE_NAME> cookie        (primary path for browser users)

    Raises 401 if neither is present or the token is invalid / expired.
    """
    raw = token
    if not raw:
        raw = request.cookies.get(COOKIE_NAME)

    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        id=int(payload.sub),
        email=payload.email,
        role=payload.role,
    )


def require_admin(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Dependency factory: ensures the caller has the 'admin' role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
        )
    return user


# ====== Email verification ======

def create_email_verification_token() -> str:
    """Return a random URL-safe token. Single-use, stored in auth.email_verifications."""
    return secrets.token_urlsafe(32)


def store_email_verification(conn, user_id: int, token: str) -> None:
    """Persist a verification token with expiry. Caller commits."""
    expires_at = datetime.now(tz=timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_TTL_HOURS)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO auth.email_verifications (user_id, token, expires_at)
        VALUES (%s, %s, %s)
        """,
        (user_id, token, expires_at),
    )
    conn.commit()
    cursor.close()


def send_verification_email(to_email: str, token: str) -> None:
    """Send verification email. In SMTP mock mode (default), print to stdout.

    Production: set SMTP_MOCK=false and SMTP_HOST/USER/PASSWORD to send real mail.
    For 国内云 (阿里云 DM / 腾讯云 SES) configure accordingly.
    """
    verify_url = f"{FRONTEND_URL.rstrip('/')}/verify-email?token={token}"

    subject = f"[{SENDER_NAME}] 请验证您的邮箱"
    body = (
        f"您好,\n\n"
        f"感谢注册 {SENDER_NAME}。请点击以下链接完成邮箱验证:\n\n"
        f"  {verify_url}\n\n"
        f"该链接将在 {EMAIL_VERIFICATION_TTL_HOURS} 小时后失效。\n\n"
        f"如果您没有注册过 {SENDER_NAME},请忽略此邮件。\n\n"
        f"— {SENDER_NAME} 团队\n"
    )

    if SMTP_MOCK or not SMTP_HOST:
        print("\n" + "=" * 60, flush=True)
        print(f"[Email Mock] To:      {to_email}", flush=True)
        print(f"[Email Mock] Subject: {subject}", flush=True)
        print(f"[Email Mock] Verify URL:", flush=True)
        print(f"  {verify_url}", flush=True)
        print("=" * 60 + "\n", flush=True)
        return

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_email

    try:
        if SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, [to_email], msg.as_string())
        server.quit()
        print(f"[Email] Sent verification to {to_email}", flush=True)
    except Exception as e:
        print(f"[Email] FAILED to {to_email}: {e}", flush=True)
        # 不抛 — 邮件失败不应该阻断注册流程,用户可以 resend。
        # 但记录日志便于排查。


# ====== Password reset / first-set-password tokens ======

PASSWORD_RESET_TTL_HOURS = int(os.getenv("PASSWORD_RESET_TTL_HOURS", "72"))


def create_password_reset_token() -> str:
    """Return a random URL-safe token. Single-use, stored in auth.password_reset_tokens."""
    return secrets.token_urlsafe(32)


def store_password_reset_token(conn, user_id: int, token: str) -> None:
    """Persist a password-set/reset token with expiry. Caller commits."""
    expires_at = datetime.now(tz=timezone.utc) + timedelta(hours=PASSWORD_RESET_TTL_HOURS)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO auth.password_reset_tokens (user_id, token, expires_at)
        VALUES (%s, %s, %s)
        """,
        (user_id, token, expires_at),
    )
    conn.commit()
    cursor.close()


def fetch_password_reset_token(conn, token: str) -> dict | None:
    """Look up a token row joined with user. Returns None if token doesn't exist."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at,
        u.email, u.status
        FROM auth.password_reset_tokens prt
        JOIN auth.users u ON u.id = prt.user_id
        WHERE prt.token = %s
        """,
        (token,),
    )
    row = cursor.fetchone()
    cursor.close()
    return dict(row) if row else None


def mark_password_reset_used(conn, token_id: int) -> None:
    """Mark a token as used (single-use enforcement)."""
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE auth.password_reset_tokens SET used_at = NOW() WHERE id = %s",
        (token_id,),
    )
    conn.commit()
    cursor.close()


# ====== Schema bootstrap ======

def ensure_auth_schema(conn) -> None:
    """Create auth schema + users table if missing (idempotent).

    Best-effort: caller logs / swallows exceptions. Mirrors the pattern in
    routes/query_history.ensure_table().
    """
    from pathlib import Path

    sql_file = Path(__file__).resolve().parent.parent / "database" / "auth_schema.sql"
    sql = sql_file.read_text(encoding="utf-8")
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()
    cursor.close()