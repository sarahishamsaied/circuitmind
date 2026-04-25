"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import { useCircuitStore } from "@/store/circuitStore";
import type { Component } from "@circuitmind/circuit-ir";

// Scale factor: IR position units → 3D world units
const SCALE = 0.05;

export function PCBPreview() {
  const circuit = useCircuitStore((s) => s.circuit);

  return (
    <div className="w-full h-full bg-[#0a1628] relative">
      <div className="absolute top-2 left-3 text-xs text-muted-foreground z-10">
        3D Preview
      </div>
      <Canvas
        camera={{ position: [0, 80, 120], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 80, 50]}
            intensity={0.8}
            castShadow
          />
          <pointLight position={[-30, 40, -30]} intensity={0.3} color="#3b82f6" />

          {/* PCB substrate */}
          <PCBBoard />

          {/* Component meshes */}
          {circuit.components.map((comp) => (
            <ComponentMesh key={comp.id} component={comp} />
          ))}

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={20}
            maxDistance={300}
          />
          <Grid
            args={[200, 200]}
            position={[0, -0.6, 0]}
            cellColor="#1e293b"
            sectionColor="#334155"
            cellSize={10}
            sectionSize={50}
          />
        </Suspense>
      </Canvas>

      {circuit.components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-xs">3D preview will appear here</p>
        </div>
      )}
    </div>
  );
}

function PCBBoard() {
  return (
    <mesh receiveShadow position={[0, -0.5, 0]}>
      <boxGeometry args={[200, 1, 150]} />
      <meshStandardMaterial color="#1a4a2e" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

function ComponentMesh({ component }: { component: Component }) {
  const x = (component.position.x - 400) * SCALE;
  const z = (component.position.y - 300) * SCALE;

  const { width, height, color } = getComponentDimensions(component.type);

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <Text
        position={[0, height / 2 + 0.5, 0]}
        fontSize={1.5}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
      >
        {component.id}
      </Text>
    </group>
  );
}

function getComponentDimensions(type: string): {
  width: number;
  height: number;
  color: string;
} {
  switch (type) {
    case "ic":
    case "voltage_regulator":
    case "opamp":
      return { width: 6, height: 2.5, color: "#1e293b" };
    case "capacitor":
      return { width: 2, height: 3, color: "#b45309" };
    case "resistor":
    case "inductor":
    case "fuse":
      return { width: 3, height: 1.5, color: "#d97706" };
    case "diode":
    case "led":
      return { width: 2, height: 2, color: "#7c3aed" };
    case "transistor":
    case "bjt":
    case "mosfet":
      return { width: 3, height: 2.5, color: "#0f766e" };
    case "connector":
      return { width: 4, height: 4, color: "#334155" };
    default:
      return { width: 3, height: 2, color: "#374151" };
  }
}
