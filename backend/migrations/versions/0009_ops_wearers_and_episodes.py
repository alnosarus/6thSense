"""ops: wearers and episodes

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-06

Moves the collector ledger off a JSON file on one laptop and into Postgres.
See app/models/ops.py for why a wearer is not a user and why the episode
carries its own wearer_id instead of being attributed through a date range.

WHY THE DDL IS GUARDED BY AN INSPECTOR
  This migration must be safe against a database built from ORM METADATA as
  well as one migrated 0001 -> 0008 -- the same property 0007 spells out for
  its CHECK swap. tests/test_seed_migration.py runs Base.metadata.create_all()
  and then stamps alembic_version back to 0002, so `alembic upgrade head`
  arrives here to find ops_wearers already present. A bare create_table() fails
  that fixture with DuplicateTableError, which reads as "the seed migration is
  broken" and has nothing to do with seeding.
"""
from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def _existing_tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _existing_indexes(table: str) -> set[str]:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return set()
    return {i["name"] for i in insp.get_indexes(table)}


def _create_index_if_absent(name: str, table: str, cols: list[str]) -> None:
    if name not in _existing_indexes(table):
        op.create_index(name, table, cols)


def upgrade() -> None:
    tables = _existing_tables()

    if "ops_wearers" not in tables:
        op.create_table(
            "ops_wearers",
            sa.Column("id", sa.BigInteger, primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("contact", sa.String(320), nullable=False, server_default=""),
            sa.Column("note", sa.Text, nullable=False, server_default=""),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.func.now()),
        )
    _create_index_if_absent("ops_wearers_name_idx", "ops_wearers", ["name"])

    if "ops_episodes" not in tables:
        op.create_table(
            "ops_episodes",
            sa.Column("id", sa.BigInteger, primary_key=True),
            sa.Column("recording", sa.String(200), nullable=False, unique=True),
            sa.Column("session", sa.String(200), nullable=False, server_default=""),
            sa.Column("device_id", sa.String(32), nullable=False, server_default=""),
            sa.Column("prefix", sa.Text, nullable=False, server_default=""),
            sa.Column("started_at", sa.DateTime(timezone=True)),
            sa.Column("duration_s", sa.Float, nullable=False, server_default="0"),
            sa.Column("size_bytes", sa.BigInteger, nullable=False, server_default="0"),
            sa.Column("files", sa.Integer, nullable=False, server_default="0"),
            sa.Column("frames", sa.Integer, nullable=False, server_default="0"),
            sa.Column("dropped", sa.Integer, nullable=False, server_default="0"),
            sa.Column("complete", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("truncated", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("clock_source", sa.String(16), nullable=False, server_default=""),
            sa.Column("fw", sa.String(32), nullable=False, server_default=""),
            sa.Column("no_metadata", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("wearer_id", sa.BigInteger,
                      sa.ForeignKey("ops_wearers.id", ondelete="SET NULL")),
            sa.Column("approved", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("approved_at", sa.DateTime(timezone=True)),
            sa.Column("paid", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("paid_at", sa.DateTime(timezone=True)),
            sa.Column("amount_krw", sa.Integer, nullable=False, server_default="0"),
            sa.Column("deleted_at", sa.DateTime(timezone=True)),
            sa.Column("delete_kind", sa.String(8)),
            sa.Column("deleted_by", sa.String(320), nullable=False, server_default=""),
            sa.Column("delete_reason", sa.Text, nullable=False, server_default=""),
            sa.Column("note", sa.Text, nullable=False, server_default=""),
            sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.func.now()),
            sa.CheckConstraint("delete_kind IS NULL OR delete_kind IN ('soft', 'hard')",
                               name="ops_episodes_delete_kind_check"),
            sa.CheckConstraint("(deleted_at IS NULL) = (delete_kind IS NULL)",
                               name="ops_episodes_delete_pair_check"),
        )
    _create_index_if_absent("ops_episodes_session_idx", "ops_episodes", ["session"])
    _create_index_if_absent("ops_episodes_wearer_idx", "ops_episodes", ["wearer_id"])
    _create_index_if_absent("ops_episodes_started_idx", "ops_episodes", ["started_at"])


def downgrade() -> None:
    # Symmetric with the guarded upgrade: a downgrade run against a database
    # that never had these tables must not fail either.
    tables = _existing_tables()
    if "ops_episodes" in tables:
        op.drop_table("ops_episodes")
    if "ops_wearers" in tables:
        op.drop_table("ops_wearers")
