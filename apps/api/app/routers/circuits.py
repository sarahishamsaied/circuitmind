from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_circuit_service
from app.models.api_models import CircuitResponse
from app.models.db_models import Circuit
from app.services.circuit_service import CircuitService

router = APIRouter()


@router.get("/{project_id}/versions", response_model=list[CircuitResponse])
async def get_circuit_versions(
    project_id: str,
    circuit_service: CircuitService = Depends(get_circuit_service),
) -> list[Circuit]:
    return await circuit_service.get_versions(project_id)


@router.get("/{project_id}/current")
async def get_current_circuit(
    project_id: str,
    circuit_service: CircuitService = Depends(get_circuit_service),
) -> dict:
    ir = await circuit_service.get_or_create_ir(project_id)
    return ir.model_dump(by_alias=True)
