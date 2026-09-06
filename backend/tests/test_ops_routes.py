"""/api/ops/*: role gate, CSRF prefix, the approve-before-pay guard, and the
two kinds of delete."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.passwords import hash_password
from app.core.sessions import hash_session_token, mint_session_token
from app.main import create_app
from app.models import Episode, Session as SessionRow, User, Wearer


ORIGIN = "https://app.example"


@pytest_asyncio.fixture
async def app(db_session, monkeypatch):
    monkeypatch.setenv("SENSEPROBE_CORS_ORIGINS", ORIGIN)
    monkeypatch.setenv("SENSEPROBE_COOKIE_SECURE", "false")
    from app.core.limiter import limiter
    limiter.reset()
    return create_app()


async def _sid(db_session, role: str) -> str:
    user = User(email=f"{role}@ops.test", name=role, role=role,
                password_hash=hash_password("twelve-chars!!"))
    db_session.add(user)
    await db_session.commit()
    raw = mint_session_token()
    db_session.add(SessionRow(user_id=user.id, token_hash=hash_session_token(raw),
                              expires_at=datetime.now(timezone.utc) + timedelta(days=14)))
    await db_session.commit()
    return raw


async def _episode(db_session, recording="ego_test_0001", **kw) -> Episode:
    e = Episode(recording=recording, session="s", device_id="ABC123", **kw)
    db_session.add(e)
    await db_session.commit()
    return e


def _client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t")


# --- who may reach it ---------------------------------------------------------

@pytest.mark.parametrize("role", ["ops", "founder", "admin"])
@pytest.mark.asyncio
async def test_ops_area_open_to_ops_founder_admin(app, db_session, role):
    sid = await _sid(db_session, role)
    async with _client(app) as c:
        assert (await c.get("/api/ops/state", cookies={"sid": sid})).status_code == 200


@pytest.mark.parametrize("role", ["customer", "investor", "guest"])
@pytest.mark.asyncio
async def test_ops_area_closed_to_everyone_else(app, db_session, role):
    sid = await _sid(db_session, role)
    async with _client(app) as c:
        assert (await c.get("/api/ops/state", cookies={"sid": sid})).status_code == 403


@pytest.mark.asyncio
async def test_ops_area_needs_a_session(app):
    async with _client(app) as c:
        assert (await c.get("/api/ops/state")).status_code == 401


@pytest.mark.asyncio
async def test_writes_are_behind_the_origin_check(app, db_session):
    """A hard delete purges objects from a bucket that denies re-upload. One
    cross-site form post from a logged-in ops session must not reach it."""
    sid = await _sid(db_session, "ops")
    await _episode(db_session)
    async with _client(app) as c:
        no_origin = await c.post("/api/ops/episodes/ego_test_0001/delete",
                                 json={"kind": "hard"}, cookies={"sid": sid})
        wrong = await c.post("/api/ops/episodes/ego_test_0001/delete",
                             json={"kind": "hard"}, cookies={"sid": sid},
                             headers={"Origin": "https://evil.example"})
    assert no_origin.status_code == 403
    assert wrong.status_code == 403


# --- approve / pay ------------------------------------------------------------

@pytest.mark.asyncio
async def test_pay_refuses_an_unapproved_episode(app, db_session):
    sid = await _sid(db_session, "ops")
    await _episode(db_session)
    async with _client(app) as c:
        res = await c.post("/api/ops/episodes/ego_test_0001/pay",
                           json={"value": True, "amount_krw": 10320},
                           cookies={"sid": sid}, headers={"Origin": ORIGIN})
    assert res.status_code == 409

    async with _client(app) as c:
        await c.post("/api/ops/episodes/ego_test_0001/approve", json={"value": True},
                     cookies={"sid": sid}, headers={"Origin": ORIGIN})
        ok = await c.post("/api/ops/episodes/ego_test_0001/pay",
                          json={"value": True, "amount_krw": 10320},
                          cookies={"sid": sid}, headers={"Origin": ORIGIN})
    assert ok.status_code == 200
    row = next(e for e in ok.json()["episodes"] if e["recording"] == "ego_test_0001")
    assert row["paid"] is True and row["amount_krw"] == 10320


# --- assignment ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_assign_stores_the_wearer_on_the_episode(app, db_session):
    """Stored on the episode, not resolved through a device date range -- so a
    camera handed over mid-shift splits, and settled history never moves."""
    sid = await _sid(db_session, "ops")
    await _episode(db_session)
    db_session.add(Wearer(name="Wearer One"))
    await db_session.commit()
    wid = (await db_session.execute(__import__("sqlalchemy").select(Wearer.id))).scalar_one()
    async with _client(app) as c:
        res = await c.post("/api/ops/episodes/ego_test_0001/assign",
                           json={"wearer_id": wid}, cookies={"sid": sid},
                           headers={"Origin": ORIGIN})
        bad = await c.post("/api/ops/episodes/ego_test_0001/assign",
                           json={"wearer_id": 999999}, cookies={"sid": sid},
                           headers={"Origin": ORIGIN})
    assert res.status_code == 200
    assert next(e for e in res.json()["episodes"]
                if e["recording"] == "ego_test_0001")["wearer_id"] == wid
    assert bad.status_code == 404


# --- delete -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_soft_delete_keeps_the_row_and_restores(app, db_session):
    sid = await _sid(db_session, "ops")
    await _episode(db_session)
    async with _client(app) as c:
        d = await c.post("/api/ops/episodes/ego_test_0001/delete",
                         json={"kind": "soft", "reason": "duplicate"},
                         cookies={"sid": sid}, headers={"Origin": ORIGIN})
        row = next(e for e in d.json()["episodes"] if e["recording"] == "ego_test_0001")
        assert row["delete_kind"] == "soft" and row["deleted_at"]
        assert row["deleted_by"] == "ops@ops.test" and row["delete_reason"] == "duplicate"

        r = await c.post("/api/ops/episodes/ego_test_0001/restore",
                         cookies={"sid": sid}, headers={"Origin": ORIGIN})
    back = next(e for e in r.json()["episodes"] if e["recording"] == "ego_test_0001")
    assert back["deleted_at"] is None and back["delete_kind"] is None


@pytest.mark.asyncio
async def test_hard_delete_cannot_be_restored(app, db_session):
    """Clearing the flag would put a row back whose objects are gone from a
    bucket that refuses re-upload -- a ledger entry pointing at nothing."""
    sid = await _sid(db_session, "ops")
    await _episode(db_session)
    async with _client(app) as c:
        d = await c.post("/api/ops/episodes/ego_test_0001/delete",
                         json={"kind": "hard", "reason": "worthless"},
                         cookies={"sid": sid}, headers={"Origin": ORIGIN})
        assert d.json()["s3_purge"] == "not_implemented"
        r = await c.post("/api/ops/episodes/ego_test_0001/restore",
                         cookies={"sid": sid}, headers={"Origin": ORIGIN})
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_delete_kind_must_be_soft_or_hard(app, db_session):
    sid = await _sid(db_session, "ops")
    await _episode(db_session)
    async with _client(app) as c:
        res = await c.post("/api/ops/episodes/ego_test_0001/delete",
                           json={"kind": "purge"}, cookies={"sid": sid},
                           headers={"Origin": ORIGIN})
    assert res.status_code == 422


# --- import -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_import_merges_and_never_regenerates(app, db_session):
    """A re-import must not wipe decisions. The laptop ledger enforced this on
    itself and it is the one property this data cannot survive losing."""
    sid = await _sid(db_session, "ops")
    payload = {"episodes": {"ego_a": {"session": "s1", "device_id": "D1",
                                      "duration_s": 60, "bytes": 10},
                            "ego_b": {"session": "s1", "device_id": "D2"}},
               "payments": {"ego_a": {"paid": True, "amount": 0}}}
    async with _client(app) as c:
        first = await c.post("/api/ops/import", json=payload,
                             cookies={"sid": sid}, headers={"Origin": ORIGIN})
        assert first.json()["added"] == 2
        # A tick with amount 0 is carried VERBATIM -- inventing a rate here
        # would fabricate a payment record.
        a = next(e for e in first.json()["episodes"] if e["recording"] == "ego_a")
        assert a["paid"] is True and a["amount_krw"] == 0

        await c.post("/api/ops/episodes/ego_b/approve", json={"value": True},
                     cookies={"sid": sid}, headers={"Origin": ORIGIN})
        again = await c.post("/api/ops/import", json=payload,
                             cookies={"sid": sid}, headers={"Origin": ORIGIN})
    assert again.json()["added"] == 0
    b = next(e for e in again.json()["episodes"] if e["recording"] == "ego_b")
    assert b["approved"] is True
