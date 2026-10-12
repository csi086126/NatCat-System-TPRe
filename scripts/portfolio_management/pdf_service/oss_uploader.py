"""
阿里云 OSS 上传器。
凭证全部从环境变量读(.env):
  OSS_ACCESS_KEY_ID
  OSS_ACCESS_KEY_SECRET
  OSS_BUCKET_NAME
  OSS_ENDPOINT
  OSS_SIGNED_URL_TTL_HOURS  (默认 24)

对象 key 命名:
  reports/{YYYY}/{MM}/{user_id}/{report_type}_{report_id}.pdf
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import oss2

logger = logging.getLogger(__name__)

_BUCKET_NAME = os.getenv('OSS_BUCKET_NAME', '')
_ENDPOINT = os.getenv('OSS_ENDPOINT', '')
_ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID', '')
_ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET', '')
_TTL_HOURS = int(os.getenv('OSS_SIGNED_URL_TTL_HOURS', '24'))


def is_configured() -> bool:
    """OSS 是否配置完整(凭证 + 桶 + endpoint)。"""
    return bool(_BUCKET_NAME and _ENDPOINT and _ACCESS_KEY_ID and _ACCESS_KEY_SECRET)


def build_object_key(user_id: int, report_type: str, report_id: int) -> str:
    """生成 OSS 对象 key:reports/2026/08/1/point_42.pdf"""
    now = datetime.now(timezone.utc)
    return f'reports/{now.year:04d}/{now.month:02d}/{user_id}/{report_type}_{report_id}.pdf'


def upload_pdf(object_key: str, pdf_bytes: bytes, content_disposition: Optional[str] = None) -> str:
    """
    上传 PDF 二进制到 OSS,返回 ETag。

    Raises:
        oss2.exceptions.OssError: 上传失败(凭证错/桶不存在/网络问题)
    """
    if not is_configured():
        raise RuntimeError(
            'OSS not configured. Set OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / '
            'OSS_BUCKET_NAME / OSS_ENDPOINT in .env'
        )
    auth = oss2.Auth(_ACCESS_KEY_ID, _ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, _ENDPOINT, _BUCKET_NAME)
    headers = {}
    if content_disposition:
        headers['Content-Disposition'] = content_disposition
    result = bucket.put_object(object_key, pdf_bytes, headers=headers)
    logger.info(f'OSS upload OK key={object_key} etag={result.etag} size={len(pdf_bytes)}')
    return result.etag


def generate_signed_url(object_key: str, filename: str) -> tuple[str, datetime]:
    """
    生成签名 URL(浏览器直接访问触发下载)。
    返回 (url, expires_at_utc)。
    """
    if not is_configured():
        raise RuntimeError('OSS not configured')
    auth = oss2.Auth(_ACCESS_KEY_ID, _ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, _ENDPOINT, _BUCKET_NAME)
    # Content-Disposition 强制浏览器下载,而不是预览
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_TTL_HOURS)
    params = {
        'response-content-disposition': f'attachment; filename="{filename}"',
        'response-cache-control': 'no-cache',
    }
    url = bucket.sign_url('GET', object_key, _TTL_HOURS * 3600, params=params)
    return url, expires_at


def generate_view_url(object_key: str) -> tuple[str, datetime]:
    """生成浏览器内嵌预览 URL(Content-Disposition: inline)。"""
    if not is_configured():
        raise RuntimeError('OSS not configured')
    auth = oss2.Auth(_ACCESS_KEY_ID, _ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, _ENDPOINT, _BUCKET_NAME)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_TTL_HOURS)
    params = {'response-content-disposition': 'inline'}
    url = bucket.sign_url('GET', object_key, _TTL_HOURS * 3600, params=params)
    return url, expires_at