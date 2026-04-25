from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.api_models import ExportRequest, ExportResponse
from app.services.export_service import ExportService

router = APIRouter()
_export_service = ExportService()


@router.post("/spice", response_model=ExportResponse)
async def export_spice(body: ExportRequest) -> ExportResponse:
    content = _export_service.ir_to_spice(body.circuit_ir)
    filename = f"{body.circuit_ir.name.lower().replace(' ', '_')}.sp"
    return ExportResponse(format="spice", content=content, filename=filename)


@router.post("/kicad", response_model=ExportResponse)
async def export_kicad(body: ExportRequest) -> ExportResponse:
    content = _export_service.ir_to_kicad_netlist(body.circuit_ir)
    filename = f"{body.circuit_ir.name.lower().replace(' ', '_')}.net"
    return ExportResponse(format="kicad", content=content, filename=filename)
