"use client";

import { useCircuitStore } from "@/store/circuitStore";

export function PropertiesPanel() {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedId = useCircuitStore((s) => s.selectedComponentId);
  const simulationResults = useCircuitStore((s) => s.simulationResults);

  const selected = circuit.components.find((c) => c.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border text-sm">
      {/* Component properties */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {selected ? "Component" : "Properties"}
        </h3>

        {selected ? (
          <div className="space-y-2">
            <Row label="ID" value={selected.id} mono />
            <Row label="Type" value={selected.type} />
            <Row label="Value" value={selected.value} mono />
            <Row label="Package" value={selected.package} mono />
            {selected.part_number && (
              <Row label="Part #" value={selected.part_number} mono />
            )}

            {/* Pins */}
            {Object.keys(selected.pins).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1.5">Pins</p>
                <div className="space-y-1">
                  {Object.entries(selected.pins).map(([pin, net]) => (
                    <div key={pin} className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{pin}</span>
                      <span className="text-primary/80">{net}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Position */}
            <div className="mt-3 text-xs text-muted-foreground font-mono">
              x: {Math.round(selected.position.x)}, y: {Math.round(selected.position.y)}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click a component on the schematic to inspect it.
          </p>
        )}
      </div>

      {/* Net list */}
      <div className="p-4 border-b border-border flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Nets ({circuit.nets.length})
        </h3>
        <div className="space-y-1.5">
          {circuit.nets.map((net) => (
            <div key={net.name} className="flex items-center justify-between">
              <span className="font-mono text-xs text-foreground">{net.name}</span>
              <div className="flex items-center gap-2">
                {net.voltage != null && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {net.voltage}V
                  </span>
                )}
                <NetTypeBadge type={net.type} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation results */}
      {simulationResults && (
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Simulation
            <span
              className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                simulationResults.status === "ok"
                  ? "bg-green-900/40 text-green-400"
                  : simulationResults.status === "warning"
                  ? "bg-yellow-900/40 text-yellow-400"
                  : "bg-red-900/40 text-red-400"
              }`}
            >
              {simulationResults.status}
            </span>
          </h3>
          <div className="space-y-1">
            {Object.entries(simulationResults.nets).map(([net, voltage]) => (
              <div key={net} className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">{net}</span>
                <span className="text-green-400">{voltage.toFixed(3)}V</span>
              </div>
            ))}
            {simulationResults.messages.map((msg, i) => (
              <p key={i} className="text-xs text-yellow-400 mt-1">
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right ${mono ? "font-mono text-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function NetTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    power: "bg-yellow-900/30 text-yellow-400",
    ground: "bg-slate-700 text-slate-300",
    signal: "bg-blue-900/30 text-blue-400",
  };
  return (
    <span className={`text-[9px] px-1 rounded ${colors[type] ?? colors.signal}`}>
      {type}
    </span>
  );
}
