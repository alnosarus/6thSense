"""Environment-based settings (no secrets in repo)."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _parse_origins(raw: str) -> list[str]:
    return [x.strip() for x in raw.split(",") if x.strip()]


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str]


def get_settings() -> Settings:
    raw = os.environ.get(
        "SENSEPROBE_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173",
    )
    return Settings(cors_origins=_parse_origins(raw))
