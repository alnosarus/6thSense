"""Structured logging with a PII-safe filter."""

from __future__ import annotations

import logging
import sys

# Standard LogRecord attribute names we must NEVER clobber.
RESERVED_LOG_ATTRS = frozenset(
    logging.LogRecord("", 0, "", 0, "", None, None).__dict__.keys()
)
# Custom keys we treat as PII when set via `extra={...}`.
PII_KEYS = frozenset({"email", "organization"})  # `name` collides w/ LogRecord

# ---------------------------------------------------------------------------
# Patch LogRecord.__init__ at module import time so every record (including
# those created directly via `logging.LogRecord(...)`) carries a backup of
# its original logger-hierarchy name.  The PIIFilter uses this backup to
# restore `record.name` when a PII payload has overwritten it.
# ---------------------------------------------------------------------------
_orig_logrecord_init = logging.LogRecord.__init__


def _pii_safe_logrecord_init(
    self: logging.LogRecord,
    name: str,
    level: int,
    pathname: str,
    lineno: int,
    msg: object,
    args: object,
    exc_info: object,
    func: str | None = None,
    sinfo: str | None = None,
) -> None:
    _orig_logrecord_init(self, name, level, pathname, lineno, msg, args, exc_info, func, sinfo)
    # Store the canonical logger-hierarchy name before any `extra` keys can
    # overwrite it.  PIIFilter.filter() restores from this backup.
    object.__setattr__(self, "_pii_name_backup", self.name)


logging.LogRecord.__init__ = _pii_safe_logrecord_init  # type: ignore[method-assign]


class PIIFilter(logging.Filter):
    """Strip PII keys from a record's __dict__ before formatting.

    Also restores ``record.name`` (the logger-hierarchy name) if a PII
    payload accidentally overwrote it, using the ``_pii_name_backup``
    stored at record-creation time.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Remove explicit PII keys (non-reserved ones can be deleted safely).
        for key in PII_KEYS:
            if hasattr(record, key) and key not in RESERVED_LOG_ATTRS:
                delattr(record, key)

        # Restore the original logger name if it was clobbered by a payload.
        backup = record.__dict__.get("_pii_name_backup")
        if backup is not None and record.name != backup:
            record.name = backup

        return True


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    root.addFilter(PIIFilter())
