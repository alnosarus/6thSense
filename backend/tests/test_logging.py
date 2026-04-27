import logging

from app.core.logging import PIIFilter, configure_logging


def test_pii_filter_drops_email_extras():
    f = PIIFilter()
    record = logging.LogRecord(
        name="x",
        level=logging.INFO,
        pathname="p",
        lineno=1,
        msg="lead_captured",
        args=(),
        exc_info=None,
    )
    record.email = "a@x.com"
    record.name = "Ada"
    record.organization = "Acme"
    record.lead_id = 7

    f.filter(record)

    assert not hasattr(record, "email")
    assert not hasattr(record, "organization")
    assert record.lead_id == 7  # safe field preserved
    # `name` collides with LogRecord.name; the filter MUST clear our payload
    # but MUST NOT clobber the standard logger name.
    assert record.name == "x"


def test_configure_logging_attaches_filter():
    configure_logging()
    root = logging.getLogger()
    assert any(isinstance(f, PIIFilter) for f in root.filters)
