"""Auth module — server-to-server credential checking.

The actual dependency lives in ``app.security``; re-exported here so callers
can import it from the module folder named in the Phase 6 layout.
"""

from ..security import require_service_token

__all__ = ["require_service_token"]
