"""add marketplace and community

Revision ID: g7a101market001
Revises: f6a101issue001
"""
from alembic import op
import sqlalchemy as sa
revision="g7a101market001"
down_revision="f6a101issue001"
branch_labels=None
depends_on=None
def upgrade():
 op.create_table("marketplace_listing",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("seller_id",sa.Integer(),sa.ForeignKey("user.id"),nullable=False),sa.Column("title",sa.String(150),nullable=False),sa.Column("category",sa.String(60),nullable=False),sa.Column("description",sa.Text(),nullable=False),sa.Column("price",sa.Numeric(10,2),nullable=False),sa.Column("condition",sa.String(40),nullable=False),sa.Column("listing_type",sa.String(20),nullable=False),sa.Column("negotiable",sa.Boolean(),nullable=False),sa.Column("status",sa.String(20),nullable=False),sa.Column("created_at",sa.DateTime(),nullable=False))
 op.create_table("marketplace_message",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("listing_id",sa.Integer(),sa.ForeignKey("marketplace_listing.id"),nullable=False),sa.Column("sender_id",sa.Integer(),sa.ForeignKey("user.id"),nullable=False),sa.Column("body",sa.Text(),nullable=False),sa.Column("offer",sa.Numeric(10,2)),sa.Column("created_at",sa.DateTime(),nullable=False))
 op.create_table("club",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("name",sa.String(100),nullable=False,unique=True),sa.Column("description",sa.Text(),nullable=False),sa.Column("lead_id",sa.Integer(),sa.ForeignKey("user.id")))
 op.create_table("community_message",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("author_id",sa.Integer(),sa.ForeignKey("user.id"),nullable=False),sa.Column("body",sa.Text(),nullable=False),sa.Column("flagged",sa.Boolean(),nullable=False),sa.Column("created_at",sa.DateTime(),nullable=False))
def downgrade():
 op.drop_table("community_message");op.drop_table("club");op.drop_table("marketplace_message");op.drop_table("marketplace_listing")
