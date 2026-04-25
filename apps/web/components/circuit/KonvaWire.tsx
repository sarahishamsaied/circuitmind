"use client";

import { Line, Circle } from "react-konva";
import type { Wire, Circuit } from "@circuitmind/circuit-ir";
import { getSymbol } from "./symbols";

interface Props {
  wire: Wire;
  circuit: Circuit;
}

export function KonvaWire({ wire, circuit }: Props) {
  const fromComp = circuit.components.find((c) => c.id === wire.from.component_id);
  const toComp = circuit.components.find((c) => c.id === wire.to.component_id);

  if (!fromComp || !toComp) return null;

  const fromSymbol = getSymbol(fromComp.type, fromComp.value);
  const toSymbol = getSymbol(toComp.type, toComp.value);

  const fromPin = fromSymbol.pins[wire.from.pin];
  const toPin = toSymbol.pins[wire.to.pin];

  if (!fromPin || !toPin) return null;

  const x1 = fromComp.position.x + fromPin.x;
  const y1 = fromComp.position.y + fromPin.y;
  const x2 = toComp.position.x + toPin.x;
  const y2 = toComp.position.y + toPin.y;

  // If a routed path is available, use it; otherwise direct line
  const points =
    wire.path && wire.path.length >= 2
      ? wire.path.flatMap((p) => [p.x, p.y])
      : [x1, y1, x2, y2];

  return (
    <>
      <Line
        points={points}
        stroke="#475569"
        strokeWidth={1.5}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      {/* Junction dot at endpoints */}
      <Circle x={x1} y={y1} radius={2.5} fill="#475569" listening={false} />
      <Circle x={x2} y={y2} radius={2.5} fill="#475569" listening={false} />
    </>
  );
}
