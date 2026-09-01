from __future__ import annotations

from dataclasses import dataclass

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import client as client_t

# Client statuses that permit new AI Receptionist sessions.
ACTIVE_CLIENT_STATUS = "ACTIVE"


@dataclass(frozen=True)
class ClientRecord:
    id: str
    client_id: str  # human "NC-CL-000001"
    name: str
    status: str

    @property
    def is_active(self) -> bool:
        return self.status == ACTIVE_CLIENT_STATUS


async def get_client(session: AsyncSession, identifier: str) -> ClientRecord | None:
    """Look up a client by its cuid primary key OR its human "NC-CL-…" id."""
    row = (
        await session.execute(
            sa.select(
                client_t.c.id,
                client_t.c.clientId,
                client_t.c.name,
                client_t.c.status,
            )
            .where(
                sa.or_(client_t.c.id == identifier, client_t.c.clientId == identifier)
            )
            .limit(1)
        )
    ).first()
    if row is None:
        return None
    return ClientRecord(
        id=row.id,
        client_id=row.clientId,
        name=row.name,
        status=str(row.status),
    )
