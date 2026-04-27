import logging

from app.core.logging import PIIFilter, configure_logging


def test_pii_filter_drops_email_and_organization_extras():
    f = PIIFilter()
    record = logging.LogRecord(
        name="app.api.routes.leads",
        level=logging.INFO,
        pathname="p",
        lineno=1,
        msg="lead_captured",
        args=(),
        exc_info=None,
    )
    record.email = "a@x.com"
    record.organization = "Acme"
    record.lead_id = 7

    f.filter(record)

    assert not hasattr(record, "email")
    assert not hasattr(record, "organization")
    assert record.lead_id == 7  # safe field preserved


def test_pii_filter_does_not_touch_logrecord_name():
    """`name` is a reserved LogRecord attribute (the logger name).
    The filter MUST NOT delete it, even though some PII (a person's name)
    would naturally be called `name`. Callers must use a different key
    such as `person_name` if they need to log a name attribute."""
    f = PIIFilter()
    record = logging.LogRecord(
        name="app.api.routes.leads",
        level=logging.INFO,
        pathname="p",
        lineno=1,
        msg="something",
        args=(),
        exc_info=None,
    )

    f.filter(record)

    assert record.name == "app.api.routes.leads"


def test_configure_logging_attaches_filter():
    configure_logging()
    root = logging.getLogger()
    assert any(isinstance(f, PIIFilter) for f in root.filters)
