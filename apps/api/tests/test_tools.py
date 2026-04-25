"""Tests for ToolExecutor — verifies IR mutations produce correct patches."""
from __future__ import annotations

import pytest

from app.agents.tools import ToolExecutor
from app.models.circuit_ir import CircuitIR


async def _noop_sender(msg: dict) -> None:
    pass


@pytest.fixture
def empty_ir() -> CircuitIR:
    return CircuitIR(name="Test Circuit")


@pytest.fixture
def executor(empty_ir: CircuitIR) -> ToolExecutor:
    return ToolExecutor(ir=empty_ir, ws_sender=_noop_sender)


@pytest.mark.asyncio
async def test_add_net(executor: ToolExecutor) -> None:
    result = await executor.execute("add_net", {"name": "VCC", "type": "power", "voltage": 3.3})
    assert result["success"] is True
    assert any(n.name == "VCC" for n in executor.ir.nets)
    patch = executor.get_last_patch()
    assert patch is not None
    assert any(p["op"] == "add" and "nets" in p["path"] for p in patch)


@pytest.mark.asyncio
async def test_add_component(executor: ToolExecutor) -> None:
    result = await executor.execute("add_component", {
        "type": "resistor",
        "value": "10k",
        "package": "0402",
        "connections": {"1": "VCC", "2": "GND"},
    })
    assert result["success"] is True
    assert result["component_id"] == "R1"
    assert len(executor.ir.components) == 1
    assert executor.ir.components[0].pins == {"1": "VCC", "2": "GND"}


@pytest.mark.asyncio
async def test_component_id_increment(executor: ToolExecutor) -> None:
    await executor.execute("add_component", {"type": "resistor", "value": "10k"})
    result2 = await executor.execute("add_component", {"type": "resistor", "value": "4.7k"})
    assert result2["component_id"] == "R2"


@pytest.mark.asyncio
async def test_connect_pins(executor: ToolExecutor) -> None:
    await executor.execute("add_net", {"name": "NET_A", "type": "signal"})
    await executor.execute("add_component", {"type": "resistor", "value": "1k"})
    result = await executor.execute("connect_pins", {
        "component_id": "R1",
        "pin": "1",
        "net": "NET_A",
    })
    assert result["success"] is True
    assert executor.ir.components[0].pins["1"] == "NET_A"


@pytest.mark.asyncio
async def test_add_duplicate_net(executor: ToolExecutor) -> None:
    await executor.execute("add_net", {"name": "GND", "type": "ground"})
    result = await executor.execute("add_net", {"name": "GND", "type": "ground"})
    assert "already exists" in result.get("note", "")
    assert len([n for n in executor.ir.nets if n.name == "GND"]) == 1
