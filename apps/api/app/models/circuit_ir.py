"""
Pydantic models mirroring packages/circuit-ir/index.ts.
Keep in sync with the TypeScript canonical schema.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


ComponentType = Literal[
    "resistor", "capacitor", "inductor", "diode", "transistor",
    "ic", "voltage_regulator", "crystal", "connector", "led",
    "switch", "fuse", "transformer", "opamp", "mosfet", "bjt",
]

NetType = Literal["signal", "power", "ground"]
AnalysisType = Literal["dc", "ac", "transient"]


class Position(BaseModel):
    x: float = 0.0
    y: float = 0.0


class Component(BaseModel):
    id: str
    type: ComponentType
    value: str
    package: str = "0402"
    part_number: Optional[str] = None
    position: Position = Field(default_factory=Position)
    rotation: float = 0.0
    pins: dict[str, str] = Field(default_factory=dict)
    properties: dict[str, str] = Field(default_factory=dict)


class Net(BaseModel):
    name: str
    type: NetType
    voltage: Optional[float] = None


class WireEndpoint(BaseModel):
    component_id: str
    pin: str


class Wire(BaseModel):
    from_endpoint: WireEndpoint = Field(alias="from")
    to: WireEndpoint
    net: str
    path: list[Position] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class CircuitMetadata(BaseModel):
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    author: Optional[str] = None
    version: Optional[str] = None


class CircuitIR(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Untitled Circuit"
    components: list[Component] = Field(default_factory=list)
    nets: list[Net] = Field(default_factory=list)
    wires: list[Wire] = Field(default_factory=list)
    metadata: CircuitMetadata = Field(default_factory=CircuitMetadata)


# --- WebSocket message models ---

class WSClientGenerate(BaseModel):
    type: Literal["generate"]
    prompt: str


class WSClientReset(BaseModel):
    type: Literal["reset"]


class WSClientUndo(BaseModel):
    type: Literal["undo"]


class WSClientSave(BaseModel):
    type: Literal["save"]


class SimulationResults(BaseModel):
    analysis_type: AnalysisType
    status: Literal["ok", "error", "warning"]
    nets: dict[str, float] = Field(default_factory=dict)
    messages: list[str] = Field(default_factory=list)
    raw_output: Optional[str] = None


class ComponentSearchResult(BaseModel):
    mpn: str
    manufacturer: str
    description: str
    type: ComponentType
    value: str
    package: str
    datasheet_url: Optional[str] = None
    kicad_symbol: Optional[str] = None
    kicad_footprint: Optional[str] = None
    specs: dict[str, str] = Field(default_factory=dict)
