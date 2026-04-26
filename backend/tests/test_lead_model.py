import pytest
from sqlalchemy import select

from app.models import Lead


def test_lead_table_columns():
    cols = {c.name: c for c in Lead.__table__.columns}
    assert set(cols) == {"id", "name", "email", "organization", "created_at", "updated_at"}
    assert cols["email"].unique is True
    assert cols["name"].nullable is False
    assert cols["organization"].nullable is False


def test_lead_email_index():
    indexes = {ix.name for ix in Lead.__table__.indexes}
    assert any("created_at" in ix for ix in indexes)


@pytest.mark.asyncio
async def test_insert_and_read_lead(db_session):
    db_session.add(Lead(name="A", email="a@x.com", organization="Acme"))
    await db_session.commit()
    rows = (await db_session.execute(select(Lead))).scalars().all()
    assert len(rows) == 1
    assert rows[0].email == "a@x.com"
