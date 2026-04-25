from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.services.circuit_service import CircuitService
from app.services.component_db_service import ComponentDBService
from app.services.export_service import ExportService
from app.services.simulation_service import SimulationService

# Redis connection pool (module-level singleton)
_redis_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_pool


async def get_circuit_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> CircuitService:
    return CircuitService(db, redis)


async def get_component_db_service(
    db: AsyncSession = Depends(get_db),
) -> ComponentDBService:
    return ComponentDBService(db)


async def get_export_service() -> ExportService:
    return ExportService()


async def get_simulation_service() -> SimulationService:
    return SimulationService()
