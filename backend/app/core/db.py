"""Async SQLAlchemy engine + session factory."""

from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def _to_asyncpg_url(url: str) -> str:
    """Normalise to SQLAlchemy's async dialect.

    Railway / Heroku-style URLs come in as `postgres://...` or
    `postgresql://...`; SQLAlchemy async needs `postgresql+asyncpg://...`.
    """
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    return url


def _make_engine():
    settings = get_settings()
    return create_async_engine(
        _to_asyncpg_url(settings.database_url),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
    )


# Module-level singletons are safe here: uvicorn runs one process per worker
# with a single event loop; there is no inter-thread race in async route code.
_engine = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _make_engine()
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: yields one session per request."""
    async with get_sessionmaker()() as session:
        yield session
