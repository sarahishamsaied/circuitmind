"use client";

import { Group, Line, Rect, Circle, Text, Arc } from "react-konva";
import type { Component, SymbolShape } from "@circuitmind/circuit-ir";
import { getSymbol } from "./symbols";

interface Props {
  component: Component;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}

export function KonvaComponent({ component, isSelected, onSelect, onDragEnd }: Props) {
  const symbol = getSymbol(component.type, component.value);

  return (
    <Group
      x={component.position.x}
      y={component.position.y}
      rotation={component.rotation}
      onClick={onSelect}
      onTap={onSelect}
      draggable
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-6}
          y={-14}
          width={symbol.width + 12}
          height={symbol.height + 28}
          stroke="#3b82f6"
          strokeWidth={1.5}
          dash={[4, 2]}
          fill="transparent"
          cornerRadius={3}
          listening={false}
        />
      )}

      {/* Component ID label (above) */}
      <Text
        text={component.id}
        x={0}
        y={-12}
        width={symbol.width}
        align="center"
        fontSize={10}
        fontFamily="monospace"
        fill="#64748b"
        listening={false}
      />

      {/* Symbol shapes */}
      {symbol.shapes.map((shape, i) => renderShape(shape, i))}

      {/* Value label (below) */}
      <Text
        text={component.value}
        x={0}
        y={symbol.height + 4}
        width={symbol.width}
        align="center"
        fontSize={9}
        fontFamily="monospace"
        fill="#94a3b8"
        listening={false}
      />

      {/* Pin dots (visible on hover/select) */}
      {isSelected &&
        Object.entries(symbol.pins).map(([pinName, pos]) => (
          <Circle
            key={pinName}
            x={pos.x}
            y={pos.y}
            radius={3}
            fill="#3b82f6"
            listening={false}
          />
        ))}

      {/* Hit target: shapes/labels use listening={false}; this rect stays topmost for reliable pick/drag. */}
      <Rect
        x={-6}
        y={-14}
        width={symbol.width + 12}
        height={symbol.height + 28}
        fill="rgba(0,0,0,0.02)"
      />
    </Group>
  );
}

function renderShape(shape: SymbolShape, key: number): React.ReactElement | null {
  const common = {
    stroke: shape.stroke ?? "#94a3b8",
    strokeWidth: shape.strokeWidth ?? 1.5,
    fill: shape.fill ?? "transparent",
    listening: false,
  };

  switch (shape.type) {
    case "line":
      return (
        <Line key={key} points={shape.points ?? []} {...common} />
      );
    case "polyline":
      return (
        <Line key={key} points={shape.points ?? []} closed {...common} />
      );
    case "rect":
      return (
        <Rect
          key={key}
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          width={shape.width ?? 0}
          height={shape.height ?? 0}
          {...common}
        />
      );
    case "circle":
      return (
        <Circle
          key={key}
          x={shape.cx ?? 0}
          y={shape.cy ?? 0}
          radius={shape.radius ?? 10}
          {...common}
        />
      );
    case "arc":
      return (
        <Arc
          key={key}
          x={shape.cx ?? 0}
          y={shape.cy ?? 0}
          innerRadius={0}
          outerRadius={shape.radius ?? 10}
          angle={(shape.endAngle ?? 360) - (shape.startAngle ?? 0)}
          rotation={shape.startAngle ?? 0}
          {...common}
        />
      );
    case "text":
      return (
        <Text
          key={key}
          x={(shape.x ?? 0) - (shape.width ?? 40) / 2}
          y={(shape.y ?? 0) - (shape.fontSize ?? 10) / 2}
          width={shape.width ?? 40}
          text={shape.text ?? ""}
          fontSize={shape.fontSize ?? 10}
          fontFamily="monospace"
          align={shape.align ?? "center"}
          fill={shape.fill ?? "#94a3b8"}
          listening={false}
        />
      );
    default:
      return null;
  }
}
