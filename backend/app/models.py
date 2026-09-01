"""SQLAlchemy Core tables mapped onto the existing Prisma schema.

The database is owned by Prisma (../../prisma/schema.prisma). This service
only reads from it, plus writes CallLog rows to reserve/record usage. Table
and column names are the Prisma defaults: PascalCase table names, camelCase
quoted columns. Enum columns are read/written as plain text — PostgreSQL
casts the string literals to/from the enum type.
"""

from __future__ import annotations

import sqlalchemy as sa

metadata = sa.MetaData()

client = sa.Table(
    "Client",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("clientId", sa.Text),
    sa.Column("name", sa.Text),
    sa.Column("status", sa.Text),  # ClientStatus: ACTIVE | SUSPENDED | INACTIVE
)

product = sa.Table(
    "Product",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("key", sa.Text),
)

subscription = sa.Table(
    "Subscription",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("clientId", sa.Text),
    sa.Column("productId", sa.Text),
    sa.Column("status", sa.Text),  # SubscriptionStatus: ACTIVE | PAUSED | CANCELLED | SUSPENDED
    sa.Column("billingPeriodStart", sa.DateTime(timezone=True)),
    sa.Column("billingPeriodEnd", sa.DateTime(timezone=True)),
    sa.Column("createdAt", sa.DateTime(timezone=True)),
)

subscription_entitlement = sa.Table(
    "SubscriptionEntitlement",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("subscriptionId", sa.Text),
    sa.Column("key", sa.Text),
    sa.Column("intValue", sa.Integer),
)

call_log = sa.Table(
    "CallLog",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("clientId", sa.Text),
    sa.Column("subscriptionId", sa.Text),
    sa.Column("callId", sa.Text),
    sa.Column("startedAt", sa.DateTime(timezone=True)),
    sa.Column("endedAt", sa.DateTime(timezone=True)),
    sa.Column("durationSeconds", sa.Integer),
    sa.Column("status", sa.Text),  # CallStatus: IN_PROGRESS | COMPLETED | FAILED | MISSED
    sa.Column("createdAt", sa.DateTime(timezone=True)),
)
