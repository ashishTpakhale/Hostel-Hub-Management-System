"""add issue status history

Revision ID: f6a101issue001
Revises: e5a101nc0001
"""
from alembic import op
import sqlalchemy as sa
revision = "f6a101issue001"
down_revision = "e5a101nc0001"
branch_labels = None
depends_on = None
def upgrade():
    op.create_table("issue_status_history", sa.Column("id", sa.Integer(), nullable=False), sa.Column("issue_id", sa.Integer(), nullable=False), sa.Column("status", sa.String(length=20), nullable=False), sa.Column("changed_by", sa.Integer(), nullable=True), sa.Column("changed_at", sa.DateTime(), nullable=False), sa.ForeignKeyConstraint(["changed_by"], ["user.id"]), sa.ForeignKeyConstraint(["issue_id"], ["issue.id"]), sa.PrimaryKeyConstraint("id"))
    with op.batch_alter_table("issue_status_history") as batch_op: batch_op.create_index(batch_op.f("ix_issue_status_history_issue_id"), ["issue_id"], unique=False)
def downgrade():
    with op.batch_alter_table("issue_status_history") as batch_op: batch_op.drop_index(batch_op.f("ix_issue_status_history_issue_id"))
    op.drop_table("issue_status_history")
