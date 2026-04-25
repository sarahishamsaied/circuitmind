import type { Circuit, Component } from "@circuitmind/circuit-ir";

const LAYER_WIDTH = 180;
const LAYER_PADDING_Y = 100;
const COMPONENT_HEIGHT = 60;

/**
 * Assign components to horizontal layers using topological sort.
 * Power sources and ground symbols go to layer 0 (leftmost).
 * Components driven by those go to layer 1, and so on.
 */
export function hierarchicalLayout(
  circuit: Circuit
): Map<string, { x: number; y: number }> {
  const components = circuit.components;
  if (components.length === 0) return new Map();

  const layers = assignLayers(components, circuit);
  return placeByLayers(components, layers);
}

function assignLayers(
  components: Component[],
  circuit: Circuit
): Map<string, number> {
  const layers = new Map<string, number>();
  const inDegree = new Map<string, number>();
  // adjacency: component A → components connected via shared nets
  const adjacency = new Map<string, Set<string>>();

  // Build adjacency based on shared nets
  const netToComps = new Map<string, string[]>();
  for (const comp of components) {
    inDegree.set(comp.id, 0);
    adjacency.set(comp.id, new Set());
    for (const net of Object.values(comp.pins)) {
      const list = netToComps.get(net) ?? [];
      list.push(comp.id);
      netToComps.set(net, list);
    }
  }

  // Build edges: earlier-in-list → later-in-list (simple heuristic)
  for (const [net, comps] of netToComps) {
    const netMeta = circuit.nets.find((n) => n.name === net);
    const isPower = netMeta?.type === "power" || netMeta?.type === "ground";
    if (isPower) {
      // Power/ground nets: first comp in list is the source
      for (let i = 1; i < comps.length; i++) {
        adjacency.get(comps[0])?.add(comps[i]);
        inDegree.set(comps[i], (inDegree.get(comps[i]) ?? 0) + 1);
      }
    } else {
      // Signal nets: chain
      for (let i = 0; i < comps.length - 1; i++) {
        adjacency.get(comps[i])?.add(comps[i + 1]);
        inDegree.set(comps[i + 1], (inDegree.get(comps[i + 1]) ?? 0) + 1);
      }
    }
  }

  // Kahn's algorithm for topological sort with layer assignment
  let queue = components
    .filter((c) => (inDegree.get(c.id) ?? 0) === 0)
    .map((c) => c.id);
  let layer = 0;

  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      if (!layers.has(id)) layers.set(id, layer);
      for (const neighbor of adjacency.get(id) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, deg);
        if (deg <= 0) next.push(neighbor);
      }
    }
    queue = next;
    layer++;
  }

  // Assign remaining (cycles)
  for (const comp of components) {
    if (!layers.has(comp.id)) layers.set(comp.id, layer);
  }

  return layers;
}

function placeByLayers(
  components: Component[],
  layers: Map<string, number>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group by layer
  const byLayer = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    const list = byLayer.get(layer) ?? [];
    list.push(id);
    byLayer.set(layer, list);
  }

  for (const [layer, ids] of byLayer) {
    const x = 80 + layer * LAYER_WIDTH;
    ids.forEach((id, i) => {
      const y = 80 + i * (COMPONENT_HEIGHT + LAYER_PADDING_Y);
      positions.set(id, { x, y });
    });
  }

  return positions;
}
