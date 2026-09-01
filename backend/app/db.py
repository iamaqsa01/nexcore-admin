"""Async database engine / session factory.

Lazily built so the module can be imported in unit tests without a database
(and without asyncpg installed). Nothing here is created until the first
request actually needs a session.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import get_settings

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def normalise_database_url(url: str) -> str:
    """Accept a Prisma-style URL and return one the asyncpg driver accepts.

    - ``postgresql://`` / ``postgres://``  ->  ``postgresql+asyncpg://``
    - drop the Prisma-only ``?schema=`` query parameter (asyncpg rejects it;
      use ``search_path`` via ``connect_args`` instead if you need it).
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgresql", "postgres"):
        scheme = "postgresql+asyncpg"
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "schema"]
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not configured")
        _engine = create_async_engine(
            normalise_database_url(settings.database_url),
            pool_pre_ping=True,
        )
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one AsyncSession per request."""
    async with get_sessionmaker()() as session:
        yield session
