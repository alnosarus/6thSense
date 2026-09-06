"""User model: role CHECK, email unique, is_active default."""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import User


@pytest.mark.asyncio
async def test_insert_user_with_valid_role(db_session):
    user = User(email="alex@x.com", name="Alex", role="founder", password_hash="x")
    db_session.add(user)
    await db_session.flush()
    fetched = (await db_session.execute(select(User))).scalar_one()
    assert fetched.email == "alex@x.com"
    assert fetched.is_active is True
    assert fetched.created_at is not None


@pytest.mark.asyncio
async def test_invalid_role_rejected(db_session):
    user = User(email="bad@x.com", name="X", role="operator", password_hash="x")
    db_session.add(user)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_email_unique(db_session):
    db_session.add(User(email="a@x.com", name="A", role="founder", password_hash="h"))
    await db_session.flush()
    db_session.add(User(email="a@x.com", name="B", role="customer", password_hash="h"))
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_ops_role_accepted(db_session):
    """The ops area holds wearer profiles, episode assignments and payment
    approvals, so it gets its own role instead of reusing `founder` --
    require_role() matches exactly, and a shared role could never be separated
    again. See migration 0008."""
    db_session.add(User(email="ops@6thsense.dev", name="6thSense Ops",
                        role="ops", password_hash="x"))
    await db_session.flush()
    fetched = (await db_session.execute(
        select(User).where(User.role == "ops"))).scalar_one()
    assert fetched.email == "ops@6thsense.dev"
    assert fetched.is_active is True
