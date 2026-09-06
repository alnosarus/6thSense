"""ops: task labels

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-07

Adds a controlled task vocabulary and hangs it off the episode.

WHY A TABLE AND NOT A TEXT COLUMN
  The whole value of the label is that takes of the same activity group. Free
  text delivers "folding", "Folding", "fold laundry" and "Garment Folding" as
  four labels for one activity inside a week, and no amount of later cleanup
  recovers which was meant.

WHY THESE THIRTEEN
  They are the exact category/task pairs already in use in the delivered takes
  catalog (vocabulary-takes_meta.json). A new vocabulary here would mean the
  same activity carries one name in the ops board and a different one in what a
  customer has already been shipped.

Guarded by an inspector for the same reason 0009 is: tests/test_seed_migration
builds its schema from ORM metadata and then replays the migrations.
"""
from alembic import op
import sqlalchemy as sa

from app.models.ops import SEED_TASKS


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def _insp():
    return sa.inspect(op.get_bind())


def upgrade() -> None:
    insp = _insp()
    if "ops_tasks" not in insp.get_table_names():
        op.create_table(
            "ops_tasks",
            sa.Column("id", sa.BigInteger, primary_key=True),
            sa.Column("name", sa.String(120), nullable=False, unique=True),
            sa.Column("category", sa.String(60), nullable=False, server_default="other"),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.func.now()),
        )
    insp = _insp()
    if "ops_tasks_category_idx" not in {i["name"] for i in insp.get_indexes("ops_tasks")}:
        op.create_index("ops_tasks_category_idx", "ops_tasks", ["category"])

    cols = {c["name"] for c in insp.get_columns("ops_episodes")}
    if "task_id" not in cols:
        op.add_column("ops_episodes", sa.Column("task_id", sa.BigInteger))
        op.create_foreign_key("ops_episodes_task_id_fkey", "ops_episodes", "ops_tasks",
                              ["task_id"], ["id"], ondelete="SET NULL")
    insp = _insp()
    if "ops_episodes_task_idx" not in {i["name"] for i in insp.get_indexes("ops_episodes")}:
        op.create_index("ops_episodes_task_idx", "ops_episodes", ["task_id"])

    # ON CONFLICT DO NOTHING: re-running must not duplicate, and must not stamp
    # on a category somebody has since corrected by hand.
    op.get_bind().execute(
        sa.text("INSERT INTO ops_tasks (name, category) VALUES (:name, :category) "
                "ON CONFLICT (name) DO NOTHING"),
        [{"name": name, "category": cat} for cat, name in SEED_TASKS],
    )


def downgrade() -> None:
    insp = _insp()
    if "task_id" in {c["name"] for c in insp.get_columns("ops_episodes")}:
        op.drop_column("ops_episodes", "task_id")
    if "ops_tasks" in insp.get_table_names():
        op.drop_table("ops_tasks")
