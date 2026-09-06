"""add the ops role

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-06

Adds 'ops' to users_role_check so the collector-operations account can exist.
The ops area holds wearer profiles, episode assignments and payment approvals.

WHY NOT REUSE `founder`
  auth_deps.require_role() matches the role string exactly. Putting ops behind
  `founder` would make every ops login a founder login permanently, and the two
  could never be separated afterwards without re-issuing credentials. A role is
  one CHECK constraint; an over-granted credential is forever.

WHAT THIS ROLE CAN REACH TODAY: NOTHING
  'ops' is deliberately absent from catalog_redact.CATALOG_ROLES, so
  app/api/routes/catalog.py:80 refuses it outright rather than letting
  access_level() fall through to 'preview'. Every grant is added deliberately in
  the application layer; this migration only makes the row insertable. Same
  division of labour as 0007.

WHY THIS MIGRATION DOES NOT SEED THE ACCOUNT
  Same reason 0007 does not: a migration that recreates a login on every
  `alembic upgrade head` silently undoes a revocation. Seeding is a CLI step --
  `python -m app.cli create-user --email ... --role ops`, which prompts for the
  password so it never reaches argv.

WHY DOWNGRADE FOLDS TO 'guest' AND NOT 'customer'
  0007 established the rule: a downgrade must not escalate a credential. 0007
  folds guest -> customer only because it deactivates the row in the same
  statement block. Here 'guest' is the narrowest surviving role, so it is the
  correct fold target -- folding an ops account to 'customer' would hand a
  payment-operations password FULL catalog access (catalog_redact.FULL_ROLES)
  if it were ever reactivated by hand. The row is deactivated and its sessions
  dropped first regardless, for the same reason 0007 does it.
"""
from alembic import op


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


# The role set on each side of this migration, in the order the constraint
# states them. Keep ROLES_AFTER in lockstep with app.models.user.ROLES.
ROLES_AFTER = ("admin", "founder", "customer", "investor", "guest", "ops")
ROLES_BEFORE = ("admin", "founder", "customer", "investor", "guest")

#: Where a deactivated ops row lands so the 0007-era CHECK can re-apply. The
#: narrowest role that survives this downgrade -- see the module docstring.
DOWNGRADE_FOLD_ROLE = "guest"


def _recreate_role_check(roles: tuple[str, ...]) -> None:
    """Drop and recreate users_role_check over exactly `roles`.

    DDL is idempotent (DROP ... IF EXISTS) so it is safe against a database
    built from ORM metadata as well as one migrated 0001 -> 0007, matching
    0006 and 0007's style.
    """
    literal = ", ".join(f"'{role}'" for role in roles)
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT users_role_check "
        f"CHECK (role IN ({literal}))"
    )


def upgrade() -> None:
    _recreate_role_check(ROLES_AFTER)


def downgrade() -> None:
    # 1. Revoke before demoting. An ops row is about to become a 'guest' row;
    #    it must not be able to authenticate as one.
    op.execute("UPDATE users SET is_active = false WHERE role = 'ops'")
    # 2. Drop live sessions so no already-issued cookie survives the role change.
    op.execute(
        "DELETE FROM sessions WHERE user_id IN "
        "(SELECT id FROM users WHERE role = 'ops')"
    )
    # 3. Only now fold the role, so the stricter check can re-apply.
    op.execute(
        f"UPDATE users SET role = '{DOWNGRADE_FOLD_ROLE}' WHERE role = 'ops'"
    )
    _recreate_role_check(ROLES_BEFORE)
