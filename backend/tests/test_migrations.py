"""Round-trip the Alembic migrations against a fresh Postgres."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def _alembic(*args, env=None):
    cwd = Path(__file__).resolve().parents[1]  # backend/
    full_env = {**os.environ, **(env or {})}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=cwd,
        env=full_env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_migration_upgrade_then_downgrade(postgres_container):
    # `postgres_container` fixture sets DATABASE_URL.
    up = _alembic("upgrade", "head")
    assert up.returncode == 0, up.stderr
    down = _alembic("downgrade", "base")
    assert down.returncode == 0, down.stderr
