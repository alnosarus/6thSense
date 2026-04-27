"""Structured logging with a PII-safe filter."""

from __future__ import annotations

import logging
import sys

# Standard LogRecord attribute names we must NEVER clobber.
RESERVED_LOG_ATTRS = frozenset(
    logging.LogRecord("", 0, "", 0, "", None, None).__dict__.keys()
)
# Custom keys we treat as PII when set via `extra={...}`.
# `name` is omitted because it collides with LogRecord.name (the logger
# name); callers logging a person's name must use a different key.
PII_KEYS = frozenset({"email", "organization"})


class PIIFilter(logging.Filter):
    """Strip PII keys from a record's __dict__ before formatting."""

    def filter(self, record: logging.LogRecord) -> bool:
        for key in PII_KEYS:
            if hasattr(record, key) and key not in RESERVED_LOG_ATTRS:
                delattr(record, key)
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
