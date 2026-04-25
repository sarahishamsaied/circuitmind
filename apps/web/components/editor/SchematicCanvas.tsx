"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import type { ComponentType } from "@circuitmind/circuit-ir";
import { useCircuitStore } from "@/store/circuitStore";
import { useSchematicLayout } from "@/hooks/useSchematicLayout";
import { KonvaComponent } from "@/components/circuit/KonvaComponent";
import { KonvaWire } from "@/components/circuit/KonvaWire";
import { PART_DRAG_MIME } from "@/lib/circuit/partDrag";

export function SchematicCanvas() {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useCircuitStore((s) => s.setSelectedComponentId);
  const updateComponentPosition = useCircuitStore((s) => s.updateComponentPosition);
  const addComponentFromLibrary = useCircuitStore((s) => s.addComponentFromLibrary);

  const { pinComponent } = useSchematicLayout();

  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const prevComponentCountRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // After prompt: first components often land while the stage is panned/zoomed from prior interaction.
  useEffect(() => {
    const n = circuit.components.length;
    if (prevComponentCountRef.current === 0 && n > 0) {
      setPosition({ x: 0, y: 0 });
      setScale(1);
    }
    prevComponentCountRef.current = n;
  }, [circuit.components.length]);

  // Konva sometimes skips a frame when Zustand updates plain objects pushed into the tree.
  useEffect(() => {
    layerRef.current?.batchDraw();
  }, [circuit.components, circuit.wires]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = scale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(8, newScale));

    // Zoom toward cursor
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
    setScale(clampedScale);
  }, [scale, position]);

  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setPosition({ x: e.target.x(), y: e.target.y() });
  }, []);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const t = e.target;
    const stage = t.getStage();
    if (!stage) return;
    const isBackdrop = t === stage || t.getClassName() === "Layer";
    if (isBackdrop) setSelectedComponentId(null);
  }, [setSelectedComponentId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(PART_DRAG_MIME);
      if (!raw || !containerRef.current) return;
      let parsed: {
        type: ComponentType;
        value: string;
        package: string;
        mpn?: string;
        part_number?: string;
      };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        return;
      }
      if (!parsed.type || !parsed.value) return;
      const rect = containerRef.current.getBoundingClientRect();
      const lx = (e.clientX - rect.left - position.x) / scale;
      const ly = (e.clientY - rect.top - position.y) / scale;
      addComponentFromLibrary({
        type: parsed.type,
        value: parsed.value,
        package: parsed.package ?? "",
        part_number: parsed.part_number ?? parsed.mpn,
        mpn: parsed.mpn,
        x: lx,
        y: ly,
      });
    },
    [addComponentFromLibrary, position.x, position.y, scale]
  );

  return (
    <div
      ref={containerRef}
      className="schematic-canvas-container h-full w-full relative"
      style={{ cursor: "crosshair" }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, #1e293b 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: `${position.x % 20}px ${position.y % 20}px`,
          opacity: 0.6,
        }}
      />

      {circuit.components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-sm">
            Describe a circuit in the prompt panel to get started
          </p>
        </div>
      )}

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        dragDistance={6}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
      >
        <Layer ref={layerRef}>
          {/* Wires rendered below components */}
          {circuit.wires.map((wire, i) => (
            <KonvaWire
              key={`wire-${wire.from.component_id}-${wire.from.pin}-${i}`}
              wire={wire}
              circuit={circuit}
            />
          ))}

          {/* Components */}
          {circuit.components.map((comp) => (
            <KonvaComponent
              key={comp.id}
              component={comp}
              isSelected={comp.id === selectedComponentId}
              onSelect={() => setSelectedComponentId(comp.id)}
              onDragEnd={(x, y) => {
                updateComponentPosition(comp.id, x, y);
                pinComponent(comp.id);
              }}
            />
          ))}
        </Layer>
      </Stage>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        {Math.round(scale * 100)}%
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
        Scroll to zoom · Drag background to pan · Drag parts from the palette to place
      </div>
    </div>
  );
}
