from __future__ import annotations

import hashlib
import json
import uuid

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit_ir import CircuitIR
from app.models.db_models import Circuit, Project, ProjectHead


REDIS_IR_TTL = 3600  # 1 hour cache for active sessions


class CircuitService:
    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        self.db = db
        self.redis = redis

    # -------------------------------------------------------------------------
    # IR access
    # -------------------------------------------------------------------------

    async def get_or_create_ir(self, project_id: str) -> CircuitIR:
        """Load the current head IR for a project, or return empty IR."""
        cache_key = f"circuit_ir:{project_id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return CircuitIR.model_validate_json(cached)

        head_row = await self._get_head(project_id)
        if head_row:
            circuit_row = await self.db.get(Circuit, head_row.circuit_id)
            if circuit_row:
                ir = CircuitIR.model_validate(circuit_row.ir)
                await self._cache_ir(project_id, ir)
                return ir

        return CircuitIR()

    async def save_ir(
        self,
        project_id: str,
        ir: CircuitIR,
        conversation_history: list[dict] | None = None,
    ) -> Circuit:
        """Append a new version and update the head pointer."""
        ir_dict = ir.model_dump(by_alias=True)
        ir_hash = hashlib.sha256(json.dumps(ir_dict, sort_keys=True).encode()).hexdigest()

        # Determine next version number
        result = await self.db.execute(
            select(Circuit.version)
            .where(Circuit.project_id == uuid.UUID(project_id))
            .order_by(Circuit.version.desc())
            .limit(1)
        )
        last_version = result.scalar_one_or_none() or 0

        circuit = Circuit(
            project_id=uuid.UUID(project_id),
            version=last_version + 1,
            ir=ir_dict,
            ir_hash=ir_hash,
            agent_conversation=conversation_history,
        )
        self.db.add(circuit)
        await self.db.flush()

        # Update or create head
        head = await self._get_head(project_id)
        if head:
            head.circuit_id = circuit.id
        else:
            head = ProjectHead(project_id=uuid.UUID(project_id), circuit_id=circuit.id)
            self.db.add(head)

        await self.db.commit()
        await self._cache_ir(project_id, ir)
        return circuit

    async def get_versions(self, project_id: str) -> list[Circuit]:
        result = await self.db.execute(
            select(Circuit)
            .where(Circuit.project_id == uuid.UUID(project_id))
            .order_by(Circuit.version.desc())
        )
        return list(result.scalars().all())

    # -------------------------------------------------------------------------
    # Project helpers
    # -------------------------------------------------------------------------

    async def get_project(self, project_id: str) -> Project | None:
        return await self.db.get(Project, uuid.UUID(project_id))

    # -------------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------------

    async def _get_head(self, project_id: str) -> ProjectHead | None:
        return await self.db.get(ProjectHead, uuid.UUID(project_id))

    async def _cache_ir(self, project_id: str, ir: CircuitIR) -> None:
        await self.redis.setex(
            f"circuit_ir:{project_id}",
            REDIS_IR_TTL,
            ir.model_dump_json(by_alias=True),
        )
