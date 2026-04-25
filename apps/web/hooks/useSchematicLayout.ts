"use client";

import { useEffect, useRef } from "react";
import { hierarchicalLayout } from "@/lib/layout/hierarchical";
import { forceDirectedLayout } from "@/lib/layout/forceDirected";
import { useCircuitStore } from "@/store/circuitStore";

/**
 * Runs auto-layout whenever the component count changes.
 * Pinned components (user-dragged) are preserved.
 */
export function useSchematicLayout() {
  const circuit = useCircuitStore((s) => s.circuit);
  const pinnedRef = useRef<Set<string>>(new Set());
  const prevCountRef = useRef(0);

  useEffect(() => {
    const count = circuit.components.length;
    if (count === 0 || count === prevCountRef.current) return;
    prevCountRef.current = count;

    const pending = useCircuitStore.getState().flushPendingLayoutPins();
    for (const id of pending) {
      pinnedRef.current.add(id);
    }

    const latest = useCircuitStore.getState().circuit;

    // Phase 1: hierarchical placement
    const initial = hierarchicalLayout(latest);

    // Palette drops: keep user coordinates for those ids (hierarchical ignores them otherwise).
    for (const id of pending) {
      const c = latest.components.find((x) => x.id === id);
      if (c) initial.set(id, { x: c.position.x, y: c.position.y });
    }

    // Phase 2: force-directed refinement (preserves pinned)
    const final = forceDirectedLayout(latest, initial, pinnedRef.current);

    for (const [id, pos] of final) {
      useCircuitStore.getState().updateComponentPosition(id, pos.x, pos.y);
    }
  }, [circuit.components.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Call this when a user manually drags a component
  const pinComponent = (id: string) => {
    pinnedRef.current.add(id);
  };

  return { pinComponent };
}
