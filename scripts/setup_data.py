#!/usr/bin/env python3
"""
Bootstrap local raw data: locate the TUFFC (or other) zip and extract into data/raw/.

Idempotent: skips if data/raw/<dataset>/.extract_ok exists unless --force.

Resolution order for zip path:
  1. CLI --zip-path
  2. Env SENSEPROBE_DATA_ZIP
  3. data/incoming/*.zip (prefers name containing TUFFC, else largest)
  4. Repo root ./*.zip (legacy)

Usage:
  python scripts/setup_data.py
  python scripts/setup_data.py --zip-path /path/to/TUFFC_2022_Bi_Directional_elasto.zip
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.senseprobe_config import load_config  # noqa: E402

MARKER_NAME = ".extract_ok"


def find_zip_explicit(path: str) -> Path | None:
    p = Path(path).expanduser().resolve()
    return p if p.is_file() else None


def find_zip_incoming(incoming_dir: Path) -> Path | None:
    if not incoming_dir.is_dir():
        return None
    zips = sorted(incoming_dir.glob("*.zip"))
    if not zips:
        return None
    for z in zips:
        if "TUFFC" in z.name.upper():
            return z
    return max(zips, key=lambda p: p.stat().st_size)


def find_zip_repo_root(repo_root: Path) -> Path | None:
    zips = sorted(repo_root.glob("*.zip"))
    if not zips:
        return None
    for z in zips:
        if "TUFFC" in z.name.upper():
            return z
    return zips[0]


def resolve_zip_path(cli: str | None, incoming_dir: Path, repo_root: Path) -> Path:
    if cli:
        z = find_zip_explicit(cli)
        if z:
            return z
        print(f"ERROR: --zip-path does not exist: {cli}", file=sys.stderr)
        sys.exit(1)

    env = os.environ.get("SENSEPROBE_DATA_ZIP")
    if env:
        z = find_zip_explicit(env)
        if z:
            return z
        print(f"ERROR: SENSEPROBE_DATA_ZIP does not exist: {env}", file=sys.stderr)
        sys.exit(1)

    z = find_zip_incoming(incoming_dir)
    if z:
        return z

    z = find_zip_repo_root(repo_root)
    if z:
        return z

    print(
        "No zip found. Do one of:\n"
        f"  • Place archive in {incoming_dir}/ (mkdir -p .../incoming)\n"
        "  • export SENSEPROBE_DATA_ZIP=/absolute/path/to/archive.zip\n"
        "  • python scripts/setup_data.py --zip-path /path/to/archive.zip\n",
        file=sys.stderr,
    )
    sys.exit(1)


def extract_zip(zip_path: Path, dest_dir: Path, force: bool) -> None:
    marker = dest_dir / MARKER_NAME
    if marker.exists() and not force:
        print(f"Already extracted (marker {marker}). Use --force to re-extract.")
        return

    if dest_dir.exists() and force:
        # Only remove marker; leave tree for user safety — they can rm -rf manually
        if marker.is_file():
            marker.unlink()

    dest_dir.mkdir(parents=True, exist_ok=True)

    print(f"Extracting {zip_path} → {dest_dir} (this may take a long time for ~30GB)…")

    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            zf.extract(member, path=dest_dir)

    meta = {
        "zip_path": str(zip_path),
        "extracted_to": str(dest_dir),
        "slug": dest_dir.name,
    }
    marker.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Done. Wrote {marker}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract large dataset zip into data/raw/")
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Dataset id from config (default: defaults.dataset); sets raw_slug unless --slug set",
    )
    parser.add_argument("--zip-path", type=str, default=None, help="Path to .zip archive")
    parser.add_argument(
        "--slug",
        type=str,
        default=None,
        help="Subdirectory under <data_root>/raw/ (default: dataset raw_slug from config)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-extract even if .extract_ok exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print which zip would be used",
    )
    args = parser.parse_args()

    cfg = load_config()
    ds = cfg.dataset(args.dataset)
    slug = args.slug or ds.raw_slug
    data_incoming = cfg.data_root / "incoming"
    data_raw = cfg.data_root / "raw"

    zip_path = resolve_zip_path(args.zip_path, data_incoming, REPO_ROOT)
    dest = data_raw / slug

    if args.dry_run:
        print(f"Would use zip: {zip_path}")
        print(f"Would extract to: {dest}")
        return

    extract_zip(zip_path, dest, args.force)


if __name__ == "__main__":
    main()
