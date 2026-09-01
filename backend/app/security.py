"""Server-to-server authentication.

Every AI Receptionist endpoint requires a shared-secret token in the
``X-Service-Token`` header, compared in constant time. The secret lives only
in the backend environment (``ADMIN_SERVICE_SECRET``) and the Next.js server
environment — it is never sent to a browser.
"""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException

from .config import get_settings


async def require_service_token(
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
) -> None:
    secret = get_settings().admin_service_secret
    if not secret:
        # Fail closed: a backend with no configured secret must not serve.
        raise HTTPException(status_code=503, detail="SERVICE_AUTH_NOT_CONFIGURED")
    if not x_service_token or not hmac.compare_digest(x_service_token, secret):
        raise HTTPException(status_code=401, detail="INVALID_SERVICE_TOKEN")
