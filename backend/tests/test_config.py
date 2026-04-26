import os
from app.core.config import get_settings


def test_settings_reads_database_url(monkeypatch):
    get_settings.cache_clear() if hasattr(get_settings, "cache_clear") else None
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h:5432/db")
    monkeypatch.setenv("SENSEPROBE_CORS_ORIGINS", "https://example.com")
    s = get_settings()
    assert s.database_url == "postgresql://u:p@h:5432/db"
    assert s.cors_origins == ["https://example.com"]
    assert s.rate_limit == "5/minute"


def test_settings_rate_limit_override(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h/d")
    monkeypatch.setenv("SENSEPROBE_RATE_LIMIT", "20/minute")
    s = get_settings()
    assert s.rate_limit == "20/minute"


def test_settings_missing_database_url_raises(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    import pytest
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_settings()
