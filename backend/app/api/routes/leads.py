"""POST /api/leads — idempotent UPSERT keyed on email."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.schemas import LeadCreate, LeadResponse


router = APIRouter(prefix="/api", tags=["leads"])


# Postgres `xmax = 0` after INSERT ... ON CONFLICT DO UPDATE is the canonical
# "was this row newly inserted?" trick. Returns true on insert, false on update.
_UPSERT_SQL = text(
    """
    INSERT INTO leads (name, email, organization)
    VALUES (:name, :email, :organization)
    ON CONFLICT (email) DO UPDATE SET
        name         = EXCLUDED.name,
        organization = EXCLUDED.organization,
        updated_at   = now()
    RETURNING (xmax = 0) AS inserted
    """
)


@router.post("/leads", response_model=LeadResponse)
async def create_lead(
    payload: LeadCreate,
    session: AsyncSession = Depends(get_session),
) -> LeadResponse:
    result = await session.execute(
        _UPSERT_SQL,
        {
            "name": payload.name,
            "email": payload.email,
            "organization": payload.organization,
        },
    )
    inserted: bool = result.scalar_one()
    await session.commit()
    return LeadResponse(ok=True, created=inserted)
