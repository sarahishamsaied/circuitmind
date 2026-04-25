import type { SymbolConfig } from "@circuitmind/circuit-ir";

// ─── Resistor ───────────────────────────────────────────────────────────────
function resistorSymbol(_value: string): SymbolConfig {
  return {
    width: 60,
    height: 20,
    pins: { "1": { x: 0, y: 10 }, "2": { x: 60, y: 10 } },
    shapes: [
      { type: "line", points: [0, 10, 10, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "rect", x: 10, y: 2, width: 40, height: 16, stroke: "#94a3b8", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "line", points: [50, 10, 60, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
    ],
  };
}

// ─── Capacitor (non-polar) ───────────────────────────────────────────────────
function capacitorSymbol(_value: string): SymbolConfig {
  return {
    width: 30,
    height: 40,
    pins: { "1": { x: 15, y: 0 }, "2": { x: 15, y: 40 } },
    shapes: [
      { type: "line", points: [15, 0, 15, 16], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "line", points: [2, 16, 28, 16], stroke: "#94a3b8", strokeWidth: 2 },
      { type: "line", points: [2, 24, 28, 24], stroke: "#94a3b8", strokeWidth: 2 },
      { type: "line", points: [15, 24, 15, 40], stroke: "#94a3b8", strokeWidth: 1.5 },
    ],
  };
}

// ─── IC (generic box) ────────────────────────────────────────────────────────
function icSymbol(value: string): SymbolConfig {
  const pinCount = 8;
  const height = Math.max(60, pinCount * 12);
  return {
    width: 80,
    height,
    pins: {
      "VCC": { x: 40, y: 0 },
      "GND": { x: 40, y: height },
      "IN": { x: 0, y: height / 3 },
      "OUT": { x: 80, y: height / 3 },
      "A": { x: 0, y: height / 2 },
      "B": { x: 0, y: (2 * height) / 3 },
    },
    shapes: [
      { type: "rect", x: 0, y: 0, width: 80, height, stroke: "#60a5fa", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "text", x: 40, y: height / 2, text: value, fontSize: 10, align: "center", fill: "#93c5fd" },
    ],
  };
}

// ─── Voltage Regulator ───────────────────────────────────────────────────────
function voltageRegulatorSymbol(value: string): SymbolConfig {
  return {
    width: 80,
    height: 60,
    pins: {
      "IN": { x: 0, y: 30 },
      "OUT": { x: 80, y: 30 },
      "GND": { x: 40, y: 60 },
      "ADJ": { x: 40, y: 60 },
    },
    shapes: [
      { type: "rect", x: 10, y: 5, width: 60, height: 50, stroke: "#34d399", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "line", points: [0, 30, 10, 30], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "line", points: [70, 30, 80, 30], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "line", points: [40, 55, 40, 60], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "text", x: 40, y: 30, text: value, fontSize: 9, align: "center", fill: "#6ee7b7" },
    ],
  };
}

// ─── Diode ───────────────────────────────────────────────────────────────────
function diodeSymbol(_value: string): SymbolConfig {
  return {
    width: 50,
    height: 20,
    pins: { "A": { x: 0, y: 10 }, "K": { x: 50, y: 10 } },
    shapes: [
      { type: "line", points: [0, 10, 16, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "polyline", points: [16, 2, 16, 18, 34, 10, 16, 2], stroke: "#f472b6", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "line", points: [34, 2, 34, 18], stroke: "#f472b6", strokeWidth: 2 },
      { type: "line", points: [34, 10, 50, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
    ],
  };
}

// ─── LED ─────────────────────────────────────────────────────────────────────
function ledSymbol(value: string): SymbolConfig {
  const base = diodeSymbol(value);
  return {
    ...base,
    shapes: [
      ...base.shapes,
      { type: "line", points: [28, 0, 36, -8], stroke: "#fbbf24", strokeWidth: 1, dash: [2, 1] },
      { type: "line", points: [23, 0, 31, -8], stroke: "#fbbf24", strokeWidth: 1, dash: [2, 1] },
    ],
  };
}

// ─── Transistor (NPN BJT) ────────────────────────────────────────────────────
function transistorSymbol(_value: string): SymbolConfig {
  return {
    width: 60,
    height: 60,
    pins: { "B": { x: 0, y: 30 }, "C": { x: 60, y: 10 }, "E": { x: 60, y: 50 } },
    shapes: [
      { type: "circle", cx: 30, cy: 30, radius: 20, stroke: "#a78bfa", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "line", points: [0, 30, 18, 30], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "line", points: [18, 14, 18, 46], stroke: "#a78bfa", strokeWidth: 2 },
      { type: "line", points: [18, 18, 40, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "line", points: [18, 42, 40, 50], stroke: "#94a3b8", strokeWidth: 1.5 },
    ],
  };
}

// ─── Connector ───────────────────────────────────────────────────────────────
function connectorSymbol(_value: string): SymbolConfig {
  return {
    width: 40,
    height: 50,
    pins: { "1": { x: 0, y: 15 }, "2": { x: 0, y: 35 } },
    shapes: [
      { type: "rect", x: 10, y: 5, width: 30, height: 40, stroke: "#fb923c", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "circle", cx: 10, cy: 15, radius: 4, stroke: "#fb923c", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "circle", cx: 10, cy: 35, radius: 4, stroke: "#fb923c", strokeWidth: 1.5, fill: "#1e293b" },
      { type: "line", points: [0, 15, 6, 15], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "line", points: [0, 35, 6, 35], stroke: "#94a3b8", strokeWidth: 1.5 },
    ],
  };
}

// ─── Inductor ────────────────────────────────────────────────────────────────
function inductorSymbol(_value: string): SymbolConfig {
  return {
    width: 70,
    height: 20,
    pins: { "1": { x: 0, y: 10 }, "2": { x: 70, y: 10 } },
    shapes: [
      { type: "line", points: [0, 10, 10, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
      { type: "arc", cx: 20, cy: 10, radius: 10, startAngle: 180, endAngle: 0, stroke: "#94a3b8", strokeWidth: 1.5, fill: "transparent" },
      { type: "arc", cx: 35, cy: 10, radius: 10, startAngle: 180, endAngle: 0, stroke: "#94a3b8", strokeWidth: 1.5, fill: "transparent" },
      { type: "arc", cx: 50, cy: 10, radius: 10, startAngle: 180, endAngle: 0, stroke: "#94a3b8", strokeWidth: 1.5, fill: "transparent" },
      { type: "line", points: [60, 10, 70, 10], stroke: "#94a3b8", strokeWidth: 1.5 },
    ],
  };
}

// ─── Registry ────────────────────────────────────────────────────────────────
export type SymbolFactory = (value: string) => SymbolConfig;

export const SYMBOL_REGISTRY: Record<string, SymbolFactory> = {
  resistor: resistorSymbol,
  capacitor: capacitorSymbol,
  ic: icSymbol,
  voltage_regulator: voltageRegulatorSymbol,
  diode: diodeSymbol,
  led: ledSymbol,
  transistor: transistorSymbol,
  bjt: transistorSymbol,
  mosfet: transistorSymbol,
  connector: connectorSymbol,
  inductor: inductorSymbol,
  opamp: icSymbol,
  crystal: connectorSymbol,
  switch: connectorSymbol,
  fuse: resistorSymbol,
  transformer: inductorSymbol,
};

export function getSymbol(type: string, value: string): SymbolConfig {
  const factory = SYMBOL_REGISTRY[type] ?? SYMBOL_REGISTRY.ic;
  return factory(value);
}
