"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Circuit,
  Component,
  ComponentType,
  JsonPatch,
  SimulationResults,
  WSServerMessage,
} from "@circuitmind/circuit-ir";
import { emptyCircuit } from "@circuitmind/circuit-ir";
import { normalizeCircuit } from "@/lib/circuit/normalizeCircuit";
import { nextComponentId } from "@/lib/circuit/nextComponentId";

export type AgentStatus = "idle" | "thinking" | "done" | "error";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text?: string;
  tool_name?: string;
  args?: Record<string, unknown>;
  timestamp: Date;
}

export interface AddLibraryPartParams {
  type: ComponentType;
  value: string;
  package: string;
  part_number?: string;
  mpn?: string;
  x: number;
  y: number;
}

interface CircuitStore {
  // Circuit state
  circuit: Circuit;
  selectedComponentId: string | null;
  /** Ids to pin at drop coordinates before the next auto-layout pass (HTML5 palette drop). */
  pendingLayoutPinIds: string[];

  // Agent state
  agentStatus: AgentStatus;
  agentStatusText: string;
  agentMessages: AgentMessage[];

  // Simulation
  simulationResults: SimulationResults | null;

  // Actions
  setCircuit: (circuit: Circuit) => void;
  setSelectedComponentId: (id: string | null) => void;
  setAgentStatus: (status: AgentStatus, text?: string) => void;
  addAgentMessage: (msg: Omit<AgentMessage, "id" | "timestamp">) => void;
  applyIRPatch: (patch: JsonPatch[]) => void;
  updateComponentPosition: (id: string, x: number, y: number) => void;
  addComponentFromLibrary: (params: AddLibraryPartParams) => string;
  flushPendingLayoutPins: () => string[];
  setSimulationResults: (results: SimulationResults) => void;
  resetCircuit: () => void;
  handleServerMessage: (msg: WSServerMessage) => void;
}

export const useCircuitStore = create<CircuitStore>()(
  immer((set) => ({
    circuit: emptyCircuit(),
    selectedComponentId: null,
    pendingLayoutPinIds: [],
    agentStatus: "idle",
    agentStatusText: "",
    agentMessages: [],
    simulationResults: null,

    setCircuit: (circuit) =>
      set((state) => {
        state.circuit = normalizeCircuit(circuit);
      }),

    setSelectedComponentId: (id) =>
      set((state) => {
        state.selectedComponentId = id;
      }),

    setAgentStatus: (status, text = "") =>
      set((state) => {
        state.agentStatus = status;
        state.agentStatusText = text;
      }),

    addAgentMessage: (msg) =>
      set((state) => {
        state.agentMessages.push({
          ...msg,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        });
      }),

    applyIRPatch: (patch) =>
      set((state) => {
        for (const op of patch) {
          applyPatchOp(state.circuit, op);
        }
        state.circuit = normalizeCircuit(state.circuit);
      }),

    updateComponentPosition: (id, x, y) =>
      set((state) => {
        const comp = state.circuit.components.find((c) => c.id === id);
        if (comp) {
          comp.position = { x, y };
        }
      }),

    addComponentFromLibrary: (params) => {
      let newId = "";
      set((state) => {
        newId = nextComponentId(state.circuit.components, params.type);
        const properties: Record<string, string> = params.mpn ? { mpn: params.mpn } : {};
        const comp: Component = {
          id: newId,
          type: params.type,
          value: params.value,
          package: params.package,
          part_number: params.part_number,
          position: { x: params.x, y: params.y },
          rotation: 0,
          pins: {},
          properties,
        };
        state.circuit.components.push(comp);
        state.pendingLayoutPinIds.push(newId);
        state.selectedComponentId = newId;
      });
      return newId;
    },

    flushPendingLayoutPins: () => {
      let ids: string[] = [];
      set((state) => {
        ids = state.pendingLayoutPinIds.slice();
        state.pendingLayoutPinIds = [];
      });
      return ids;
    },

    setSimulationResults: (results) =>
      set((state) => {
        state.simulationResults = results;
      }),

    resetCircuit: () =>
      set((state) => {
        state.circuit = emptyCircuit();
        state.agentMessages = [];
        state.simulationResults = null;
        state.selectedComponentId = null;
        state.pendingLayoutPinIds = [];
        state.agentStatus = "idle";
      }),

    handleServerMessage: (msg) =>
      set((state) => {
        switch (msg.type) {
          case "agent_thinking":
            state.agentStatus = "thinking";
            state.agentStatusText = msg.text;
            break;

          case "agent_message":
            state.agentStatus = "done";
            state.agentStatusText = "";
            state.agentMessages.push({
              id: crypto.randomUUID(),
              role: "assistant",
              text: msg.text,
              timestamp: new Date(),
            });
            break;

          case "tool_call":
            state.agentMessages.push({
              id: crypto.randomUUID(),
              role: "tool",
              tool_name: msg.tool_name,
              args: msg.args,
              timestamp: new Date(),
            });
            break;

          case "ir_patch":
            for (const op of msg.patch) {
              applyPatchOp(state.circuit, op);
            }
            state.circuit = normalizeCircuit(state.circuit);
            break;

          case "ir_complete":
            state.circuit = normalizeCircuit(msg.circuit);
            state.agentStatus = "idle";
            break;

          case "simulation_result":
            state.simulationResults = msg.results;
            break;

          case "error":
            state.agentStatus = "error";
            state.agentStatusText = msg.message;
            break;
        }
      }),
  }))
);

/**
 * Apply a single RFC 6902 JSON Patch operation to the circuit object.
 * Handles the subset of ops our backend emits: add, replace, remove.
 */
function applyPatchOp(circuit: Circuit, op: JsonPatch): void {
  const segments = op.path.split("/").filter(Boolean);
  if (segments.length === 0) return;

  const [root, indexStr, ...rest] = segments;

  const circuitRec = circuit as unknown as Record<string, unknown>;

  if (op.op === "add" && indexStr === "-") {
    // Append to array
    const arr = circuitRec[root];
    if (Array.isArray(arr)) {
      arr.push(op.value);
    }
    return;
  }

  const arr = circuitRec[root];
  if (!Array.isArray(arr)) return;

  const idx = parseInt(indexStr ?? "", 10);
  if (isNaN(idx)) return;

  if (op.op === "replace" && rest.length === 0) {
    arr[idx] = op.value;
  } else if (op.op === "remove" && rest.length === 0) {
    arr.splice(idx, 1);
  } else if (op.op === "add" && rest.length > 0) {
    // Nested add: e.g. /components/0/pins/SDA
    const obj = arr[idx] as Record<string, unknown>;
    if (obj) {
      // Navigate to nested path
      let target = obj;
      for (let i = 0; i < rest.length - 1; i++) {
        target = (target[rest[i]] ??= {}) as Record<string, unknown>;
      }
      target[rest[rest.length - 1]] = op.value;
    }
  }
}
