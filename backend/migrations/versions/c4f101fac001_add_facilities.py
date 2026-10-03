"""add facilities

Revision ID: c4f101fac001
Revises: 688121342025
Create Date: 2026-10-03
"""
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision = "c4f101fac001"
down_revision = "688121342025"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "facility",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("location", sa.String(length=150), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.CheckConstraint("status IN ('Available', 'Occupied', 'Closed', 'Maintenance')", name="facility_status_is_supported"),
        sa.ForeignKeyConstraint(["updated_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    facility_table = sa.table(
        "facility",
        sa.column("name", sa.String),
        sa.column("location", sa.String),
        sa.column("status", sa.String),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(facility_table, [
        {"name": "Badminton court", "location": "Hostel block", "status": "Closed", "updated_at": datetime.utcnow()},
        {"name": "Study room", "location": "9th floor", "status": "Closed", "updated_at": datetime.utcnow()},
        {"name": "Table Tennis", "location": "8th floor", "status": "Closed", "updated_at": datetime.utcnow()},
        {"name": "TV room", "location": "6th floor", "status": "Closed", "updated_at": datetime.utcnow()},
        {"name": "Gym", "location": "5th floor", "status": "Closed", "updated_at": datetime.utcnow()},
        {"name": "Legs/Cardio gym", "location": "4th floor", "status": "Closed", "updated_at": datetime.utcnow()},
        {"name": "Girls' hostel facilities", "location": "1st floor — managed separately", "status": "Closed", "updated_at": datetime.utcnow()},
    ])


def downgrade():
    op.drop_table("facility")
