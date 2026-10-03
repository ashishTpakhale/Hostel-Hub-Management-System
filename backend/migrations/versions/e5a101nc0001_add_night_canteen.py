"""add night canteen

Revision ID: e5a101nc0001
Revises: c4f101fac001
Create Date: 2026-10-03
"""
from alembic import op
import sqlalchemy as sa

revision = "e5a101nc0001"
down_revision = "c4f101fac001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("night_canteen_menu",
        sa.Column("id", sa.Integer(), nullable=False), sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False), sa.Column("contributor_id", sa.Integer(), nullable=False),
        sa.Column("source_image_key", sa.String(length=255), nullable=True), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('draft', 'published')", name="night_canteen_menu_status"),
        sa.ForeignKeyConstraint(["contributor_id"], ["user.id"]), sa.PrimaryKeyConstraint("id"))
    with op.batch_alter_table("night_canteen_menu") as batch_op:
        batch_op.create_index(batch_op.f("ix_night_canteen_menu_service_date"), ["service_date"], unique=False)
    op.create_table("night_canteen_item",
        sa.Column("id", sa.Integer(), nullable=False), sa.Column("menu_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False), sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False), sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.CheckConstraint("price >= 0", name="night_canteen_item_price_nonnegative"), sa.ForeignKeyConstraint(["menu_id"], ["night_canteen_menu.id"]), sa.PrimaryKeyConstraint("id"))
    with op.batch_alter_table("night_canteen_item") as batch_op:
        batch_op.create_index(batch_op.f("ix_night_canteen_item_menu_id"), ["menu_id"], unique=False)


def downgrade():
    with op.batch_alter_table("night_canteen_item") as batch_op:
        batch_op.drop_index(batch_op.f("ix_night_canteen_item_menu_id"))
    op.drop_table("night_canteen_item")
    with op.batch_alter_table("night_canteen_menu") as batch_op:
        batch_op.drop_index(batch_op.f("ix_night_canteen_menu_service_date"))
    op.drop_table("night_canteen_menu")
