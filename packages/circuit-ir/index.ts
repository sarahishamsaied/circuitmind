// Circuit IR — Canonical Type Contract
// This file is the single source of truth for the circuit data model.
// All other packages and services derive their types from this schema.

export type ComponentType =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "diode"
  | "transistor"
  | "ic"
  | "voltage_regulator"
  | "crystal"
  | "connector"
  | "led"
  | "switch"
  | "fuse"
  | "transformer"
  | "opamp"
  | "mosfet"
  | "bjt";

export type NetType = "signal" | "power" | "ground";

export type AnalysisType = "dc" | "ac" | "transient";

export interface Position {
  x: number;
  y: number;
}

export interface SymbolShape {
  type: "line" | "rect" | "circle" | "arc" | "text" | "polyline";
  // line / polyline
  points?: number[];
  // rect
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // circle
  cx?: number;
  cy?: number;
  radius?: number;
  // arc
  startAngle?: number;
  endAngle?: number;
  // text
  text?: string;
  fontSize?: number;
  align?: "left" | "center" | "right";
  // style
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  dash?: number[];
}

export interface SymbolConfig {
  shapes: SymbolShape[];
  pins: Record<string, Position>;
  width: number;
  height: number;
}

export interface Component {
  id: string;           // "R1", "U1", "C3"
  type: ComponentType;
  value: string;        // "10k", "100nF", "AMS1117-3.3"
  package: string;      // "0402", "SOIC-8", "SOT-23"
  part_number?: string; // Real manufacturer part number
  position: Position;
  rotation: number;     // degrees: 0 | 90 | 180 | 270
  pins: Record<string, string>;       // pin name → net name
  properties: Record<string, string>; // arbitrary key-value metadata
}

export interface Net {
  name: string;
  type: NetType;
  voltage?: number; // expected voltage level in volts
}

export interface WireEndpoint {
  component_id: string;
  pin: string;
}

export interface Wire {
  from: WireEndpoint;
  to: WireEndpoint;
  net: string;
  // Routed path points (filled in by auto-layout)
  path?: Position[];
}

export interface CircuitMetadata {
  created_at: string; // ISO 8601
  updated_at?: string;
  description: string;
  tags: string[];
  author?: string;
  version?: string;
}

export interface Circuit {
  id: string;
  name: string;
  components: Component[];
  nets: Net[];
  wires: Wire[];
  metadata: CircuitMetadata;
}

// WebSocket message types
export type WSClientMessage =
  | { type: "generate"; prompt: string }
  | { type: "reset" }
  | { type: "undo" }
  | { type: "save" };

export type WSServerMessage =
  | { type: "agent_thinking"; text: string }
  | { type: "agent_message"; text: string }
  | { type: "tool_call"; tool_name: string; args: Record<string, unknown> }
  | { type: "ir_patch"; patch: JsonPatch[] }
  | { type: "ir_complete"; circuit: Circuit }
  | { type: "simulation_result"; results: SimulationResults }
  | { type: "error"; message: string };

// RFC 6902 JSON Patch
export interface JsonPatch {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

export interface SimulationResults {
  analysis_type: AnalysisType;
  status: "ok" | "error" | "warning";
  nets: Record<string, number>;   // net name → voltage
  messages: string[];
  raw_output?: string;
}

export interface ComponentSearchResult {
  mpn: string;
  manufacturer: string;
  description: string;
  type: ComponentType;
  value: string;
  package: string;
  datasheet_url?: string;
  kicad_symbol?: string;
  kicad_footprint?: string;
  specs: Record<string, string>;
}

// Utility: empty circuit factory
export function emptyCircuit(name = "Untitled Circuit"): Circuit {
  return {
    id: crypto.randomUUID(),
    name,
    components: [],
    nets: [],
    wires: [],
    metadata: {
      created_at: new Date().toISOString(),
      description: "",
      tags: [],
    },
  };
}
