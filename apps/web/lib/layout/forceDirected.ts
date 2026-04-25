import type { Circuit } from "@circuitmind/circuit-ir";

const GRID = 20;
const IDEAL_SPRING_LENGTH = 120;
const REPULSION_K = 6000;
const ATTRACTION_K = 0.04;
const ITERATIONS = 80;
const COOLING_RATE = 0.95;
const MIN_TEMP = 0.5;

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
  width: number;
  height: number;
}

interface Edge {
  a: string;
  b: string;
}

/**
 * Force-directed layout refinement.
 * Takes initial positions and refines them to minimize wire crossings
 * and overlaps.
 */
export function forceDirectedLayout(
  circuit: Circuit,
  initialPositions: Map<string, { x: number; y: number }>,
  pinnedIds: Set<string> = new Set()
): Map<string, { x: number; y: number }> {
  if (circuit.components.length === 0) return new Map();

  const nodes: Node[] = circuit.components.map((comp) => {
    const pos = initialPositions.get(comp.id) ?? { x: Math.random() * 400, y: Math.random() * 300 };
    return {
      id: comp.id,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      pinned: pinnedIds.has(comp.id),
      width: 80,
      height: 40,
    };
  });

  const edges = buildEdges(circuit);
  let temp = 100;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        applyRepulsion(nodes[i], nodes[j]);
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodes.find((n) => n.id === edge.a);
      const b = nodes.find((n) => n.id === edge.b);
      if (a && b) applyAttraction(a, b);
    }

    // Integrate + cool
    for (const node of nodes) {
      if (node.pinned) continue;
      const speed = Math.sqrt(node.vx ** 2 + node.vy ** 2);
      if (speed > temp) {
        node.vx = (node.vx / speed) * temp;
        node.vy = (node.vy / speed) * temp;
      }
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.85;
      node.vy *= 0.85;

      // Boundary
      node.x = Math.max(40, node.x);
      node.y = Math.max(40, node.y);
    }

    temp = Math.max(temp * COOLING_RATE, MIN_TEMP);
  }

  // Snap to grid
  const result = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    result.set(node.id, {
      x: Math.round(node.x / GRID) * GRID,
      y: Math.round(node.y / GRID) * GRID,
    });
  }
  return result;
}

function applyRepulsion(a: Node, b: Node): void {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = Math.max(dx * dx + dy * dy, 1);
  const dist = Math.sqrt(distSq);
  const force = REPULSION_K / distSq;
  const fx = (dx / dist) * force;
  const fy = (dy / dist) * force;
  if (!a.pinned) { a.vx += fx; a.vy += fy; }
  if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
}

function applyAttraction(a: Node, b: Node): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const force = ATTRACTION_K * (dist - IDEAL_SPRING_LENGTH);
  const fx = (dx / dist) * force;
  const fy = (dy / dist) * force;
  if (!a.pinned) { a.vx += fx; a.vy += fy; }
  if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
}

function buildEdges(circuit: Circuit): Edge[] {
  const edges: Edge[] = [];
  // Build net → component list
  const netToComps = new Map<string, string[]>();
  for (const comp of circuit.components) {
    for (const net of Object.values(comp.pins)) {
      const list = netToComps.get(net) ?? [];
      list.push(comp.id);
      netToComps.set(net, list);
    }
  }
  // Create edges for each shared net
  for (const comps of netToComps.values()) {
    for (let i = 0; i < comps.length - 1; i++) {
      edges.push({ a: comps[i], b: comps[i + 1] });
    }
  }
  return edges;
}
