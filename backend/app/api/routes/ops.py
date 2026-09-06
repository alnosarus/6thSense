"""/api/ops/* — the collector operations area.

Gated on `ops` OR `founder`/`admin`. require_role() takes one role, so the check
is spelled out here rather than stacking three dependencies: a founder locked
out of the payment ledger of their own company is a support call, not security.

WHAT THIS DOES NOT DO
  It does not recompute the automatic quality verdict. `complete`, `truncated`,
  `dropped` and `clock_source` come off the recording's own metadata at scan
  time and are reported as found. Whether an episode is PAYABLE is a separate,
  human decision (`approved`) — deriving payment from a quality heuristic is how
  a collector stops being paid for a shoot that went fine.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_deps import current_user
from app.core.db import get_session
from app.core.ops_s3 import OpsS3Unavailable, episode_files
from app.models import Episode, User, Wearer


router = APIRouter(prefix="/api/ops", tags=["ops"])

#: Roles that may reach the ops area at all.
OPS_ROLES = frozenset({"ops", "founder", "admin"})


async def require_ops(user: User = Depends(current_user)) -> User:
    if user.role not in OPS_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
    return user


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --- serialisation ------------------------------------------------------------

def _wearer_json(w: Wearer) -> dict:
    return {"id": w.id, "name": w.name, "contact": w.contact, "note": w.note,
            "is_active": w.is_active}


def _episode_json(e: Episode) -> dict:
    return {
        "id": e.id, "recording": e.recording, "session": e.session,
        "device_id": e.device_id, "prefix": e.prefix,
        "started_at": e.started_at.isoformat() if e.started_at else None,
        "duration_s": e.duration_s, "minutes": round((e.duration_s or 0) / 60.0, 1),
        "size_bytes": e.size_bytes, "size_mb": round((e.size_bytes or 0) / 1e6, 1),
        "files": e.files, "frames": e.frames, "dropped": e.dropped,
        "complete": e.complete, "truncated": e.truncated,
        "clock_source": e.clock_source, "clock_ok": e.clock_source == "ntp",
        "fw": e.fw, "no_metadata": e.no_metadata,
        "wearer_id": e.wearer_id,
        "approved": e.approved,
        "approved_at": e.approved_at.isoformat() if e.approved_at else None,
        "paid": e.paid, "paid_at": e.paid_at.isoformat() if e.paid_at else None,
        "amount_krw": e.amount_krw,
        "deleted_at": e.deleted_at.isoformat() if e.deleted_at else None,
        "delete_kind": e.delete_kind, "deleted_by": e.deleted_by,
        "delete_reason": e.delete_reason, "note": e.note,
    }


async def _state(db: AsyncSession) -> dict:
    eps = (await db.execute(
        select(Episode).order_by(Episode.started_at.desc().nullslast(),
                                 Episode.recording.desc()))).scalars().all()
    wearers = (await db.execute(
        select(Wearer).order_by(Wearer.name))).scalars().all()
    live = [e for e in eps if e.deleted_at is None]
    return {
        "episodes": [_episode_json(e) for e in eps],
        "wearers": [_wearer_json(w) for w in wearers],
        "totals": {
            "episodes": len(live),
            "deleted": len(eps) - len(live),
            "minutes": round(sum((e.duration_s or 0) for e in live) / 60.0, 1),
            "bytes": sum((e.size_bytes or 0) for e in live),
            "approved": sum(1 for e in live if e.approved),
            "paid": sum(1 for e in live if e.paid),
            "unassigned": sum(1 for e in live if e.wearer_id is None),
            "clock_flagged": sum(1 for e in live if e.clock_source != "ntp"),
        },
    }


@router.get("/state")
async def get_state(_: User = Depends(require_ops),
                    db: AsyncSession = Depends(get_session)) -> dict:
    return await _state(db)


# --- wearers ------------------------------------------------------------------

class WearerIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    contact: str = Field(default="", max_length=320)
    note: str = ""


@router.post("/wearers")
async def create_wearer(body: WearerIn, _: User = Depends(require_ops),
                        db: AsyncSession = Depends(get_session)) -> dict:
    db.add(Wearer(name=body.name.strip(), contact=body.contact.strip(),
                  note=body.note.strip()))
    await db.commit()
    return await _state(db)


# --- per-episode actions ------------------------------------------------------

async def _episode_or_404(db: AsyncSession, recording: str) -> Episode:
    e = (await db.execute(
        select(Episode).where(Episode.recording == recording))).scalar_one_or_none()
    if e is None:
        raise HTTPException(status_code=404, detail="Unknown recording.")
    return e


class AssignIn(BaseModel):
    wearer_id: int | None = None


@router.post("/episodes/{recording}/assign")
async def assign_episode(recording: str, body: AssignIn,
                         _: User = Depends(require_ops),
                         db: AsyncSession = Depends(get_session)) -> dict:
    e = await _episode_or_404(db, recording)
    if body.wearer_id is not None:
        exists = (await db.execute(
            select(func.count()).select_from(Wearer)
            .where(Wearer.id == body.wearer_id))).scalar_one()
        if not exists:
            raise HTTPException(status_code=404, detail="Unknown wearer.")
    e.wearer_id = body.wearer_id
    await db.commit()
    return await _state(db)


class FlagIn(BaseModel):
    value: bool


@router.post("/episodes/{recording}/approve")
async def approve_episode(recording: str, body: FlagIn,
                          _: User = Depends(require_ops),
                          db: AsyncSession = Depends(get_session)) -> dict:
    e = await _episode_or_404(db, recording)
    e.approved = body.value
    e.approved_at = _now() if body.value else None
    await db.commit()
    return await _state(db)


class PayIn(BaseModel):
    value: bool
    amount_krw: int = 0


@router.post("/episodes/{recording}/pay")
async def pay_episode(recording: str, body: PayIn,
                      _: User = Depends(require_ops),
                      db: AsyncSession = Depends(get_session)) -> dict:
    e = await _episode_or_404(db, recording)
    # Paying an unapproved episode is almost always a misclick on the wrong row.
    if body.value and not e.approved:
        raise HTTPException(status_code=409, detail="Approve the episode first.")
    e.paid = body.value
    e.paid_at = _now() if body.value else None
    e.amount_krw = int(body.amount_krw or 0) if body.value else 0
    await db.commit()
    return await _state(db)


class DeleteIn(BaseModel):
    kind: str
    reason: str = ""


@router.post("/episodes/{recording}/delete")
async def delete_episode(recording: str, body: DeleteIn,
                         user: User = Depends(require_ops),
                         db: AsyncSession = Depends(get_session)) -> dict:
    """Soft hides the row; hard ALSO purges the S3 objects.

    The row survives either way. An episode that was paid for and then purged is
    exactly what a payment ledger still has to account for, and the raw bucket
    denies deletes to its uploaders, so a purge cannot be undone by re-uploading.

    NOTE: the S3 side of `hard` is not wired up yet — this records the intent and
    marks the row. It deliberately does not report bytes as freed that are still
    sitting in the bucket.
    """
    if body.kind not in ("soft", "hard"):
        raise HTTPException(status_code=422, detail="kind must be 'soft' or 'hard'.")
    e = await _episode_or_404(db, recording)
    e.deleted_at, e.delete_kind = _now(), body.kind
    e.deleted_by, e.delete_reason = user.email, body.reason.strip()
    await db.commit()
    out = await _state(db)
    out["s3_purge"] = "not_implemented" if body.kind == "hard" else None
    return out


@router.post("/episodes/{recording}/restore")
async def restore_episode(recording: str, _: User = Depends(require_ops),
                          db: AsyncSession = Depends(get_session)) -> dict:
    """Undo a delete. Only honest for `soft` — a hard delete's bytes are gone."""
    e = await _episode_or_404(db, recording)
    if e.delete_kind == "hard":
        raise HTTPException(
            status_code=409,
            detail="This episode was hard-deleted; its objects are gone from the "
                   "bucket and cannot be restored by clearing the flag.")
    e.deleted_at = e.delete_kind = None
    e.deleted_by = e.delete_reason = ""
    await db.commit()
    return await _state(db)


# --- playback ------------------------------------------------------------------

@router.get("/episodes/{recording}/files")
async def list_episode_files(recording: str, _: User = Depends(require_ops),
                             db: AsyncSession = Depends(get_session)) -> dict:
    """Presigned URLs for whatever in this episode a browser could play.

    GET, not POST, and therefore outside the Origin check -- it is a read, and
    the session cookie still gates it. The URLs it hands back are short-lived by
    construction (OPS_PRESIGN_TTL, 15 minutes) precisely because they leave the
    building.
    """
    e = await _episode_or_404(db, recording)
    try:
        files = episode_files(e.prefix)
    except OpsS3Unavailable as exc:
        # A configuration problem is not a 500: the operator can read this and
        # fix it, and the rest of the board still works without playback.
        return {"ok": False, "error": str(exc), "files": []}
    except Exception as exc:  # noqa: BLE001 - surface the reason, never a stack
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"[:300], "files": []}
    return {"ok": True, "recording": recording, "files": files}


# --- import from the laptop ledger -------------------------------------------

class ImportIn(BaseModel):
    #: The `episodes` map out of ~/.egocam-ledger/*.json, plus its `payments`.
    episodes: dict = Field(default_factory=dict)
    payments: dict = Field(default_factory=dict)


@router.post("/import")
async def import_ledger(body: ImportIn, _: User = Depends(require_ops),
                        db: AsyncSession = Depends(get_session)) -> dict:
    """Merge the laptop ledger in. NEVER regenerates.

    Same rule the JSON tool enforced on itself: a re-import adds episodes it has
    not seen and leaves every decision already recorded here alone. Rebuilding
    the table from the source would wipe approvals and payments, which is the
    one thing this data cannot survive.
    """
    known = {r for (r,) in (await db.execute(select(Episode.recording))).all()}
    added = 0
    for rec, ep in (body.episodes or {}).items():
        if rec in known:
            continue
        started = None
        raw = (ep or {}).get("start") or ""
        if raw:
            try:
                started = datetime.fromisoformat(raw)
            except ValueError:
                started = None
        pay = (body.payments or {}).get(rec) or {}
        db.add(Episode(
            recording=rec,
            session=str(ep.get("session") or ""),
            device_id=str(ep.get("device_id") or ""),
            prefix=str(ep.get("prefix") or ""),
            started_at=started,
            duration_s=float(ep.get("duration_s") or 0),
            size_bytes=int(ep.get("bytes") or 0),
            files=int(ep.get("files") or 0),
            frames=int(ep.get("frames") or 0),
            dropped=int(ep.get("dropped") or 0),
            complete=bool(ep.get("complete")),
            truncated=bool(ep.get("truncated")),
            clock_source=str(ep.get("clock_source") or ""),
            fw=str(ep.get("fw") or ""),
            no_metadata=bool(ep.get("no_metadata")),
            # A tick in the old file means somebody was paid. Carry it, and carry
            # its amount verbatim -- including 0, which is what the old ledger
            # stored before a rate was set. Inventing a rate here would fabricate
            # a payment record.
            paid=bool(pay.get("paid")),
            amount_krw=int(pay.get("amount") or 0),
            approved=bool(pay.get("paid")),
        ))
        added += 1
    await db.commit()
    out = await _state(db)
    out["added"] = added
    return out
