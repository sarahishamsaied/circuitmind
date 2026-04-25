"""Tests for SPICE and KiCad export."""
from __future__ import annotations

import pytest

from app.models.circuit_ir import CircuitIR, Component, Net, Position
from app.services.export_service import ExportService


@pytest.fixture
def ldo_circuit() -> CircuitIR:
    """A simple AMS1117 3.3V LDO circuit."""
    circuit = CircuitIR(name="LDO 3.3V")
    circuit.nets = [
        Net(name="VIN", type="power", voltage=5.0),
        Net(name="VOUT", type="power", voltage=3.3),
        Net(name="GND", type="ground", voltage=0.0),
    ]
    circuit.components = [
        Component(
            id="U1",
            type="voltage_regulator",
            value="AMS1117-3.3",
            package="SOT-223",
            part_number="AMS1117-3.3",
            pins={"IN": "VIN", "OUT": "VOUT", "GND": "GND"},
        ),
        Component(
            id="C1",
            type="capacitor",
            value="10uF",
            package="0805",
            pins={"1": "VIN", "2": "GND"},
        ),
        Component(
            id="C2",
            type="capacitor",
            value="10uF",
            package="0805",
            pins={"1": "VOUT", "2": "GND"},
        ),
    ]
    return circuit


def test_spice_export_contains_components(ldo_circuit: CircuitIR) -> None:
    svc = ExportService()
    spice = svc.ir_to_spice(ldo_circuit)

    assert "* LDO 3.3V" in spice
    assert "XU1" in spice          # voltage_regulator → X prefix
    assert "CC1" in spice or "C1" in spice   # capacitor
    assert "10uF" in spice
    assert ".op" in spice
    assert ".end" in spice


def test_spice_export_power_sources(ldo_circuit: CircuitIR) -> None:
    svc = ExportService()
    spice = svc.ir_to_spice(ldo_circuit)
    assert "V_VIN" in spice or "V_" in spice


def test_spice_export_empty_circuit() -> None:
    svc = ExportService()
    circuit = CircuitIR(name="Empty")
    spice = svc.ir_to_spice(circuit)
    assert ".end" in spice
