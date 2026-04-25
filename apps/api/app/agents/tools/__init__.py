from __future__ import annotations

import copy
import json
from collections.abc import Callable, Awaitable
from typing import Any

from app.models.circuit_ir import (
    CircuitIR, Component, Net, Position, SimulationResults, Wire, WireEndpoint,
)
from app.services.component_db_service import ComponentDBService
from app.services.simulation_service import SimulationService


TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "add_component",
        "description": (
            "Add an electrical component to the circuit. "
            "Specify connections as a map of pin names to net names."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": [
                        "resistor", "capacitor", "inductor", "diode", "transistor",
                        "ic", "voltage_regulator", "crystal", "connector", "led",
                        "switch", "fuse", "opamp", "mosfet", "bjt",
                    ],
                    "description": "The component type",
                },
                "value": {
                    "type": "string",
                    "description": "Component value e.g. '10k', '100nF', 'AMS1117-3.3'",
                },
                "package": {
                    "type": "string",
                    "description": "PCB package e.g. '0402', '0603', 'SOT-23', 'SOIC-8'",
                },
                "part_number": {
                    "type": "string",
                    "description": "Manufacturer part number (optional)",
                },
                "connections": {
                    "type": "object",
                    "description": "Map of pin names to net names e.g. {\"1\": \"VCC\", \"2\": \"GND\"}",
                    "additionalProperties": {"type": "string"},
                },
                "properties": {
                    "type": "object",
                    "description": "Additional metadata key-value pairs",
                    "additionalProperties": {"type": "string"},
                },
            },
            "required": ["type", "value"],
        },
    },
    {
        "name": "add_net",
        "description": "Create a named electrical net (node/junction) in the circuit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Net name e.g. 'VCC', 'GND', 'net_a'"},
                "type": {
                    "type": "string",
                    "enum": ["signal", "power", "ground"],
                },
                "voltage": {
                    "type": "number",
                    "description": "Expected voltage level in volts (optional)",
                },
            },
            "required": ["name", "type"],
        },
    },
    {
        "name": "connect_pins",
        "description": "Connect a component pin to a net and optionally wire it to another component pin.",
        "input_schema": {
            "type": "object",
            "properties": {
                "component_id": {"type": "string"},
                "pin": {"type": "string", "description": "Pin name on the source component"},
                "net": {"type": "string", "description": "Net name to connect to"},
                "to_component_id": {"type": "string", "description": "Destination component ID (optional)"},
                "to_pin": {"type": "string", "description": "Destination pin name (optional)"},
            },
            "required": ["component_id", "pin", "net"],
        },
    },
    {
        "name": "run_simulation",
        "description": "Run SPICE simulation to validate the circuit electrically.",
        "input_schema": {
            "type": "object",
            "properties": {
                "analysis_type": {
                    "type": "string",
                    "enum": ["dc", "ac", "transient"],
                    "description": "'dc' for operating point, 'ac' for frequency response, 'transient' for time-domain",
                },
            },
            "required": ["analysis_type"],
        },
    },
    {
        "name": "query_components",
        "description": "Search the component database for real parts matching a description and specs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "description": {"type": "string", "description": "Natural language description e.g. '3.3V LDO regulator 500mA'"},
                "specs": {
                    "type": "object",
                    "description": "Specific specs to filter by",
                    "additionalProperties": {"type": "string"},
                },
                "type": {"type": "string", "description": "Component type filter (optional)"},
                "package": {"type": "string", "description": "Package filter (optional)"},
            },
            "required": ["description"],
        },
    },
]


class ToolExecutor:
    def __init__(
        self,
        ir: CircuitIR,
        ws_sender: Callable[[dict], Awaitable[None]],
        component_db: ComponentDBService | None = None,
        simulator: SimulationService | None = None,
    ) -> None:
        self.ir = ir
        self.ws_sender = ws_sender
        self.component_db = component_db
        self.simulator = simulator or SimulationService()
        self._last_patch: list[dict] | None = None

    async def execute(self, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
        before = copy.deepcopy(self.ir)
        handler = getattr(self, f"_tool_{tool_name}", None)
        if not handler:
            return {"error": f"Unknown tool: {tool_name}"}
        result = await handler(args)
        self._last_patch = self._compute_patch(before, self.ir)
        return result

    def get_last_patch(self) -> list[dict] | None:
        return self._last_patch

    # -------------------------------------------------------------------------
    # Tool implementations
    # -------------------------------------------------------------------------

    async def _tool_add_component(self, args: dict) -> dict:
        comp_id = self._next_id(args["type"])
        comp = Component(
            id=comp_id,
            type=args["type"],
            value=args["value"],
            package=args.get("package", "0402"),
            part_number=args.get("part_number"),
            pins=args.get("connections", {}),
            properties=args.get("properties", {}),
        )
        self.ir.components.append(comp)

        # Auto-add wires for connections
        for pin, net_name in comp.pins.items():
            # Ensure the net exists
            if not any(n.name == net_name for n in self.ir.nets):
                net_type = "ground" if net_name.upper() == "GND" else "power" if net_name.upper() in ("VCC", "VDD", "VIN", "VOUT") else "signal"
                self.ir.nets.append(Net(name=net_name, type=net_type))

        return {"success": True, "component_id": comp_id}

    async def _tool_add_net(self, args: dict) -> dict:
        name = args["name"]
        if any(n.name == name for n in self.ir.nets):
            return {"success": True, "net_name": name, "note": "Net already exists"}
        net = Net(
            name=name,
            type=args["type"],
            voltage=args.get("voltage"),
        )
        self.ir.nets.append(net)
        return {"success": True, "net_name": name}

    async def _tool_connect_pins(self, args: dict) -> dict:
        comp = next((c for c in self.ir.components if c.id == args["component_id"]), None)
        if not comp:
            return {"error": f"Component {args['component_id']} not found"}

        comp.pins[args["pin"]] = args["net"]

        # Add wire if target specified
        to_comp_id = args.get("to_component_id")
        to_pin = args.get("to_pin")
        if to_comp_id and to_pin:
            wire = Wire.model_validate({
                "from": {"component_id": args["component_id"], "pin": args["pin"]},
                "to": {"component_id": to_comp_id, "pin": to_pin},
                "net": args["net"],
            })
            self.ir.wires.append(wire)

        return {"success": True}

    async def _tool_run_simulation(self, args: dict) -> dict:
        results: SimulationResults = await self.simulator.run(self.ir, args["analysis_type"])
        await self.ws_sender({"type": "simulation_result", "results": results.model_dump()})
        return results.model_dump()

    async def _tool_query_components(self, args: dict) -> dict:
        if not self.component_db:
            return {
                "note": "Component database not available",
                "suggestion": "Use common parts like AMS1117-3.3, LM358, 2N2222",
            }
        results = await self.component_db.search(
            query=args["description"],
            component_type=args.get("type"),
            package=args.get("package"),
            limit=5,
        )
        return {"results": [r.model_dump() for r in results]}

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _next_id(self, component_type: str) -> str:
        prefix_map = {
            "resistor": "R", "capacitor": "C", "inductor": "L",
            "diode": "D", "led": "D", "transistor": "Q", "bjt": "Q",
            "mosfet": "Q", "ic": "U", "voltage_regulator": "U",
            "opamp": "U", "crystal": "Y", "connector": "J",
            "switch": "SW", "fuse": "F", "transformer": "T",
        }
        prefix = prefix_map.get(component_type, "X")
        existing = [c.id for c in self.ir.components if c.id.startswith(prefix) and c.id[len(prefix):].isdigit()]
        return f"{prefix}{len(existing) + 1}"

    def _compute_patch(self, before: CircuitIR, after: CircuitIR) -> list[dict]:
        """Compute a simplified JSON patch (add operations only for now)."""
        patches: list[dict] = []

        # Check for new components
        before_ids = {c.id for c in before.components}
        for comp in after.components:
            if comp.id not in before_ids:
                patches.append({
                    "op": "add",
                    "path": f"/components/-",
                    "value": comp.model_dump(by_alias=True),
                })

        # Check for new nets
        before_nets = {n.name for n in before.nets}
        for net in after.nets:
            if net.name not in before_nets:
                patches.append({
                    "op": "add",
                    "path": "/nets/-",
                    "value": net.model_dump(),
                })

        # Check for new wires
        before_wire_count = len(before.wires)
        for i, wire in enumerate(after.wires[before_wire_count:], start=before_wire_count):
            patches.append({
                "op": "add",
                "path": "/wires/-",
                "value": wire.model_dump(by_alias=True),
            })

        # Check for pin updates on existing components
        for comp in after.components:
            if comp.id in before_ids:
                before_comp = next(c for c in before.components if c.id == comp.id)
                for pin, net in comp.pins.items():
                    if before_comp.pins.get(pin) != net:
                        comp_idx = next(i for i, c in enumerate(after.components) if c.id == comp.id)
                        patches.append({
                            "op": "add",
                            "path": f"/components/{comp_idx}/pins/{pin}",
                            "value": net,
                        })

        return patches
