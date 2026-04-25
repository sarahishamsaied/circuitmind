from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.circuit_ir import CircuitIR


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CircuitResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    version: int
    ir: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ExportRequest(BaseModel):
    format: str  # "spice" | "kicad"
    circuit_ir: CircuitIR


class ExportResponse(BaseModel):
    format: str
    content: str
    filename: str


class ComponentSearchRequest(BaseModel):
    q: str
    type: str | None = None
    package: str | None = None
    limit: int = 10


class HealthResponse(BaseModel):
    status: str
    version: str
