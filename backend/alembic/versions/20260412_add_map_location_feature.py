"""add map location feature

Revision ID: 20260412maploc
Revises: 20260401utcmigrate
Create Date: 2026-04-12 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260412maploc"
down_revision: Union[str, Sequence[str], None] = "20260401utcmigrate"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Add latitude/longitude to existing locations table
    location_cols = {col["name"] for col in inspector.get_columns("locations")}
    if "latitude" not in location_cols:
        op.add_column("locations", sa.Column("latitude", sa.Float(), nullable=True))
    if "longitude" not in location_cols:
        op.add_column("locations", sa.Column("longitude", sa.Float(), nullable=True))

    # 2. Create service_locations junction table
    table_names = set(inspector.get_table_names())
    if "service_locations" not in table_names:
        op.create_table(
            "service_locations",
            sa.Column("service_id", sa.UUID(), nullable=False),
            sa.Column("location_id", sa.UUID(), nullable=False),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("service_id", "location_id"),
        )

    # 3. Create telegram_connections table
    if "telegram_connections" not in table_names:
        op.create_table(
            "telegram_connections",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("chat_id", sa.BigInteger(), nullable=False, unique=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        )

    # 4. Add location_id to bookings
    booking_cols = {col["name"] for col in inspector.get_columns("bookings")}
    if "location_id" not in booking_cols:
        op.add_column(
            "bookings",
            sa.Column("location_id", sa.UUID(), nullable=True),
        )
        op.create_foreign_key(
            "fk_bookings_location_id",
            "bookings",
            "locations",
            ["location_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    op.drop_constraint("fk_bookings_location_id", "bookings", type_="foreignkey")
    op.drop_column("bookings", "location_id")
    op.drop_table("telegram_connections")
    op.drop_table("service_locations")
    op.drop_column("locations", "longitude")
    op.drop_column("locations", "latitude")
