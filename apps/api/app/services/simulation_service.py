from __future__ import annotations

import os
import subprocess
import tempfile

from app.models.circuit_ir import AnalysisType, CircuitIR, SimulationResults
from app.services.export_service import ExportService


class SimulationService:
    def __init__(self) -> None:
        self.export_service = ExportService()
        self.ngspice_path = os.environ.get("NGSPICE_PATH", "/usr/bin/ngspice")

    async def run(self, circuit: CircuitIR, analysis_type: AnalysisType) -> SimulationResults:
        if not circuit.components:
            return SimulationResults(
                analysis_type=analysis_type,
                status="error",
                messages=["Circuit has no components to simulate."],
            )

        try:
            spice_netlist = self.export_service.ir_to_spice(circuit, analysis_type)
            return await self._run_ngspice(spice_netlist, analysis_type)
        except Exception as exc:
            return SimulationResults(
                analysis_type=analysis_type,
                status="error",
                messages=[f"Simulation failed: {exc!s}"],
            )

    async def _run_ngspice(self, netlist: str, analysis_type: AnalysisType) -> SimulationResults:
        with tempfile.TemporaryDirectory() as tmpdir:
            netlist_path = os.path.join(tmpdir, "circuit.sp")
            with open(netlist_path, "w") as f:
                f.write(netlist)
                f.write("\n.print all\n.end\n")

            try:
                result = subprocess.run(
                    [self.ngspice_path, "-b", "-o", os.path.join(tmpdir, "out.txt"), netlist_path],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                output = result.stdout + result.stderr
                return self._parse_ngspice_output(output, analysis_type)
            except FileNotFoundError:
                return SimulationResults(
                    analysis_type=analysis_type,
                    status="warning",
                    messages=["ngspice not installed — simulation skipped."],
                )
            except subprocess.TimeoutExpired:
                return SimulationResults(
                    analysis_type=analysis_type,
                    status="error",
                    messages=["Simulation timed out after 30 seconds."],
                )

    def _parse_ngspice_output(self, output: str, analysis_type: AnalysisType) -> SimulationResults:
        nets: dict[str, float] = {}
        messages: list[str] = []
        status: str = "ok"

        for line in output.splitlines():
            line = line.strip()
            if line.startswith("Error") or "error" in line.lower():
                messages.append(line)
                status = "error"
            elif line.startswith("Warning") or "warning" in line.lower():
                messages.append(line)
                if status == "ok":
                    status = "warning"
            # Parse DC operating point: "v(net_name) = 3.3"
            elif "=" in line and line.startswith("v("):
                try:
                    parts = line.split("=")
                    net_name = parts[0].strip()[2:-1]  # strip "v(" and ")"
                    voltage = float(parts[1].strip().split()[0])
                    nets[net_name] = voltage
                except (ValueError, IndexError):
                    pass

        return SimulationResults(
            analysis_type=analysis_type,
            status=status,  # type: ignore[arg-type]
            nets=nets,
            messages=messages,
            raw_output=output[:4000] if output else None,
        )
