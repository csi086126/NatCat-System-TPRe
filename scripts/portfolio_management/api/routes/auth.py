#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Authentication API routes
- POST /api/auth/register           创建账号(发验证邮件)
- POST /api/auth/login              登录(邮箱必须已验证)
- POST /api/auth/login-json         登录(JSON 版本)
- POST /api/auth/logout             登出
- GET  /api/auth/me                 当前用户信息
- GET  /api/auth/verify-email       验证邮箱(链接点击进入)
- POST /api/auth/resend-verification 重新发送验证邮件
"""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator

from ..auth_utils import (
    ACCESS_TOKEN_TTL_HOURS,
    COOKIE_NAME,
    CurrentUser,
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    fetch_password_reset_token,
    get_current_user,
    hash_password,
    mark_password_reset_used,
    require_admin,
    send_verification_email,
    store_email_verification,
    store_password_reset_token,
    verify_password,
)
from ..database import get_db_connection

router = APIRouter(tags=["auth"])


# ====== Pydantic schemas ======

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)
    organization: Optional[str] = Field(None, max_length=255)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain both letters and digits")
        return v


class UserPublic(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    organization: Optional[str] = None
    role: str
    status: str
    email_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


class LoginResponse(BaseModel):
    user: UserPublic
    expires_in_hours: int


class RegisterResponse(BaseModel):
    user: UserPublic
    expires_in_hours: int
    verification_required: bool = True


class EmailRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v


class VerifyEmailResponse(BaseModel):
    status: str  # 'verified' | 'already_verified' | 'expired' | 'invalid'
    email: Optional[str] = None


class AdminCreateUserRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    display_name: Optional[str] = Field(None, max_length=100)
    organization: Optional[str] = Field(None, max_length=255)
    role: str = Field("user", pattern=r"^(user|admin)$")

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v


class AdminCreateUserResponse(BaseModel):
    user: UserPublic
    set_password_url: str  # 给管理员手动发给用户的链接(无 SMTP 时用)
    expires_in_hours: int


class AdminUserListItem(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    organization: Optional[str] = None
    role: str
    status: str
    email_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    total: int
    items: list[AdminUserListItem]


class SetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain both letters and digits")
        return v


class SetPasswordResponse(BaseModel):
    status: str  # 'ok' | 'invalid' | 'expired' | 'already_used'
    email: Optional[str] = None


# ====== Helpers ======

def _set_session_cookie(response: Response, token: str) -> None:
    """Set the auth cookie. httpOnly + sameSite=lax is the standard
    defense-in-depth against XSS-driven session theft."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=ACCESS_TOKEN_TTL_HOURS * 3600,
        httponly=True,
        secure=False,        # 生产环境必须 True(配 HTTPS)
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def _fetch_user_by_email(conn, email: str) -> dict | None:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, email, password_hash, display_name, organization, role, status,
               email_verified, created_at, last_login_at
          FROM auth.users
         WHERE email = %s
        """,
        (email,),
    )
    row = cursor.fetchone()
    cursor.close()
    if not row:
        return None
    # row is already a dict (RealDictCursor). Keep password_hash — login needs it.
    return dict(row)


def _to_public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"],
        email=user["email"],
        display_name=user.get("display_name"),
        organization=user.get("organization"),
        role=user["role"],
        status=user["status"],
        email_verified=user.get("email_verified", False),
        created_at=user["created_at"],
        last_login_at=user.get("last_login_at"),
    )


# ====== Routes ======

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, response: Response) -> RegisterResponse:
    """Create a new user account.

    User starts at status='pending_verification' / email_verified=False.
    A verification email is sent; login is blocked until verification.
    Admin-bootstrap user (admin@natcat.local) is exempt.
    """
    conn = get_db_connection()
    try:
        existing = _fetch_user_by_email(conn, payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already registered",
            )

        password_hash = hash_password(payload.password)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO auth.users (
                email, password_hash, display_name, organization,
                role, status, email_verified
            )
            VALUES (%s, %s, %s, %s, 'user', 'pending_verification', FALSE)
            RETURNING id, email, display_name, organization, role, status,
                      email_verified, created_at, last_login_at
            """,
            (payload.email, password_hash, payload.display_name, payload.organization),
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create user")

        user = dict(row)

        # 生成验证 token 并发邮件
        token = create_email_verification_token()
        store_email_verification(conn, user["id"], token)
        send_verification_email(to_email=user["email"], token=token)

        # 注册时不直接颁发 session cookie(用户还没验证邮箱)。
        # 前端根据 verification_required 跳转到「请查收邮件」提示页。
        return RegisterResponse(
            user=_to_public(user),
            expires_in_hours=ACCESS_TOKEN_TTL_HOURS,
            verification_required=True,
        )
    finally:
        conn.close()


@router.post("/login", response_model=LoginResponse)
def login(
    response: Response,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> LoginResponse:
    """
    Login via OAuth2 password flow (form-encoded username=email, password=...).
    Accepts JSON body as well: the OAuth2 form dependency only requires `username`
    and `password` keys, which map cleanly to JSON {username, password} via
    FastAPI's content-type negotiation — see /api/auth/login-json for explicit JSON.
    """
    return _do_login(form.username, form.password, response)


class LoginJsonRequest(BaseModel):
    email: str
    password: str


@router.post("/login-json", response_model=LoginResponse)
def login_json(payload: LoginJsonRequest, response: Response) -> LoginResponse:
    """Convenience endpoint that accepts JSON body (easier for fetch from frontend)."""
    return _do_login(payload.email, payload.password, response)


def _do_login(email: str, password: str, response: Response) -> LoginResponse:
    email = email.strip().lower()
    conn = get_db_connection()
    try:
        user = _fetch_user_by_email(conn, email)

        # 用通用错误消息掩盖「邮箱不存在 vs 密码错误」(防枚举)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # 邮箱��验证(仅对非 admin 账号生效;admin-bootstrap 已默认 verified)
        if user["role"] != "admin" and not user.get("email_verified"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in. Check your inbox (and spam folder) for the verification link.",
            )

        if user["status"] == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended. Please contact an administrator.",
            )

        # pending_verification 但 admin 角色 / 已验证:正常登录。
        # 如果是普通用户 verified,顺手把 status 推到 active(幂等)。
        if user["status"] == "pending_verification" and user.get("email_verified"):
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE auth.users SET status = 'active' WHERE id = %s",
                (user["id"],),
            )
            conn.commit()
            cursor.close()
            user["status"] = "active"

        # 更新 last_login_at
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE auth.users SET last_login_at = NOW() WHERE id = %s",
            (user["id"],),
        )
        conn.commit()
        cursor.close()
        user["last_login_at"] = datetime.now(tz=timezone.utc)

        token = create_access_token(
            user_id=user["id"], email=user["email"], role=user["role"]
        )
        _set_session_cookie(response, token)
        return LoginResponse(
            user=_to_public(user),
            expires_in_hours=ACCESS_TOKEN_TTL_HOURS,
        )
    finally:
        conn.close()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    """Clear the session cookie. Idempotent (safe to call when not logged in)."""
    _clear_session_cookie(response)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserPublic)
def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> UserPublic:
    """Return the current user's public profile (requires valid session)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, display_name, organization, role, status,
                   email_verified, created_at, last_login_at
              FROM auth.users
             WHERE id = %s
            """,
            (user.id,),
        )
        row = cursor.fetchone()
        cursor.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return _to_public(dict(row))
    finally:
        conn.close()


@router.get("/verify-email", response_model=VerifyEmailResponse)
def verify_email(token: str = Query(..., min_length=10, max_length=255)) -> VerifyEmailResponse:
    """Validate a verification token from the email link.

    Returns one of:
      - verified          (首次验证成功)
      - already_verified  (链接用过,但账号已是 active)
      - invalid           (token 不存在)
      - expired           (链接已过有效期)
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ev.id, ev.user_id, ev.expires_at, ev.used_at,
                   u.email, u.status, u.email_verified
              FROM auth.email_verifications ev
              JOIN auth.users u ON u.id = ev.user_id
             WHERE ev.token = %s
            """,
            (token,),
        )
        row = cursor.fetchone()
        cursor.close()

        if not row:
            return VerifyEmailResponse(status="invalid")

        if row["used_at"]:
            return VerifyEmailResponse(status="already_verified", email=row["email"])

        if row["expires_at"] < datetime.now(tz=timezone.utc):
            return VerifyEmailResponse(status="expired", email=row["email"])

        # 标记验证成功(激活账号)
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE auth.users
               SET email_verified = TRUE, status = 'active'
             WHERE id = %s
            """,
            (row["user_id"],),
        )
        cursor.execute(
            "UPDATE auth.email_verifications SET used_at = NOW() WHERE id = %s",
            (row["id"],),
        )
        conn.commit()
        cursor.close()
        return VerifyEmailResponse(status="verified", email=row["email"])
    finally:
        conn.close()


@router.post("/resend-verification")
def resend_verification(payload: EmailRequest) -> dict:
    """Re-send verification email. Returns {'sent': true} regardless of whether
    the email exists (prevents user enumeration).

    Handles legacy users (status='active' but email_verified=False from before
    verification flow was added): any unverified user can request a new link.
    """
    conn = get_db_connection()
    try:
        user = _fetch_user_by_email(conn, payload.email)
        if user and not user.get("email_verified") and user["role"] != "admin":
            token = create_email_verification_token()
            store_email_verification(conn, user["id"], token)
            send_verification_email(to_email=user["email"], token=token)
        # 始终返回 sent:true 防止枚举
        return {"sent": True}
    finally:
        conn.close()


# ====== Admin endpoints (需 admin 角色) ======

@router.post(
    "/admin/create-user",
    response_model=AdminCreateUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_user(
    payload: AdminCreateUserRequest,
    admin: Annotated[CurrentUser, Depends(require_admin)],
) -> AdminCreateUserResponse:
    """Create a new user account on behalf of a user.

    The new user is created with status='active' and email_verified=True
    (no email verification step needed — admin has already validated identity).

    Returns a `set_password_url` that the admin should send to the user
    (via WeChat / corporate email / etc). The user clicks it, sets a password,
    and can then log in.
    """
    from ..auth_utils import PASSWORD_RESET_TTL_HOURS

    conn = get_db_connection()
    try:
        existing = _fetch_user_by_email(conn, payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already registered",
            )

        # 临时占位密码 hash — 用户首次访问 set_password 链接时会被覆盖。
        # bcrypt 占位(任何明文都行,反正 set-password 会替换)
        password_hash = hash_password(secrets.token_urlsafe(24))

        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO auth.users (
                email, password_hash, display_name, organization,
                role, status, email_verified
            )
            VALUES (%s, %s, %s, %s, %s, 'active', TRUE)
            RETURNING id, email, display_name, organization, role, status,
                      email_verified, created_at, last_login_at
            """,
            (payload.email, password_hash, payload.display_name, payload.organization, payload.role),
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create user")

        user = dict(row)

        # 生成「设置密码」token
        token = create_password_reset_token()
        store_password_reset_token(conn, user["id"], token)

        # 返回给管理员的链接(无 SMTP 时,管理员手动发给用户)
        from ..auth_utils import FRONTEND_URL
        set_password_url = f"{FRONTEND_URL.rstrip('/')}/set-password?token={token}"

        return AdminCreateUserResponse(
            user=_to_public(user),
            set_password_url=set_password_url,
            expires_in_hours=PASSWORD_RESET_TTL_HOURS,
        )
    finally:
        conn.close()


@router.get("/admin/users", response_model=AdminUserListResponse)
def admin_list_users(
    admin: Annotated[CurrentUser, Depends(require_admin)],
    search: Optional[str] = Query(None, max_length=255),
    role: Optional[str] = Query(None, pattern=r"^(user|admin)$"),
    status_filter: Optional[str] = Query(None, alias="status", pattern=r"^(active|pending_verification|suspended)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> AdminUserListResponse:
    """List all users (admin only). Supports basic search and filtering."""
    conn = get_db_connection()
    try:
        where_clauses = []
        params = []
        if search:
            where_clauses.append("(email ILIKE %s OR display_name ILIKE %s OR organization ILIKE %s)")
            term = f"%{search}%"
            params.extend([term, term, term])
        if role:
            where_clauses.append("role = %s")
            params.append(role)
        if status_filter:
            where_clauses.append("status = %s")
            params.append(status_filter)

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        cursor = conn.cursor()
        # count total
        cursor.execute(f"SELECT COUNT(*) FROM auth.users {where_sql}", params)
        total = cursor.fetchone()["count"]

        # fetch page
        cursor.execute(
            f"""
            SELECT id, email, display_name, organization, role, status,
                   email_verified, created_at, last_login_at
              FROM auth.users
              {where_sql}
             ORDER BY created_at DESC
             LIMIT %s OFFSET %s
            """,
            params + [limit, offset],
        )
        rows = cursor.fetchall()
        cursor.close()

        items = [
            AdminUserListItem(
                id=r["id"],
                email=r["email"],
                display_name=r["display_name"],
                organization=r["organization"],
                role=r["role"],
                status=r["status"],
                email_verified=r["email_verified"],
                created_at=r["created_at"],
                last_login_at=r["last_login_at"],
            )
            for r in rows
        ]
        return AdminUserListResponse(total=total, items=items)
    finally:
        conn.close()


# ====== Password set (public, uses token from admin) ======

@router.post("/set-password", response_model=SetPasswordResponse)
def set_password(payload: SetPasswordRequest) -> SetPasswordResponse:
    """Set password using a token from /admin/create-user (or future /forgot-password).

    No authentication required — token itself is the authorization.
    Token is single-use and expires after PASSWORD_RESET_TTL_HOURS.
    """
    conn = get_db_connection()
    try:
        row = fetch_password_reset_token(conn, payload.token)
        if not row:
            return SetPasswordResponse(status="invalid")

        if row["used_at"]:
            return SetPasswordResponse(status="already_used", email=row["email"])

        if row["expires_at"] < datetime.now(tz=timezone.utc):
            return SetPasswordResponse(status="expired", email=row["email"])

        # 设置新密码
        new_hash = hash_password(payload.new_password)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE auth.users SET password_hash = %s WHERE id = %s",
            (new_hash, row["user_id"]),
        )
        mark_password_reset_used(conn, row["id"])
        conn.commit()
        cursor.close()

        return SetPasswordResponse(status="ok", email=row["email"])
    finally:
        conn.close()


# ====== Admin actions on existing users ======

class UpdateUserStatusRequest(BaseModel):
    status: str = Field(..., pattern=r"^(active|suspended)$")


class AdminUserActionResponse(BaseModel):
    user: UserPublic
    set_password_url: Optional[str] = None  # 仅 resend-setup 时返回
    expires_in_hours: Optional[int] = None


class DeleteUserResponse(BaseModel):
    status: str  # 'ok' | 'self_delete_forbidden' | 'last_admin_forbidden' | 'not_found'
    email: Optional[str] = None


@router.delete("/admin/users/{user_id}", response_model=DeleteUserResponse)
def admin_delete_user(
    user_id: int,
    admin: Annotated[CurrentUser, Depends(require_admin)],
) -> DeleteUserResponse:
    """Delete a user account (admin only).

    Guards:
    - 不能删除自己 (self_delete_forbidden)
    - 不能删除最后一个 admin (last_admin_forbidden)
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, role FROM auth.users WHERE id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        # 如果是 admin,要确保还剩至少一个 admin
        if row["role"] == "admin":
            cursor.execute(
                "SELECT COUNT(*) AS n FROM auth.users WHERE role = 'admin' AND status != 'suspended' AND id != %s",
                (user_id,),
            )
            remaining = cursor.fetchone()["n"]
            if remaining == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the last active admin account",
                )

        cursor.execute("DELETE FROM auth.users WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close()
        return DeleteUserResponse(status="ok", email=row["email"])
    finally:
        conn.close()


@router.post(
    "/admin/users/{user_id}/status",
    response_model=AdminUserActionResponse,
)
def admin_update_user_status(
    user_id: int,
    payload: UpdateUserStatusRequest,
    admin: Annotated[CurrentUser, Depends(require_admin)],
) -> AdminUserActionResponse:
    """Suspend or re-activate a user (admin only).

    Guards:
    - 不能禁用自己
    - 不能禁用最后一个活跃 admin
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change status of your own account",
        )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, role, status FROM auth.users WHERE id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        # 如果要把 admin 改成 suspended,要确认还有别的活跃 admin
        if row["role"] == "admin" and payload.status == "suspended":
            cursor.execute(
                "SELECT COUNT(*) AS n FROM auth.users WHERE role = 'admin' AND status != 'suspended' AND id != %s",
                (user_id,),
            )
            remaining = cursor.fetchone()["n"]
            if remaining == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot suspend the last active admin account",
                )

        cursor.execute(
            "UPDATE auth.users SET status = %s WHERE id = %s RETURNING id, email, display_name, organization, role, status, email_verified, created_at, last_login_at",
            (payload.status, user_id),
        )
        new_row = cursor.fetchone()
        conn.commit()
        cursor.close()
        return AdminUserActionResponse(user=_to_public(dict(new_row)))
    finally:
        conn.close()


@router.post(
    "/admin/users/{user_id}/resend-setup",
    response_model=AdminUserActionResponse,
)
def admin_resend_setup(
    user_id: int,
    admin: Annotated[CurrentUser, Depends(require_admin)],
) -> AdminUserActionResponse:
    """Generate a fresh set-password token for a user.

    Old tokens for this user are invalidated (marked used_at) so only the
    newest link is usable. Useful when the user lost the original email/link.
    """
    from ..auth_utils import FRONTEND_URL, PASSWORD_RESET_TTL_HOURS

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email FROM auth.users WHERE id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        # 让旧 token 全部失效(避免多个链接同时有效造成混淆)
        cursor.execute(
            "UPDATE auth.password_reset_tokens SET used_at = NOW() WHERE user_id = %s AND used_at IS NULL",
            (user_id,),
        )

        token = create_password_reset_token()
        store_password_reset_token(conn, user_id, token)
        set_password_url = f"{FRONTEND_URL.rstrip('/')}/set-password?token={token}"

        cursor.execute(
            "SELECT id, email, display_name, organization, role, status, email_verified, created_at, last_login_at FROM auth.users WHERE id = %s",
            (user_id,),
        )
        user_row = cursor.fetchone()
        conn.commit()
        cursor.close()
        return AdminUserActionResponse(
            user=_to_public(dict(user_row)),
            set_password_url=set_password_url,
            expires_in_hours=PASSWORD_RESET_TTL_HOURS,
        )
    finally:
        conn.close()