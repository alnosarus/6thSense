from app.core.db import _to_asyncpg_url


def test_postgresql_url_translated_to_asyncpg():
    assert (
        _to_asyncpg_url("postgresql://u:p@h:5432/db")
        == "postgresql+asyncpg://u:p@h:5432/db"
    )


def test_already_asyncpg_url_passes_through():
    url = "postgresql+asyncpg://u:p@h:5432/db"
    assert _to_asyncpg_url(url) == url


def test_postgres_alias_normalised():
    # Some providers emit `postgres://` (no `ql`); SQLAlchemy rejects it.
    assert (
        _to_asyncpg_url("postgres://u:p@h/d")
        == "postgresql+asyncpg://u:p@h/d"
    )


def test_query_params_preserved():
    assert (
        _to_asyncpg_url(
            "postgresql://u:p@h/d?sslmode=require&application_name=test"
        )
        == "postgresql+asyncpg://u:p@h/d?sslmode=require&application_name=test"
    )
