"""Presigned playback URLs for episodes in the capture bucket.

PRESIGNED, NOT PROXIED, and that is the whole design. A Korea take is 4 GB of
30-second H.265 segments; streaming it through this process would pull every
byte across the server twice to show ten seconds of it. A presigned URL lets the
browser talk to S3 directly, so its Range requests fetch only what is actually
played and seeking costs a few hundred KB.

Signed on demand and never stored: the URL expires, and a stale one cached in
the episodes table would be worse than none.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass


logger = logging.getLogger(__name__)

#: Extensions a browser has any chance of playing. The camera writes h265 in an
#: mp4; whether a given browser decodes it is a separate question the UI answers.
PLAYABLE = (".mp4", ".mov", ".m4v", ".webm")


class OpsS3Unavailable(RuntimeError):
    """Raised when playback cannot be offered, with a reason worth showing."""


@dataclass(frozen=True)
class OpsS3Settings:
    bucket: str
    region: str
    access_key_id: str
    secret_access_key: str
    presign_ttl: int

    @property
    def half_configured(self) -> bool:
        return bool(self.access_key_id) != bool(self.secret_access_key)


def get_settings() -> OpsS3Settings:
    return OpsS3Settings(
        bucket=os.environ.get("OPS_S3_BUCKET", "6thsense-raw"),
        region=os.environ.get("OPS_S3_REGION", "us-west-2"),
        access_key_id=os.environ.get("OPS_AWS_ACCESS_KEY_ID", ""),
        secret_access_key=os.environ.get("OPS_AWS_SECRET_ACCESS_KEY", ""),
        presign_ttl=int(os.environ.get("OPS_PRESIGN_TTL", "900")),
    )


def _client(cfg: OpsS3Settings):
    try:
        import boto3
    except ImportError as exc:  # pragma: no cover - packaging error
        raise OpsS3Unavailable("boto3 is not installed") from exc
    if cfg.half_configured:
        # The default chain would sign these with whatever AWS_* key happens to
        # be in the environment -- including a camera's upload key. Refuse, the
        # same way catalog_store does, rather than sign with the wrong identity.
        raise OpsS3Unavailable(
            "exactly one of OPS_AWS_ACCESS_KEY_ID / OPS_AWS_SECRET_ACCESS_KEY is "
            "set; refusing to fall back to the ambient AWS credential chain")
    if cfg.access_key_id:
        session = boto3.session.Session(
            aws_access_key_id=cfg.access_key_id,
            aws_secret_access_key=cfg.secret_access_key,
            region_name=cfg.region)
    else:
        session = boto3.session.Session(region_name=cfg.region)
        logger.warning("ops_s3_default_credential_chain",
                       extra={"ops_bucket": cfg.bucket})
    return session.client("s3", region_name=cfg.region)


def episode_files(prefix: str) -> list[dict]:
    """Playable objects under one episode prefix, each with a presigned URL."""
    if not prefix:
        raise OpsS3Unavailable(
            "this episode has no S3 prefix recorded, so there is nothing to list")
    cfg = get_settings()
    s3 = _client(cfg)
    out: list[dict] = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=cfg.bucket, Prefix=prefix.rstrip("/") + "/"):
        for obj in page.get("Contents", []):
            name = obj["Key"].rsplit("/", 1)[-1]
            if not name.lower().endswith(PLAYABLE):
                continue
            out.append({
                "name": name,
                "bytes": obj.get("Size", 0),
                "url": s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": cfg.bucket, "Key": obj["Key"]},
                    ExpiresIn=cfg.presign_ttl),
            })
    out.sort(key=lambda f: f["name"])
    return out
