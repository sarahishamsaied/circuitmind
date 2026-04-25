from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_component_db_service
from app.models.circuit_ir import ComponentSearchResult
from app.services.component_db_service import ComponentDBService

router = APIRouter()


@router.get("/list", response_model=list[ComponentSearchResult])
async def list_components(
    limit: int = Query(200, ge=1, le=500),
    service: ComponentDBService = Depends(get_component_db_service),
) -> list[ComponentSearchResult]:
    """Return in-stock parts ordered by MPN (catalog / palette browse)."""
    return await service.list_components(limit)


@router.get("/search", response_model=list[ComponentSearchResult])
async def search_components(
    q: str = Query(..., min_length=1),
    type: str | None = Query(None),
    package: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    service: ComponentDBService = Depends(get_component_db_service),
) -> list[ComponentSearchResult]:
    return await service.search(q, component_type=type, package=package, limit=limit)
