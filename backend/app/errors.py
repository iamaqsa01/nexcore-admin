from __future__ import annotations

from typing import Any


class AuthorizationError(Exception):
    """Raised by the AI Receptionist authorization flow.

    `code` is a stable machine-readable string and is what the HTTP layer puts
    in the response `detail` (matching the Phase 6 spec's contract), so callers
    can branch on it: CLIENT_NOT_FOUND, SUBSCRIPTION_INACTIVE, CLIENT_SUSPENDED,
    QUOTA_EXCEEDED.
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(f"{code}: {message}")
        self.status_code = status_code
        self.code = code
        self.message = message
        self.context: dict[str, Any] = context or {}

    def to_payload(self) -> dict[str, Any]:
        return {
            "detail": self.code,
            "code": self.code,
            "message": self.message,
            "context": self.context,
        }


# --- canonical blocking reasons -----------------------------------------

def client_not_found(client_id: str) -> AuthorizationError:
    return AuthorizationError(
        404, "CLIENT_NOT_FOUND", f"No client for identifier {client_id!r}",
        {"client_id": client_id},
    )


def subscription_inactive(reason: str, context: dict[str, Any] | None = None) -> AuthorizationError:
    return AuthorizationError(403, "SUBSCRIPTION_INACTIVE", reason, context)


def client_suspended(status_value: str) -> AuthorizationError:
    return AuthorizationError(
        403, "CLIENT_SUSPENDED",
        f"Client status is {status_value}; new AI Receptionist sessions are blocked",
        {"client_status": status_value},
    )


def quota_exceeded(reason: str, context: dict[str, Any] | None = None) -> AuthorizationError:
    return AuthorizationError(403, "QUOTA_EXCEEDED", reason, context)
